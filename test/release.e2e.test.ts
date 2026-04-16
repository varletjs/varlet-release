import { cpSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { x as exec } from 'tinyexec'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { release } from '../src/release'
import { readJSONSync } from '../src/utils'
import { loggerMock, promptsMock, resetReleaseTestDoubles } from './helpers/releaseMocks'
import { setupGitRepo } from './helpers/releaseTestKit'
import { cleanupSandbox, createSandbox, ensureDirSync } from './helpers/sandbox'

describe('release E2E (real git)', () => {
  let templateSandbox: string
  let testSandbox: string
  let testRepo: string

  async function cloneSandboxFromTemplate(targetSandbox: string) {
    const targetRepo = join(targetSandbox, 'repo')
    const targetRemote = join(targetSandbox, 'remote.git')
    cpSync(join(templateSandbox, 'repo'), targetRepo, { recursive: true })
    cpSync(join(templateSandbox, 'remote.git'), targetRemote, { recursive: true })
    await exec('git', ['remote', 'set-url', 'origin', targetRemote])
    return targetRepo
  }

  async function getGitTags() {
    return (await exec('git', ['tag'])).stdout.trim()
  }

  async function getCommitCount() {
    return (await exec('git', ['rev-list', '--count', 'HEAD'])).stdout.trim()
  }

  beforeAll(async () => {
    templateSandbox = createSandbox('varlet-release-template')
    await setupGitRepo(join(templateSandbox, 'repo'), join(templateSandbox, 'remote.git'), exec)
  })

  beforeEach(async () => {
    resetReleaseTestDoubles()
    testSandbox = createSandbox('varlet-release-e2e')
    testRepo = join(testSandbox, 'repo')
    vi.spyOn(process, 'cwd').mockReturnValue(testRepo)
    await cloneSandboxFromTemplate(testSandbox)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanupSandbox(testSandbox)
  })

  afterAll(() => {
    cleanupSandbox(templateSandbox)
  })

  it('stops when git worktree is not empty', async () => {
    writeFileSync(join(testRepo, 'dirty.js'), 'dirty')

    await release({})

    expect(loggerMock.error).toHaveBeenCalledWith('Git worktree is not empty, please commit changed')
  })

  it('runs complete positive release flow properly', async () => {
    writeFileSync(join(testRepo, 'test1.txt'), 'hello')
    await exec('git', ['add', '.'])
    await exec('git', ['commit', '-m', 'feat: initial feature'])

    promptsMock.confirm.mockResolvedValue(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')

    const taskSpy = vi.fn()
    await release({ skipNpmPublish: true, remote: 'origin', task: taskSpy })

    expect(loggerMock.error.mock.calls).toEqual([])
    expect(taskSpy).toHaveBeenCalledWith('1.0.1', '1.0.0')
    expect(readJSONSync(join(testRepo, 'package.json')).version).toBe('1.0.1')
    expect(existsSync(join(testRepo, 'CHANGELOG.md'))).toBe(true)
    expect((await exec('git', ['tag'])).stdout).toContain('v1.0.1')
    expect((await exec('git', ['status'])).stdout).toContain('working tree clean')
    expect((await exec('git', ['ls-remote', '--tags', 'origin'])).stdout).toContain('refs/tags/v1.0.1')
  })

  it('runs prerelease flow and restores root and workspace package.json files', async () => {
    const workspacePkgPath = join(testRepo, 'packages', 'pkg-a', 'package.json')
    ensureDirSync(join(testRepo, 'packages', 'pkg-a'))
    writeFileSync(workspacePkgPath, JSON.stringify({ name: 'pkg-a', version: '1.0.0' }, null, 2))
    await exec('git', ['add', '.'])
    await exec('git', ['commit', '-m', 'feat: workspace package'])
    await exec('git', ['push'])

    promptsMock.confirm.mockResolvedValue(true)
    promptsMock.select.mockResolvedValueOnce('prepatch').mockResolvedValue('confirm')

    await release({ skipNpmPublish: true, remote: 'origin' })

    expect(loggerMock.error.mock.calls).toEqual([])
    expect(existsSync(join(testRepo, 'CHANGELOG.md'))).toBe(false)
    expect((await exec('git', ['tag'])).stdout.trim()).toContain('v1.0.0')
    expect(readJSONSync(join(testRepo, 'package.json')).version).toBe('1.0.0')
    expect(readJSONSync(workspacePkgPath).version).toBe('1.0.0')
    expect((await exec('git', ['status'])).stdout).toContain('working tree clean')
  })

  it('runs release flow without creating a git tag when skipGitTag is enabled', async () => {
    writeFileSync(join(testRepo, 'test-skip-git-tag.txt'), 'hello')
    await exec('git', ['add', '.'])
    await exec('git', ['commit', '-m', 'feat: skip git tag coverage'])

    promptsMock.confirm.mockResolvedValue(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')

    await release({ skipNpmPublish: true, skipGitTag: true, remote: 'origin' })

    expect(loggerMock.error.mock.calls).toEqual([])
    expect(readJSONSync(join(testRepo, 'package.json')).version).toBe('1.0.1')
    expect(existsSync(join(testRepo, 'CHANGELOG.md'))).toBe(true)
    expect(await getGitTags()).toBe('v1.0.0')
    expect((await exec('git', ['ls-remote', '--tags', 'origin'])).stdout.trim()).toContain('refs/tags/v1.0.0')
    expect(await getCommitCount()).toBe('3')
  })
})
