import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// Need to import x *after* the mock has been configured!
import { x as exec } from 'tinyexec'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
// Static import — works because release.ts now calls process.cwd() lazily
// instead of capturing it at module load time.
import { getPackageJsons, publish, release, updateVersion } from '../src/release'
import { readJSONSync } from '../src/utils'

function ensureDirSync(path: string) {
  mkdirSync(path, { recursive: true })
}

// Global execution override for specific failure testing
let mockExecOverride: null | ((cmd: string, args: string[]) => Promise<any> | undefined) = null

// Symbol used to simulate user cancellation in @clack/prompts.
// When a prompt returns this symbol, isCancel() returns true.
const CANCEL_SYMBOL = Symbol.for('clack:cancel')

vi.mock('tinyexec', async (importOriginal) => {
  const actual = await importOriginal<typeof import('tinyexec')>()
  return {
    ...actual,
    x: (cmd: string, args: string[], opts?: any) => {
      if (mockExecOverride) {
        const res = mockExecOverride(cmd, args)
        if (res !== undefined) {
          return res
        }
      }
      const injectedOpts = {
        ...opts,
        nodeOptions: {
          cwd: process.cwd(),
          ...opts?.nodeOptions,
        },
      }
      return actual.x(cmd, args, injectedOpts)
    },
  }
})

const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  success: vi.fn(),
}))

const promptsMock = vi.hoisted(() => {
  const spinner = vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
  }))

  return {
    cancel: vi.fn(),
    confirm: vi.fn(),
    // Value-based: returns true only when the prompt result is our cancel symbol.
    // This avoids fragile call-count-based mocking.
    isCancel: vi.fn((val: unknown) => val === Symbol.for('clack:cancel')),
    select: vi.fn(),
    spinner,
  }
})

vi.mock('rslog', () => ({
  logger: loggerMock,
}))

vi.mock('@clack/prompts', () => promptsMock)

function resetTestDoubles() {
  mockExecOverride = null
  loggerMock.error.mockClear()
  loggerMock.warn.mockClear()
  loggerMock.log.mockClear()
  loggerMock.success.mockClear()
  promptsMock.confirm.mockReset()
  promptsMock.select.mockReset()
  // Only clear call history; the value-based implementation is stateless and doesn't need resetting.
  promptsMock.isCancel.mockClear().mockImplementation((val: unknown) => val === CANCEL_SYMBOL)
}

function createSandbox(prefix: string) {
  return join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
}

async function setupGitRepo(testRepo: string, testRemote: string) {
  ensureDirSync(testRepo)
  ensureDirSync(testRemote)

  await exec('git', ['init', '--bare'], { nodeOptions: { cwd: testRemote } })
  await exec('git', ['init'])

  await exec('git', ['config', 'user.name', 'Tester'])
  await exec('git', ['config', 'user.email', 'test@example.com'])
  await exec('git', ['config', 'commit.gpgsign', 'false'])
  await exec('git', ['config', 'core.autocrlf', 'false'])

  writeFileSync(
    join(testRepo, 'package.json'),
    JSON.stringify({ name: 'varlet-e2e-dummy', version: '1.0.0', private: false }, null, 2),
  )

  await exec('git', ['add', '.'])
  await exec('git', ['commit', '-m', 'chore: initial commit'])

  await exec('git', ['remote', 'add', 'origin', testRemote])

  let branchName = (await exec('git', ['branch', '--show-current'])).stdout.trim()
  if (!branchName) {
    branchName = 'master'
  }

  await exec('git', ['push', '-u', 'origin', branchName])
  await exec('git', ['tag', 'v1.0.0'])
  await exec('git', ['push', 'origin', 'v1.0.0'])
}

function cleanupSandbox(testSandbox?: string) {
  try {
    // On windows sometimes git execution keeps lock on objects
    testSandbox && rmSync(testSandbox, { recursive: true, force: true })
  } catch {
    /* empty */
  }
}

