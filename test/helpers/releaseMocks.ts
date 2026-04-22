import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { vi } from 'vite-plus/test'
import { getIsolatedGitEnv } from './testEnv'

const SANDBOX_ROOT = resolve(tmpdir())
const CANCEL_SYMBOL = Symbol.for('clack:cancel')

export type ExecOverride = (cmd: string, args: string[]) => Promise<any> | undefined

const releaseTestState = vi.hoisted(() => {
  const loggerMock = {
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    success: vi.fn(),
  }

  const promptsMock = (() => {
    const spinner = vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      cancel: vi.fn(),
    }))

    return {
      cancel: vi.fn(),
      confirm: vi.fn(),
      isCancel: vi.fn((val: unknown) => val === CANCEL_SYMBOL),
      select: vi.fn(),
      spinner,
    }
  })()

  return {
    loggerMock,
    mockExecOverride: null as ExecOverride | null,
    promptsMock,
  }
})

export const loggerMock = releaseTestState.loggerMock
export const promptsMock = releaseTestState.promptsMock

export function setMockExecOverride(override: ExecOverride | null) {
  releaseTestState.mockExecOverride = override
}

export function resetReleaseTestDoubles() {
  setMockExecOverride(null)
  loggerMock.error.mockClear()
  loggerMock.warn.mockClear()
  loggerMock.log.mockClear()
  loggerMock.success.mockClear()
  promptsMock.confirm.mockReset()
  promptsMock.select.mockReset()
  promptsMock.isCancel.mockClear().mockImplementation((val: unknown) => val === CANCEL_SYMBOL)
}

vi.mock('tinyexec', async (importOriginal) => {
  const actual = await importOriginal<typeof import('tinyexec')>()
  return {
    ...actual,
    x: (cmd: string, args: string[], opts?: any) => {
      if (releaseTestState.mockExecOverride) {
        const result = releaseTestState.mockExecOverride(cmd, args)
        if (result !== undefined) {
          return result
        }
      }

      const injectedOpts = {
        ...opts,
        env: {
          ...getIsolatedGitEnv(),
          ...opts?.env,
        },
        nodeOptions: {
          cwd: process.cwd(),
          ...opts?.nodeOptions,
        },
      }
      const effectiveCwd = resolve(injectedOpts.nodeOptions.cwd)
      if (!effectiveCwd.startsWith(SANDBOX_ROOT)) {
        throw new Error(
          `Safety guard: refusing to run "${cmd} ${args.join(' ')}" outside sandbox. cwd="${effectiveCwd}"`,
        )
      }

      return actual.x(cmd, args, injectedOpts)
    },
  }
})

vi.mock('rslog', () => ({ logger: loggerMock }))
vi.mock('@clack/prompts', () => promptsMock)
