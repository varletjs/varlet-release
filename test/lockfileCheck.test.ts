import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { checkLockfileSync, getLockfilePath, installDependencies, lockfileCheck } from '../src/lockfileCheck'

const promptsMock = vi.hoisted(() => {
  const spinner = vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
  }))
  return { spinner }
})

vi.mock('@clack/prompts', () => promptsMock)

vi.mock('tinyexec', () => ({
  x: vi.fn(),
}))

describe('lockfileCheck', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getLockfilePath', () => {
    it.each([
      ['pnpm', 'pnpm-lock.yaml'],
      ['yarn', 'yarn.lock'],
      ['npm', 'package-lock.json'],
    ])('should return correct lockfile path for %s', (packageManager, expected) => {
      expect(getLockfilePath(packageManager as any)).toBe(expected)
    })
  })

  describe('checkLockfileSync', () => {
    it.each([
      ['pnpm', 'pnpm-lock.yaml\npackage.json\n', true],
      ['pnpm', 'test.txt\npackage.json\n', false],
      ['yarn', 'yarn.lock\nsrc/index.ts\n', true],
      ['npm', 'package-lock.json\nREADME.md\n', true],
    ])('should detect lockfile sync for %s with stdout %j', async (packageManager, stdout, expected) => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue({ stdout } as any)

      await expect(checkLockfileSync(packageManager as any)).resolves.toBe(expected)
      expect(mockExec).toHaveBeenCalledWith('git', ['diff', '--name-only', 'ORIG_HEAD', 'HEAD'], {
        throwOnError: true,
      })
    })

    it('should return false when git command fails', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockRejectedValue(new Error('Git error'))

      const result = await checkLockfileSync('pnpm')
      expect(result).toBe(false)
    })
  })

  describe('installDependencies', () => {
    it.each(['pnpm', 'npm', 'yarn'])('should call %s install command', async (packageManager) => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue(undefined as any)

      await installDependencies(packageManager as any)

      expect(mockExec).toHaveBeenCalledWith(packageManager, ['install'], { throwOnError: true })
    })

    it('should throw error when install fails', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockRejectedValue(new Error('Install failed'))

      await expect(installDependencies('pnpm')).rejects.toThrow('Install failed')
    })
  })

  describe('lockfileCheck', () => {
    it('should check lockfile sync with default options', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue({ stdout: 'test.txt\n' } as any)

      await expect(lockfileCheck()).resolves.toBeUndefined()
    })

    it('should use custom package manager', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue({ stdout: 'yarn.lock\n' } as any)

      await expect(lockfileCheck({ packageManager: 'yarn' })).resolves.toBeUndefined()
    })

    it('should install dependencies by default when lockfile updated', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec)
        .mockResolvedValueOnce({ stdout: 'pnpm-lock.yaml\n' } as any)
        .mockResolvedValueOnce(undefined as any)

      await lockfileCheck()

      expect(mockExec).toHaveBeenCalledWith('pnpm', ['install'], { throwOnError: true })
    })

    it('should not install when skipInstall flag is true and lockfile updated', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue({ stdout: 'pnpm-lock.yaml\n' } as any)

      const loggerMock = await import('rslog')
      const mockWarn = vi.spyOn(loggerMock.logger, 'warn')

      const lockfileModule = await import('../src/lockfileCheck')
      const spyInstall = vi.spyOn(lockfileModule, 'installDependencies')

      await lockfileCheck({ skipInstall: true })

      expect(mockExec).toHaveBeenCalledWith('git', ['diff', '--name-only', 'ORIG_HEAD', 'HEAD'], { throwOnError: true })
      expect(mockExec).not.toHaveBeenCalledWith('pnpm', ['install'], { throwOnError: true })
      expect(spyInstall).not.toHaveBeenCalled()
      expect(mockWarn).toHaveBeenCalledWith('Lockfile has been updated!')
    })

    it('should not install when lockfile is not updated', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue({ stdout: 'test.txt\n' } as any)

      await lockfileCheck()

      expect(mockExec).toHaveBeenCalledWith('git', ['diff', '--name-only', 'ORIG_HEAD', 'HEAD'], { throwOnError: true })
      expect(mockExec).not.toHaveBeenCalledWith('pnpm', ['install'], { throwOnError: true })
    })

    it('should handle errors gracefully', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec)
        .mockResolvedValueOnce({ stdout: 'pnpm-lock.yaml\n' } as any)
        .mockRejectedValueOnce(new Error('Test error'))

      const loggerMock = await import('rslog')
      const mockError = vi.spyOn(loggerMock.logger, 'error')

      await expect(lockfileCheck()).resolves.toBeUndefined()
      expect(mockError).toHaveBeenCalledWith('Error checking lockfile sync:', expect.any(Error))
    })
  })
})
