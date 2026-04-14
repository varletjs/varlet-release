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
    it('should return correct lockfile path for pnpm', () => {
      expect(getLockfilePath('pnpm')).toBe('pnpm-lock.yaml')
    })

    it('should return correct lockfile path for yarn', () => {
      expect(getLockfilePath('yarn')).toBe('yarn.lock')
    })

    it('should return correct lockfile path for npm', () => {
      expect(getLockfilePath('npm')).toBe('package-lock.json')
    })
  })

  describe('checkLockfileSync', () => {
    it('should return true when lockfile is updated', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue({ stdout: 'pnpm-lock.yaml\npackage.json\n' } as any)

      const result = await checkLockfileSync('pnpm')
      expect(result).toBe(true)
      expect(mockExec).toHaveBeenCalledWith('git', ['diff', '--name-only', 'ORIG_HEAD', 'HEAD'], {
        throwOnError: true,
      })
    })

    it('should return false when lockfile is not updated', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue({ stdout: 'test.txt\npackage.json\n' } as any)

      const result = await checkLockfileSync('pnpm')
      expect(result).toBe(false)
    })

    it('should handle yarn lockfile', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue({ stdout: 'yarn.lock\nsrc/index.ts\n' } as any)

      const result = await checkLockfileSync('yarn')
      expect(result).toBe(true)
    })

    it('should handle npm lockfile', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue({ stdout: 'package-lock.json\nREADME.md\n' } as any)

      const result = await checkLockfileSync('npm')
      expect(result).toBe(true)
    })

    it('should return false when git command fails', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockRejectedValue(new Error('Git error'))

      const result = await checkLockfileSync('pnpm')
      expect(result).toBe(false)
    })
  })

  describe('installDependencies', () => {
    it('should call package manager install command', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue(undefined as any)

      await installDependencies('pnpm')

      expect(mockExec).toHaveBeenCalledWith('pnpm', ['install'], { throwOnError: true })
    })

    it('should handle npm install', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue(undefined as any)

      await installDependencies('npm')

      expect(mockExec).toHaveBeenCalledWith('npm', ['install'], { throwOnError: true })
    })

    it('should handle yarn install', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue(undefined as any)

      await installDependencies('yarn')

      expect(mockExec).toHaveBeenCalledWith('yarn', ['install'], { throwOnError: true })
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

    it('should install dependencies when install flag is true and lockfile updated', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec)
        .mockResolvedValueOnce({ stdout: 'pnpm-lock.yaml\n' } as any)
        .mockResolvedValueOnce(undefined as any)

      await lockfileCheck({ install: true })

      expect(mockExec).toHaveBeenCalledWith('pnpm', ['install'], { throwOnError: true })
    })

    it('should not install when lockfile is not updated', async () => {
      const { x: mockExec } = await import('tinyexec')
      vi.mocked(mockExec).mockResolvedValue({ stdout: 'test.txt\n' } as any)

      await lockfileCheck({ install: true })

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

      await expect(lockfileCheck({ install: true })).resolves.toBeUndefined()
      expect(mockError).toHaveBeenCalledWith('Error checking lockfile sync:', expect.any(Error))
    })
  })
})
