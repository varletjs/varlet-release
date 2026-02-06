import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fsMock = vi.hoisted(() => {
  const state = {
    files: new Map<string, any>(),
    exists: new Set<string>(),
    dirs: new Map<string, string[]>(),
    writes: [] as Array<{ path: string; data: string }>,
  }

  const readJSONSync = vi.fn((path: string) => state.files.get(path))
  const writeFileSync = vi.fn((path: string, data: string) => {
    state.writes.push({ path, data })
  })
  const existsSync = vi.fn((path: string) => state.exists.has(path))
  const readdirSync = vi.fn((path: string) => state.dirs.get(path) ?? [])

  return { state, readJSONSync, writeFileSync, existsSync, readdirSync }
})

const execMock = vi.hoisted(() => vi.fn())

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
    isCancel: vi.fn().mockReturnValue(false),
    select: vi.fn(),
    spinner,
  }
})

const changelogMock = vi.hoisted(() => vi.fn())

vi.mock('fs-extra', () => ({
  default: {
    readJSONSync: fsMock.readJSONSync,
    writeFileSync: fsMock.writeFileSync,
    existsSync: fsMock.existsSync,
    readdirSync: fsMock.readdirSync,
  },
}))

vi.mock('tinyexec', () => ({
  x: execMock,
}))

vi.mock('rslog', () => ({
  logger: loggerMock,
}))

vi.mock('@clack/prompts', () => promptsMock)

vi.mock('../src/changelog.js', () => ({
  changelog: changelogMock,
}))

const mockCwd = 'C:\\repo'
const rootPackagePath = resolve(mockCwd, 'package.json')
const packagesDir = resolve(mockCwd, 'packages')

async function loadReleaseModule() {
  vi.resetModules()
  const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(mockCwd)
  const mod = await import('../src/release')
  return { mod, cwdSpy }
}

beforeEach(() => {
  fsMock.state.files.clear()
  fsMock.state.exists.clear()
  fsMock.state.dirs.clear()
  fsMock.state.writes.length = 0
  fsMock.readJSONSync.mockClear()
  fsMock.writeFileSync.mockClear()
  fsMock.existsSync.mockClear()
  fsMock.readdirSync.mockClear()
  execMock.mockReset()
  loggerMock.error.mockClear()
  loggerMock.warn.mockClear()
  loggerMock.log.mockClear()
  loggerMock.success.mockClear()
  promptsMock.confirm.mockReset()
  promptsMock.select.mockReset()
  promptsMock.isCancel.mockReset()
  promptsMock.isCancel.mockReturnValue(false)
  promptsMock.cancel.mockClear()
  promptsMock.spinner.mockClear()
  changelogMock.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('release helpers', () => {
  it('collects only root package.json when packages dir is missing', async () => {
    const { mod, cwdSpy } = await loadReleaseModule()
    const result = mod.getAllPackageJsons()
    expect(result).toEqual([rootPackagePath])
    cwdSpy.mockRestore()
  })

  it('collects workspace package.json files when packages dir exists', async () => {
    const pkgAPath = resolve(mockCwd, 'packages', 'a', 'package.json')
    const pkgBPath = resolve(mockCwd, 'packages', 'b', 'package.json')

    fsMock.state.exists.add(packagesDir)
    fsMock.state.exists.add(pkgAPath)
    fsMock.state.exists.add(pkgBPath)
    fsMock.state.dirs.set(packagesDir, ['a', 'b'])

    const { mod, cwdSpy } = await loadReleaseModule()
    const result = mod.getAllPackageJsons()
    expect(result).toEqual([rootPackagePath, pkgAPath, pkgBPath])
    cwdSpy.mockRestore()
  })

  it('updates versions for all package.json files', async () => {
    const pkgAPath = resolve(mockCwd, 'packages', 'a', 'package.json')
    const rootConfig = { name: 'root', version: '1.0.0', private: false }
    const pkgAConfig = { name: 'pkg-a', version: '1.0.0', private: false }

    fsMock.state.exists.add(packagesDir)
    fsMock.state.exists.add(pkgAPath)
    fsMock.state.dirs.set(packagesDir, ['a'])
    fsMock.state.files.set(rootPackagePath, rootConfig)
    fsMock.state.files.set(pkgAPath, pkgAConfig)

    const { mod, cwdSpy } = await loadReleaseModule()
    mod.updateVersion('1.0.1')

    expect(rootConfig.version).toBe('1.0.1')
    expect(pkgAConfig.version).toBe('1.0.1')
    expect(fsMock.writeFileSync).toHaveBeenCalledTimes(2)
    cwdSpy.mockRestore()
  })

  it('detects same remote version via npm view', async () => {
    fsMock.state.files.set(rootPackagePath, { name: 'pkg', version: '1.0.0', private: false })
    execMock.mockResolvedValueOnce({ stdout: '1.0.0' })

    const { mod, cwdSpy } = await loadReleaseModule()
    const result = await mod.isSameVersion()

    expect(result).toBe(true)
    expect(loggerMock.warn).toHaveBeenCalled()
    cwdSpy.mockRestore()
  })

  it('returns false when npm view fails', async () => {
    fsMock.state.files.set(rootPackagePath, { name: 'pkg', version: '1.0.0', private: false })
    execMock.mockRejectedValueOnce(new Error('not found'))

    const { mod, cwdSpy } = await loadReleaseModule()
    const result = await mod.isSameVersion()

    expect(result).toBe(false)
    cwdSpy.mockRestore()
  })

  it('publishes prerelease with alpha tag', async () => {
    execMock.mockResolvedValueOnce({ stdout: 'ok' })
    const { mod, cwdSpy } = await loadReleaseModule()

    await mod.publish({ preRelease: true })

    const publishCall = execMock.mock.calls.find((call) => call[0] === 'pnpm')
    expect(publishCall?.[1]).toContain('--tag')
    expect(publishCall?.[1]).toContain('alpha')
    cwdSpy.mockRestore()
  })

  it('skips publish when remote version matches', async () => {
    fsMock.state.files.set(rootPackagePath, { name: 'pkg', version: '1.0.0', private: false })
    execMock.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'npm' && args[0] === 'view') {
        return Promise.resolve({ stdout: '1.0.0' })
      }
      return Promise.resolve({ stdout: '' })
    })

    const { mod, cwdSpy } = await loadReleaseModule()
    await mod.publish({ checkRemoteVersion: true })

    expect(loggerMock.error).toHaveBeenCalledWith('publishing automatically skipped.')
    expect(execMock.mock.calls.some((call) => call[0] === 'pnpm')).toBe(false)
    cwdSpy.mockRestore()
  })
})