function mockProcessExit() {
  return vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`process.exit:${code}`)
  }) as never)
}

async function getGitTags(testRepo: string) {
  return (await exec('git', ['tag'])).stdout.trim()
}

async function getCommitCount(testRepo: string) {
  return (await exec('git', ['rev-list', '--count', 'HEAD'])).stdout.trim()
}

/**
 * Creates a mock that intercepts ALL exec calls with sensible defaults.
 * Used in lightweight tests to avoid real git/npm operations.
 * @param overrides Test-specific overrides that take priority over defaults
 */
function createFullExecMock(overrides?: (cmd: string, args: string[]) => Promise<any> | undefined) {
  return (cmd: string, args: string[]): Promise<any> | undefined => {
    if (overrides) {
      const r = overrides(cmd, args)
      if (r !== undefined) {
        return r
      }
    }
    const ok = (stdout = '') => Promise.resolve({ stdout, stderr: '' } as any)
    if (cmd === 'git') {
      if (args[0] === 'remote') {
        return ok('origin\thttps://github.com/test/repo.git (push)')
      }
      if (args[0] === 'branch') {
        return ok('main')
      }
      return ok()
    }
    if (cmd === 'npm') {
      if (args[0] === 'config') {
        return ok('https://registry.npmjs.org/')
      }
      if (args[0] === 'view') {
        return Promise.reject(new Error('404 Not Found'))
      }
    }
    return ok()
  }
}

