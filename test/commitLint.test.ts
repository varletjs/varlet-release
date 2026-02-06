import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { commitLint, getCommitMessage, isVersionCommitMessage } from '../src/commitLint'

const fsMock = vi.hoisted(() => {
  let content = ''
  const setContent = (value: string) => {
    content = value
  }
  const readFileSync = vi.fn(() => content)
  return { setContent, readFileSync }
})

const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  success: vi.fn(),
}))

vi.mock('fs-extra', () => ({
  default: {
    readFileSync: fsMock.readFileSync,
  },
}))

vi.mock('rslog', () => ({
  logger: loggerMock,
}))

describe('commitLint', () => {
  beforeEach(() => {
    fsMock.setContent('')
    fsMock.readFileSync.mockClear()
    loggerMock.error.mockClear()
    loggerMock.warn.mockClear()
    loggerMock.log.mockClear()
    loggerMock.success.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('detects version commit messages', () => {
    expect(isVersionCommitMessage('v1.2.3')).toBe(true)
    expect(isVersionCommitMessage('1.2.3')).toBe(false)
  })

  it('reads and trims commit message', () => {
    fsMock.setContent('feat: add feature\n')
    expect(getCommitMessage('COMMIT_EDITMSG')).toBe('feat: add feature')
    expect(fsMock.readFileSync).toHaveBeenCalledWith('COMMIT_EDITMSG', 'utf-8')
  })

  it('exits when commitMessagePath is missing', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`)
    }) as never)

    expect(() => commitLint({ commitMessagePath: '' })).toThrow('process.exit')
    expect(loggerMock.error).toHaveBeenCalledWith('commitMessagePath is required')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('exits for invalid commit messages', () => {
    fsMock.setContent('invalid message')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`)
    }) as never)

    expect(() => commitLint({ commitMessagePath: 'COMMIT_EDITMSG' })).toThrow('process.exit')
    expect(loggerMock.error).toHaveBeenCalledWith('Commit message invalid.')
    expect(loggerMock.warn).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('accepts version commit messages', () => {
    fsMock.setContent('v1.2.3')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`)
    }) as never)

    expect(() => commitLint({ commitMessagePath: 'COMMIT_EDITMSG' })).not.toThrow()
    expect(exitSpy).not.toHaveBeenCalled()
  })
})