describe('release command flow', () => {
  it('stops when package version is missing', async () => {
    fsMock.state.files.set(rootPackagePath, { name: 'root' })
    const { mod, cwdSpy } = await loadReleaseModule()

    await mod.release({})

    expect(loggerMock.error).toHaveBeenCalledWith('Your package is missing the version field')
    expect(execMock).not.toHaveBeenCalled()
    cwdSpy.mockRestore()
  })

  it('stops when git worktree is not empty', async () => {
    fsMock.state.files.set(rootPackagePath, { name: 'root', version: '1.0.0' })
    execMock.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'status') {
        return Promise.resolve({ stdout: ' M file' })
      }
      return Promise.resolve({ stdout: '' })
    })

    const { mod, cwdSpy } = await loadReleaseModule()
    await mod.release({})

    expect(loggerMock.error).toHaveBeenCalledWith('Git worktree is not empty, please commit changed')
    cwdSpy.mockRestore()
  })

  it('stops when remote version matches', async () => {
    fsMock.state.files.set(rootPackagePath, { name: 'root', version: '1.0.0', private: false })
    promptsMock.confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true)
    promptsMock.select.mockResolvedValueOnce('patch').mockResolvedValueOnce('confirm')

    execMock.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'status') {
        return Promise.resolve({ stdout: '' })
      }
      if (cmd === 'git' && args[0] === 'remote') {
        return Promise.resolve({ stdout: 'origin\tgit@github.com:varletjs/release.git (push)\n' })
      }
      if (cmd === 'git' && args[0] === 'branch') {
        return Promise.resolve({ stdout: 'main' })
      }
      if (cmd === 'npm' && args[0] === 'config') {
        return Promise.resolve({ stdout: 'https://registry.npmjs.org/' })
      }
      if (cmd === 'npm' && args[0] === 'view') {
        return Promise.resolve({ stdout: '1.0.1' })
      }
      return Promise.resolve({ stdout: '' })
    })

    const { mod, cwdSpy } = await loadReleaseModule()
    await mod.release({ checkRemoteVersion: true })

    expect(loggerMock.error).toHaveBeenCalledWith('Please check remote version.')
    cwdSpy.mockRestore()
  })

  it('runs prerelease flow and restores package.json files', async () => {
    fsMock.state.files.set(rootPackagePath, { name: 'root', version: '1.0.0', private: false })
    promptsMock.confirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true)
    promptsMock.select.mockResolvedValueOnce('prepatch').mockResolvedValueOnce('confirm')

    execMock.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'status') {
        return Promise.resolve({ stdout: '' })
      }
      if (cmd === 'git' && args[0] === 'remote') {
        return Promise.resolve({ stdout: 'origin\tgit@github.com:varletjs/release.git (push)\n' })
      }
      if (cmd === 'git' && args[0] === 'branch') {
        return Promise.resolve({ stdout: 'main' })
      }
      if (cmd === 'npm' && args[0] === 'config') {
        return Promise.resolve({ stdout: 'https://registry.npmjs.org/' })
      }
      return Promise.resolve({ stdout: '' })
    })

    const { mod, cwdSpy } = await loadReleaseModule()
    // eslint-disable-next-line require-await
    const task = vi.fn(async () => undefined)

    await mod.release({ task })

    expect(task).toHaveBeenCalled()
    expect(changelogMock).not.toHaveBeenCalled()

    const publishCall = execMock.mock.calls.find((call) => call[0] === 'pnpm')
    expect(publishCall?.[1]).toContain('--tag')
    expect(publishCall?.[1]).toContain('alpha')

    expect(
      execMock.mock.calls.some(
        (call) => call[0] === 'git' && call[1][0] === 'restore' && call[1][1] === '**/package.json',
      ),
    ).toBe(true)

    expect(
      execMock.mock.calls.some(
        (call) => call[0] === 'git' && call[1][0] === 'restore' && call[1][1] === 'package.json',
      ),
    ).toBe(true)

    cwdSpy.mockRestore()
  })
})