// ================================
// Real E2E tests (uses real git repo from template)
// ================================
describe('release E2E (real git)', () => {
  let templateSandbox: string
  let testSandbox: string
  let testRepo: string

  async function cloneSandboxFromTemplate(targetSandbox: string) {
    const targetRepo = join(targetSandbox, 'repo')
    const targetRemote = join(targetSandbox, 'remote.git')
    cpSync(join(templateSandbox, 'repo'), targetRepo, { recursive: true })
    cpSync(join(templateSandbox, 'remote.git'), targetRemote, { recursive: true })
    await exec('git', ['remote', 'set-url', 'origin', targetRemote], { nodeOptions: { cwd: targetRepo } })
    return targetRepo
  }

  beforeAll(async () => {
    templateSandbox = createSandbox('varlet-release-template')
    await setupGitRepo(join(templateSandbox, 'repo'), join(templateSandbox, 'remote.git'))
  })

  afterAll(() => {
    cleanupSandbox(templateSandbox)
  })

  beforeEach(async () => {
    resetTestDoubles()
    testSandbox = createSandbox('varlet-release-e2e')
    testRepo = await cloneSandboxFromTemplate(testSandbox)
    process.chdir(testRepo)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanupSandbox(testSandbox)
  })

  it('stops when git worktree is not empty', async () => {
    writeFileSync(join(testRepo, 'dirty.js'), 'dirty')

    await release({})

    expect(loggerMock.error).toHaveBeenCalledWith('Git worktree is not empty, please commit changed')
  })

  it('runs complete positive release flow properly', async () => {
    console.log(process.cwd())

    writeFileSync(join(testRepo, 'test1.txt'), 'hello')
    await exec('git', ['add', '.'])
    await exec('git', ['commit', '-m', 'feat: initial feature'])

    promptsMock.confirm.mockResolvedValue(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')

    const taskSpy = vi.fn()
    await release({ skipNpmPublish: true, remote: 'origin', task: taskSpy })

    expect(loggerMock.error.mock.calls).toEqual([])
    expect(taskSpy).toHaveBeenCalledWith('1.0.1', '1.0.0')

    const pkg = readJSONSync(join(testRepo, 'package.json'))
    expect(pkg.version).toBe('1.0.1')
    expect(existsSync(join(testRepo, 'CHANGELOG.md'))).toBe(true)

    const tags = await exec('git', ['tag'])
    expect(tags.stdout).toContain('v1.0.1')

    const statusObj = await exec('git', ['status'])
    expect(statusObj.stdout).toContain('working tree clean')

    const remoteTags = await exec('git', ['ls-remote', '--tags', 'origin'])
    expect(remoteTags.stdout).toContain('refs/tags/v1.0.1')
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
    const tags = await exec('git', ['tag'])
    expect(tags.stdout.trim()).toContain('v1.0.0')

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
    expect(await getGitTags(testRepo)).toBe('v1.0.0')
    expect((await exec('git', ['ls-remote', '--tags', 'origin'])).stdout.trim()).toContain('refs/tags/v1.0.0')
    expect(await getCommitCount(testRepo)).toBe('3')
  })
})

// ================================
// Lightweight release tests (mock git + minimal temp dir)
// ================================
describe('release process (lightweight)', () => {
  let testSandbox: string
  let testRepo: string

  beforeEach(() => {
    resetTestDoubles()
    testSandbox = createSandbox('varlet-release-light')
    testRepo = join(testSandbox, 'repo')
    ensureDirSync(testRepo)
    writeFileSync(
      join(testRepo, 'package.json'),
      JSON.stringify({ name: 'varlet-e2e-dummy', version: '1.0.0', private: false }, null, 2),
    )
    process.chdir(testRepo)
    mockExecOverride = createFullExecMock()
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

  it('stops when refs confirmation is rejected', async () => {
    promptsMock.confirm.mockResolvedValueOnce(false)

    const taskSpy = vi.fn()
    await release({ skipNpmPublish: true, task: taskSpy })

    expect(taskSpy).not.toHaveBeenCalled()
    expect(promptsMock.select).not.toHaveBeenCalled()
    expect(readJSONSync(join(testRepo, 'package.json')).version).toBe('1.0.0')
    expect(existsSync(join(testRepo, 'CHANGELOG.md'))).toBe(false)
  })

  it('stops when registry confirmation is rejected', async () => {
    promptsMock.confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(false)

    const taskSpy = vi.fn()
    await release({ remote: 'origin', task: taskSpy })

    expect(taskSpy).not.toHaveBeenCalled()
    expect(promptsMock.select).not.toHaveBeenCalled()
    expect(readJSONSync(join(testRepo, 'package.json')).version).toBe('1.0.0')
    expect(existsSync(join(testRepo, 'CHANGELOG.md'))).toBe(false)
  })

  it('stops when remote version matches', async () => {
    promptsMock.confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')

    mockExecOverride = createFullExecMock((cmd, args) => {
      if (cmd === 'npm' && args[0] === 'view') {
        return Promise.resolve({ stdout: '1.0.1', stderr: '' } as any)
      }
      return undefined
    })

    const taskSpy = vi.fn()
    await release({ checkRemoteVersion: true, skipNpmPublish: true, task: taskSpy })

    expect(loggerMock.error).toHaveBeenCalledWith('Please check remote version.')
    expect(taskSpy).not.toHaveBeenCalled()
    expect(readJSONSync(join(testRepo, 'package.json')).version).toBe('1.0.0')
    expect(existsSync(join(testRepo, 'CHANGELOG.md'))).toBe(false)
  })

  it('continues release when isSameVersion returns false (version not on remote)', async () => {
    promptsMock.confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')

    // Default createFullExecMock already rejects npm view with 404

    const taskSpy = vi.fn()
    await release({ checkRemoteVersion: true, skipNpmPublish: true, skipChangelog: true, task: taskSpy })

    expect(loggerMock.error).not.toHaveBeenCalledWith('Please check remote version.')
    expect(taskSpy).toHaveBeenCalled()
  })

  it('exits safely when publish fails with npm permission error', async () => {
    promptsMock.confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')

    mockExecOverride = createFullExecMock((cmd, args) => {
      if (cmd === 'pnpm' && args.includes('publish')) {
        return Promise.reject({ output: { stderr: 'E403 no npm permission' } })
      }
      return undefined
    })

    mockProcessExit()

    await expect(release({ remote: 'origin' })).rejects.toThrow('process.exit:1')
    expect(loggerMock.error).toHaveBeenCalledWith('E403 no npm permission')
    // version was already bumped before publish — failure does NOT rollback
    expect(readJSONSync(join(testRepo, 'package.json')).version).toBe('1.0.1')
    expect(existsSync(join(testRepo, 'CHANGELOG.md'))).toBe(false)
  })

  it('exits safely when task throws', async () => {
    promptsMock.confirm.mockResolvedValueOnce(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')

    const taskError = new Error('task failed')
    mockProcessExit()

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

  it('exits safely when pushGit fails (e.g. remote rejects push)', async () => {
    promptsMock.confirm.mockResolvedValue(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValue('confirm')

    mockExecOverride = createFullExecMock((cmd, args) => {
      if (cmd === 'git' && args[0] === 'push') {
        return Promise.reject(new Error('remote: permission denied'))
      }
      return undefined
    })

    mockProcessExit()

    await expect(release({ skipNpmPublish: true, skipChangelog: true, remote: 'origin' })).rejects.toThrow(
      'process.exit:1',
    )
    // version was bumped before pushGit — failure does NOT rollback
    expect(readJSONSync(join(testRepo, 'package.json')).version).toBe('1.0.1')
  })
})

// ================================
// Publish function tests (lightweight, call publish() directly)
// ================================
describe('publish function (lightweight)', () => {
  let testSandbox: string
  let testRepo: string

  beforeEach(() => {
    resetTestDoubles()
    testSandbox = createSandbox('varlet-publish-light')
    testRepo = join(testSandbox, 'repo')
    ensureDirSync(testRepo)
    writeFileSync(
      join(testRepo, 'package.json'),
      JSON.stringify({ name: 'varlet-e2e-dummy', version: '1.0.0', private: false }, null, 2),
    )
    process.chdir(testRepo)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanupSandbox(testSandbox)
  })

  it('publishes with alpha tag when preRelease is true', async () => {
    const publishCalls: string[][] = []
    mockExecOverride = createFullExecMock((cmd, args) => {
      if (cmd === 'pnpm' && args.includes('publish')) {
        publishCalls.push(args)
        return Promise.resolve({ stdout: 'published ok', stderr: '' } as any)
      }
      return undefined
    })

    await publish({ preRelease: true })

    expect(loggerMock.error.mock.calls).toEqual([])
    expect(publishCalls).toEqual([['-r', 'publish', '--no-git-checks', '--access', 'public', '--tag', 'alpha']])
  })

  it('forwards npmTag to pnpm publish', async () => {
    const publishCalls: string[][] = []
    mockExecOverride = createFullExecMock((cmd, args) => {
      if (cmd === 'pnpm' && args.includes('publish')) {
        publishCalls.push(args)
        return Promise.resolve({ stdout: 'published ok', stderr: '' } as any)
      }
      return undefined
    })

    await publish({ npmTag: 'beta' })

    expect(loggerMock.error.mock.calls).toEqual([])
    expect(publishCalls).toEqual([['-r', 'publish', '--no-git-checks', '--access', 'public', '--tag', 'beta']])
    expect(loggerMock.log).toHaveBeenCalledWith('published ok')
  })

  it('preRelease flag takes priority over npmTag (uses alpha, not custom tag)', async () => {
    const publishCalls: string[][] = []
    mockExecOverride = createFullExecMock((cmd, args) => {
      if (cmd === 'pnpm' && args.includes('publish')) {
        publishCalls.push(args)
        return Promise.resolve({ stdout: 'published ok', stderr: '' } as any)
      }
      return undefined
    })

    await publish({ preRelease: true, npmTag: 'beta' })

    expect(loggerMock.error.mock.calls).toEqual([])
    // preRelease should override npmTag — expect alpha, not beta
    expect(publishCalls).toEqual([['-r', 'publish', '--no-git-checks', '--access', 'public', '--tag', 'alpha']])
  })

  it('skips publish when checkRemoteVersion detects same version', async () => {
    const publishCalls: string[][] = []
    mockExecOverride = createFullExecMock((cmd, args) => {
      if (cmd === 'npm' && args[0] === 'view') {
        return Promise.resolve({ stdout: '1.0.0', stderr: '' } as any)
      }
      if (cmd === 'pnpm' && args.includes('publish')) {
        publishCalls.push(args)
        return Promise.resolve({ stdout: 'should not publish', stderr: '' } as any)
      }
      return undefined
    })

    await publish({ checkRemoteVersion: true })

    expect(loggerMock.error).toHaveBeenCalledWith('publishing automatically skipped.')
    expect(publishCalls).toEqual([])
  })
})

// ================================
// Helper functions tests (lightweight)
// ================================
describe('release helper functions', () => {
  let helperSandbox: string
  let helperRepo: string

  beforeEach(() => {
    resetTestDoubles()
    helperSandbox = createSandbox('varlet-release-helper')
    helperRepo = join(helperSandbox, 'repo')
    ensureDirSync(helperRepo)
    writeFileSync(
      join(helperRepo, 'package.json'),
      JSON.stringify({ name: 'varlet-helper-dummy', version: '1.0.0', private: false }, null, 2),
    )
    vi.spyOn(process, 'cwd').mockReturnValue(helperRepo)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanupSandbox(helperSandbox)
  })

  it('getPackageJsons returns only root when no packages dir', () => {
    const result = getPackageJsons()

    expect(result.map((r) => r.filePath)).toEqual([join(helperRepo, 'package.json')])
    expect(result[0].config.name).toBe('varlet-helper-dummy')
  })

  it('getPackageJsons collects workspace packages', () => {
    const packagesDir = join(helperRepo, 'packages')
    const pkgAPath = join(packagesDir, 'pkg-a', 'package.json')
    const pkgBPath = join(packagesDir, 'pkg-b', 'package.json')

    ensureDirSync(join(packagesDir, 'pkg-a'))
    ensureDirSync(join(packagesDir, 'pkg-b'))
    writeFileSync(pkgAPath, JSON.stringify({ name: 'pkg-a', version: '1.0.0' }))
    writeFileSync(pkgBPath, JSON.stringify({ name: 'pkg-b', version: '1.0.0' }))

    const result = getPackageJsons()

    expect(result).toHaveLength(3)
    const filePaths = result.map((r) => r.filePath)
    expect(filePaths).toContainEqual(join(helperRepo, 'package.json'))
    expect(filePaths).toContainEqual(pkgAPath)
    expect(filePaths).toContainEqual(pkgBPath)
  })

  it('updateVersion updates root package.json version', () => {
    updateVersion('2.0.0')

    const pkg = readJSONSync(join(helperRepo, 'package.json'))
    expect(pkg.version).toBe('2.0.0')
  })

  it('updateVersion updates all workspace package versions', () => {
    const packagesDir = join(helperRepo, 'packages')
    const pkgAPath = join(packagesDir, 'pkg-a', 'package.json')
    const pkgBPath = join(packagesDir, 'pkg-b', 'package.json')

    ensureDirSync(join(packagesDir, 'pkg-a'))
    ensureDirSync(join(packagesDir, 'pkg-b'))
    writeFileSync(pkgAPath, JSON.stringify({ name: 'pkg-a', version: '1.0.0' }))
    writeFileSync(pkgBPath, JSON.stringify({ name: 'pkg-b', version: '1.0.0' }))

    updateVersion('2.0.0')

    const rootPkg = readJSONSync(join(helperRepo, 'package.json'))
    const pkgA = readJSONSync(pkgAPath)
    const pkgB = readJSONSync(pkgBPath)

    expect(rootPkg.version).toBe('2.0.0')
    expect(pkgA.version).toBe('2.0.0')
    expect(pkgB.version).toBe('2.0.0')
  })
})
