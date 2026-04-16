import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { getPackageJsons, release, updateVersion } from '../src/release'
import { readJSONSync } from '../src/utils'
import { loggerMock, promptsMock, resetReleaseTestDoubles, setMockExecOverride } from './helpers/releaseMocks'
import { createFullExecMock } from './helpers/releaseTestKit'
import { cleanupSandbox, createSandbox, ensureDirSync, mockProcessExit } from './helpers/sandbox'

describe('release helper functions', () => {
  let helperSandbox: string
  let helperRepo: string

  beforeEach(() => {
    resetReleaseTestDoubles()
    helperSandbox = createSandbox('varlet-release-helper')
    helperRepo = join(helperSandbox, 'repo')
    ensureDirSync(helperRepo)
    writeFileSync(
      join(helperRepo, 'package.json'),
      JSON.stringify({ name: 'varlet-helper-dummy', version: '1.0.0', private: false }, null, 2),
    )
    vi.spyOn(process, 'cwd').mockReturnValue(helperRepo)
    setMockExecOverride(createFullExecMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanupSandbox(helperSandbox)
  })

  it('getPackageJsons returns only root when no packages dir', () => {
    const result = getPackageJsons()

    expect(result.map((entry) => entry.filePath)).toEqual([join(helperRepo, 'package.json')])
    expect(result[0].config.name).toBe('varlet-helper-dummy')
  })

  it('getPackageJsons collects workspace packages', () => {
    const packagesDir = join(helperRepo, 'packages')
    const packageEntries = [
      ['pkg-a', join(packagesDir, 'pkg-a', 'package.json')],
      ['pkg-b', join(packagesDir, 'pkg-b', 'package.json')],
    ] as const

    for (const [name, filePath] of packageEntries) {
      ensureDirSync(join(packagesDir, name))
      writeFileSync(filePath, JSON.stringify({ name, version: '1.0.0' }))
    }

    const result = getPackageJsons()

    expect(result).toHaveLength(3)
    expect(result.map((entry) => entry.filePath)).toEqual(
      expect.arrayContaining([join(helperRepo, 'package.json'), ...packageEntries.map(([, filePath]) => filePath)]),
    )
  })

  it.each([
    {
      name: 'updateVersion updates root package.json version',
      setup: () => [],
    },
    {
      name: 'updateVersion updates all workspace package versions',
      setup: () => {
        const packagesDir = join(helperRepo, 'packages')
        const files = [join(packagesDir, 'pkg-a', 'package.json'), join(packagesDir, 'pkg-b', 'package.json')]

        ensureDirSync(join(packagesDir, 'pkg-a'))
        ensureDirSync(join(packagesDir, 'pkg-b'))
        writeFileSync(files[0], JSON.stringify({ name: 'pkg-a', version: '1.0.0' }))
        writeFileSync(files[1], JSON.stringify({ name: 'pkg-b', version: '1.0.0' }))

        return files
      },
    },
  ])('$name', ({ setup }) => {
    const extraFiles = setup()

    updateVersion('2.0.0')

    for (const filePath of [join(helperRepo, 'package.json'), ...extraFiles]) {
      expect(readJSONSync(filePath).version).toBe('2.0.0')
    }
  })

  it.each([
    {
      name: 'throws error when version increment fails with invalid release type',
      currentVersion: '1.0.0',
      selectedType: 'invalid-type',
      expectedMessage: /Failed to increment version 1\.0\.0 with type invalid-type/,
    },
    {
      name: 'throws error when version increment fails with malformed current version',
      currentVersion: 'not-a-semver',
      selectedType: 'patch',
      expectedMessage: /Failed to increment version not-a-semver with type patch/,
    },
  ])('$name', async ({ currentVersion, selectedType, expectedMessage }) => {
    writeFileSync(
      join(helperRepo, 'package.json'),
      JSON.stringify({ name: 'varlet-helper-dummy', version: currentVersion, private: false }, null, 2),
    )
    promptsMock.confirm.mockResolvedValue(true)
    promptsMock.select.mockResolvedValueOnce(selectedType as any).mockResolvedValue('confirm')
    mockProcessExit()

    await expect(release({ skipNpmPublish: true, skipChangelog: true })).rejects.toThrow('process.exit:1')
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(expectedMessage),
      }),
    )
  })
})
