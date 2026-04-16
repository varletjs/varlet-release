import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { publish, release } from '../src/release'
import { readJSONSync } from '../src/utils'
import { loggerMock, promptsMock, resetReleaseTestDoubles, setMockExecOverride } from './helpers/releaseMocks'
import { createFullExecMock } from './helpers/releaseTestKit'
import { cleanupSandbox, createSandbox, ensureDirSync, mockProcessExit } from './helpers/sandbox'

describe('release process (lightweight)', () => {
  let testSandbox: string
  let testRepo: string

  beforeEach(() => {
    resetReleaseTestDoubles()
    testSandbox = createSandbox('varlet-release-light')
    testRepo = join(testSandbox, 'repo')
    ensureDirSync(testRepo)
    writeFileSync(
      join(testRepo, 'package.json'),
      JSON.stringify({ name: 'varlet-e2e-dummy', version: '1.0.0', private: false }, null, 2),
    )
    vi.spyOn(process, 'cwd').mockReturnValue(testRepo)
    setMockExecOverride(createFullExecMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanupSandbox(testSandbox)
  })

  it('stops when package version is missing', async () => {
    writeFileSync(join(testRepo, 'package.json'), JSON.stringify({ name: 'root' }, null, 2))

    await release({})

    expect(loggerMock.error).toHaveBeenCalledWith('Your package is missing the version field')
  })

  it.each([
    {
      name: 'stops when refs confirmation is rejected',
      confirmValues: [false],
      options: { skipNpmPublish: true },
    },
    {
      name: 'stops when registry confirmation is rejected',
      confirmValues: [true, false],
      options: { remote: 'origin' },
    },
  ])('$name', async ({ confirmValues, options }) => {
    for (const value of confirmValues) {
      promptsMock.confirm.mockResolvedValueOnce(value)
    }

    const taskSpy = vi.fn()
    await release({ ...options, task: taskSpy })

    expect(taskSpy).not.toHaveBeenCalled()
    expect(promptsMock.select).not.toHaveBeenCalled()
    expect(readJSONSync(join(testRepo, 'package.json')).version).toBe('1.0.0')
    expect(existsSync(join(testRepo, 'CHANGELOG.md'))).toBe(false)
  })

  it('stops when remote version matches', async () => {
    promptsMock.confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')
    setMockExecOverride(
      createFullExecMock((cmd, args) => {
        if (cmd === 'npm' && args[0] === 'view') {
          return Promise.resolve({ stdout: '1.0.1', stderr: '' } as any)
        }
        return undefined
      }),
    )

    const taskSpy = vi.fn()
    await release({ checkRemoteVersion: true, skipNpmPublish: true, task: taskSpy })

    expect(loggerMock.error).toHaveBeenCalledWith('Please check remote version.')
    expect(taskSpy).not.toHaveBeenCalled()
    expect(readJSONSync(join(testRepo, 'package.json')).version).toBe('1.0.0')
    expect(existsSync(join(testRepo, 'CHANGELOG.md'))).toBe(false)
  })

  it('continues release when remote version is not found', async () => {
    promptsMock.confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')

    const taskSpy = vi.fn()
    await release({ checkRemoteVersion: true, skipNpmPublish: true, skipChangelog: true, task: taskSpy })

    expect(loggerMock.error).not.toHaveBeenCalledWith('Please check remote version.')
    expect(taskSpy).toHaveBeenCalled()
  })

  it.each([
    {
      name: 'exits safely when publish fails with npm permission error',
      override: createFullExecMock((cmd, args) => {
        if (cmd === 'pnpm' && args.includes('publish')) {
          return Promise.reject({ output: { stderr: 'E403 no npm permission' } })
        }
        return undefined
      }),
      options: { remote: 'origin' },
      expectedError: 'E403 no npm permission',
    },
    {
      name: 'exits safely when pushGit fails',
      override: createFullExecMock((cmd, args) => {
        if (cmd === 'git' && args[0] === 'push') {
          return Promise.reject(new Error('remote: permission denied'))
        }
        return undefined
      }),
      options: { skipNpmPublish: true, skipChangelog: true, remote: 'origin' },
      expectedError: expect.objectContaining({ message: 'remote: permission denied' }),
    },
  ])('$name', async ({ override, options, expectedError }) => {
    promptsMock.confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')
    setMockExecOverride(override)
    mockProcessExit()

    await expect(release(options as any)).rejects.toThrow('process.exit:1')
    expect(loggerMock.error).toHaveBeenCalledWith(expectedError)
    expect(readJSONSync(join(testRepo, 'package.json')).version).toBe('1.0.1')
  })

  it('exits safely when task throws', async () => {
    promptsMock.confirm.mockResolvedValueOnce(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')
    mockProcessExit()

    const taskError = new Error('task failed')
    await expect(
      release({
        skipNpmPublish: true,
        remote: 'origin',
        task: vi.fn(() => {
          throw taskError
        }),
      }),
    ).rejects.toThrow('process.exit:1')

    expect(loggerMock.error).toHaveBeenCalledWith(taskError)
    expect(existsSync(join(testRepo, 'CHANGELOG.md'))).toBe(false)
  })

  it('runs release flow without generating changelog when skipChangelog is enabled', async () => {
    promptsMock.confirm.mockResolvedValue(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')

    await release({ skipNpmPublish: true, skipChangelog: true, remote: 'origin' })

    expect(loggerMock.error.mock.calls).toEqual([])
    expect(readJSONSync(join(testRepo, 'package.json')).version).toBe('1.0.1')
    expect(existsSync(join(testRepo, 'CHANGELOG.md'))).toBe(false)
  })
})

describe('publish function (lightweight)', () => {
  let testSandbox: string
  let testRepo: string

  beforeEach(() => {
    resetReleaseTestDoubles()
    testSandbox = createSandbox('varlet-publish-light')
    testRepo = join(testSandbox, 'repo')
    ensureDirSync(testRepo)
    writeFileSync(
      join(testRepo, 'package.json'),
      JSON.stringify({ name: 'varlet-e2e-dummy', version: '1.0.0', private: false }, null, 2),
    )
    vi.spyOn(process, 'cwd').mockReturnValue(testRepo)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanupSandbox(testSandbox)
  })

  it.each([
    {
      name: 'publishes with alpha tag when preRelease is true',
      options: { preRelease: true },
      expectedArgs: ['-r', 'publish', '--no-git-checks', '--access', 'public', '--tag', 'alpha'],
    },
    {
      name: 'forwards npmTag to pnpm publish',
      options: { npmTag: 'beta' },
      expectedArgs: ['-r', 'publish', '--no-git-checks', '--access', 'public', '--tag', 'beta'],
    },
    {
      name: 'preRelease flag takes priority over npmTag',
      options: { preRelease: true, npmTag: 'beta' },
      expectedArgs: ['-r', 'publish', '--no-git-checks', '--access', 'public', '--tag', 'alpha'],
    },
  ])('$name', async ({ options, expectedArgs }) => {
    const publishCalls: string[][] = []
    setMockExecOverride(
      createFullExecMock((cmd, args) => {
        if (cmd === 'pnpm' && args.includes('publish')) {
          publishCalls.push(args)
          return Promise.resolve({ stdout: 'published ok', stderr: '' } as any)
        }
        return undefined
      }),
    )

    await publish(options)

    expect(loggerMock.error.mock.calls).toEqual([])
    expect(publishCalls).toEqual([expectedArgs])
  })

  it('logs publish stdout when command succeeds', async () => {
    setMockExecOverride(
      createFullExecMock((cmd, args) => {
        if (cmd === 'pnpm' && args.includes('publish')) {
          return Promise.resolve({ stdout: 'published ok', stderr: '' } as any)
        }
        return undefined
      }),
    )

    await publish({ npmTag: 'beta' })

    expect(loggerMock.log).toHaveBeenCalledWith('published ok')
  })

  it('skips publish when checkRemoteVersion detects same version', async () => {
    const publishCalls: string[][] = []
    setMockExecOverride(
      createFullExecMock((cmd, args) => {
        if (cmd === 'npm' && args[0] === 'view') {
          return Promise.resolve({ stdout: '1.0.0', stderr: '' } as any)
        }
        if (cmd === 'pnpm' && args.includes('publish')) {
          publishCalls.push(args)
          return Promise.resolve({ stdout: 'should not publish', stderr: '' } as any)
        }
        return undefined
      }),
    )

    await publish({ checkRemoteVersion: true })

    expect(loggerMock.error).toHaveBeenCalledWith('publishing automatically skipped.')
    expect(publishCalls).toEqual([])
  })
})
