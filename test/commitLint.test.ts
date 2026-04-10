/**
 * commitLint.test.ts
 *
 * Testing strategy:
 * - Use real temporary directories to simulate a git repository environment,
 *   writing commit messages to actual files (mirroring .git/COMMIT_EDITMSG).
 * - Only mock logger (to suppress console noise) and process.exit (to prevent process termination).
 * - fs / readFileSync / semver are NOT mocked — all behaviour is real.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  COMMIT_HEADER_RE,
  COMMIT_MESSAGE_RE,
  commitLint,
  getCommitMessage,
  isVersionCommitMessage,
} from '../src/commitLint'

// --- mock logger (suppress console noise during tests) ----------------------
const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  success: vi.fn(),
}))

vi.mock('rslog', () => ({ logger: loggerMock }))

// --- helpers ----------------------------------------------------------------

/**
 * Creates an isolated sandbox directory in the OS temp folder that mirrors a
 * real git worktree: a .git/ subdirectory is created and the returned
 * commitMsgPath points to .git/COMMIT_EDITMSG.
 */
function createGitSandbox(): { repoDir: string; commitMsgPath: string } {
  const repoDir = mkdtempSync(join(tmpdir(), 'varlet-commit-lint-'))
  const gitDir = join(repoDir, '.git')
  mkdirSync(gitDir)
  const commitMsgPath = join(gitDir, 'COMMIT_EDITMSG')
  return { repoDir, commitMsgPath }
}

function removeGitSandbox(repoDir: string) {
  try {
    rmSync(repoDir, { recursive: true, force: true })
  } catch {
    // ignore cleanup errors (common on Windows when git holds file locks)
  }
}

/** Spies on process.exit and converts it into a thrown error so tests can assert on it. */
function mockProcessExit() {
  return vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`process.exit:${code}`)
  }) as never)
}

// ---------------------------------------------------------------------------
// COMMIT_HEADER_RE
// ---------------------------------------------------------------------------
describe('COMMIT_HEADER_RE', () => {
  it.each([
    'feat: add new feature',
    'fix: resolve bug',
    'docs: update readme',
    'perf: improve rendering',
    'test: add unit tests',
    'types: fix type error',
    'style: format code',
    'build: update dependencies',
    'chore: cleanup',
    'release: v1.0.0',
    'refactor: simplify logic',
    'revert: revert commit',
    'merge: merge branch',
    'wip: work in progress',
  ])('accepts valid header: "%s"', (msg) => {
    expect(COMMIT_HEADER_RE.test(msg)).toBe(true)
  })

  it.each(['feat(ui/button): add scope feature', 'fix(core): resolve scope bug', 'docs(api): update api docs'])(
    'accepts header with scope: "%s"',
    (msg) => {
      expect(COMMIT_HEADER_RE.test(msg)).toBe(true)
    },
  )

  it.each(['feat!: breaking change', 'fix(core)!: breaking fix'])(
    'accepts header with breaking-change marker: "%s"',
    (msg) => {
      expect(COMMIT_HEADER_RE.test(msg)).toBe(true)
    },
  )

  it.each([
    'unknown: some message',
    'fix: ',
    'fixbug',
    'Fix: uppercase type',
    ': missing type',
    'feat :extra space before colon',
  ])('rejects invalid header: "%s"', (msg) => {
    expect(COMMIT_HEADER_RE.test(msg)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// COMMIT_MESSAGE_RE
// ---------------------------------------------------------------------------
describe('COMMIT_MESSAGE_RE', () => {
  it('accepts single-line commit message', () => {
    expect(COMMIT_MESSAGE_RE.test('feat: add feature')).toBe(true)
  })

  it('accepts commit message with multi-line body', () => {
    const msg = 'feat: add feature\nThis is the body\nMore details here'
    expect(COMMIT_MESSAGE_RE.test(msg)).toBe(true)
  })

  it('rejects invalid multi-line commit message', () => {
    const msg = 'unknown: bad type\nThis is the body'
    expect(COMMIT_MESSAGE_RE.test(msg)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isVersionCommitMessage
// ---------------------------------------------------------------------------
describe('isVersionCommitMessage', () => {
  it.each(['v1.0.0', 'v0.0.1', 'v10.20.30', 'v1.0.0-alpha.1', 'v2.0.0-beta.3', 'v1.0.0-rc.1'])(
    'recognises version commit: "%s"',
    (msg) => {
      expect(isVersionCommitMessage(msg)).toBe(true)
    },
  )

  it.each([
    'feat: add feature',
    '1.0.0', // missing v prefix
    'v', // no version number
    'vfoo.bar', // not a valid semver
    'v1.0', // incomplete semver
    '',
  ])('rejects non-version commit: "%s"', (msg) => {
    expect(isVersionCommitMessage(msg)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getCommitMessage — uses real files
// ---------------------------------------------------------------------------
describe('getCommitMessage', () => {
  let repoDir: string
  let commitMsgPath: string

  beforeEach(() => {
    ;({ repoDir, commitMsgPath } = createGitSandbox())
  })

  afterEach(() => {
    removeGitSandbox(repoDir)
  })

  it('reads commit message from a real file', () => {
    writeFileSync(commitMsgPath, 'feat: add feature\n', 'utf-8')
    expect(getCommitMessage(commitMsgPath)).toBe('feat: add feature')
  })

  it('trims leading and trailing whitespace', () => {
    writeFileSync(commitMsgPath, '  fix: trim test  \n', 'utf-8')
    expect(getCommitMessage(commitMsgPath)).toBe('fix: trim test')
  })

  it('preserves inner newlines (trim only removes leading/trailing whitespace)', () => {
    writeFileSync(commitMsgPath, 'feat: title\n\nbody line', 'utf-8')
    expect(getCommitMessage(commitMsgPath)).toBe('feat: title\n\nbody line')
  })
})

// ---------------------------------------------------------------------------
// commitLint — uses real .git/COMMIT_EDITMSG files
// ---------------------------------------------------------------------------
describe('commitLint', () => {
  let repoDir: string
  let commitMsgPath: string

  beforeEach(() => {
    ;({ repoDir, commitMsgPath } = createGitSandbox())
    loggerMock.error.mockClear()
    loggerMock.warn.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    removeGitSandbox(repoDir)
  })

  // -- valid commit messages ------------------------------------------------

  it.each([
    'feat: add new feature',
    'fix(core): resolve critical bug',
    'docs: update documentation',
    'chore: update dependencies',
    'refactor(ui): simplify button logic',
    'feat!: breaking api change',
  ])('does not call process.exit for valid commit message: "%s"', (msg) => {
    writeFileSync(commitMsgPath, msg, 'utf-8')

    commitLint({ commitMessagePath: commitMsgPath })

    expect(loggerMock.error).not.toHaveBeenCalled()
  })

  it('treats version commit (v1.0.0) as valid and does not call process.exit', () => {
    writeFileSync(commitMsgPath, 'v1.0.0', 'utf-8')

    commitLint({ commitMessagePath: commitMsgPath })

    expect(loggerMock.error).not.toHaveBeenCalled()
  })

  it('accepts valid commit message with multi-line body', () => {
    writeFileSync(commitMsgPath, 'feat: add feature\n\nThis is the body.\nMore details.', 'utf-8')

    commitLint({ commitMessagePath: commitMsgPath })

    expect(loggerMock.error).not.toHaveBeenCalled()
  })

  // -- invalid commit messages ----------------------------------------------

  it('logs error and calls process.exit(1) for invalid commit message', () => {
    writeFileSync(commitMsgPath, 'bad commit message', 'utf-8')
    mockProcessExit()

    expect(() => commitLint({ commitMessagePath: commitMsgPath })).toThrow('process.exit:1')
    expect(loggerMock.error).toHaveBeenCalledWith('Commit message invalid.')
    expect(loggerMock.warn).toHaveBeenCalledOnce()
  })

  it('logs error and calls process.exit(1) for blank commit message', () => {
    writeFileSync(commitMsgPath, '   ', 'utf-8') // whitespace only — trims to empty string
    mockProcessExit()

    expect(() => commitLint({ commitMessagePath: commitMsgPath })).toThrow('process.exit:1')
    expect(loggerMock.error).toHaveBeenCalledWith('Commit message invalid.')
  })

  it('rejects uppercase commit type (Fix: ...)', () => {
    writeFileSync(commitMsgPath, 'Fix: uppercase type', 'utf-8')
    mockProcessExit()

    expect(() => commitLint({ commitMessagePath: commitMsgPath })).toThrow('process.exit:1')
    expect(loggerMock.error).toHaveBeenCalledWith('Commit message invalid.')
  })

  it('rejects unknown commit type (unknown: ...)', () => {
    writeFileSync(commitMsgPath, 'unknown: bad type', 'utf-8')
    mockProcessExit()

    expect(() => commitLint({ commitMessagePath: commitMsgPath })).toThrow('process.exit:1')
    expect(loggerMock.error).toHaveBeenCalledWith('Commit message invalid.')
  })

  // -- custom options -------------------------------------------------------

  it('uses custom errorMessage when provided', () => {
    writeFileSync(commitMsgPath, 'bad commit', 'utf-8')
    mockProcessExit()

    expect(() =>
      commitLint({
        commitMessagePath: commitMsgPath,
        errorMessage: 'custom error!',
      }),
    ).toThrow('process.exit:1')
    expect(loggerMock.error).toHaveBeenCalledWith('custom error!')
  })

  it('uses custom warningMessage when provided', () => {
    writeFileSync(commitMsgPath, 'bad commit', 'utf-8')
    mockProcessExit()

    expect(() =>
      commitLint({
        commitMessagePath: commitMsgPath,
        warningMessage: 'custom warning!',
      }),
    ).toThrow('process.exit:1')
    expect(loggerMock.warn).toHaveBeenCalledWith('custom warning!')
  })

  it('accepts custom commitMessageRe as a string', () => {
    writeFileSync(commitMsgPath, 'CUSTOM: my message', 'utf-8')

    commitLint({
      commitMessagePath: commitMsgPath,
      commitMessageRe: '^CUSTOM:\\s.+$',
    })

    expect(loggerMock.error).not.toHaveBeenCalled()
  })

  it('accepts custom commitMessageRe as a RegExp', () => {
    writeFileSync(commitMsgPath, 'CUSTOM: my message', 'utf-8')

    commitLint({
      commitMessagePath: commitMsgPath,
      commitMessageRe: /^CUSTOM:\s.+$/,
    })

    expect(loggerMock.error).not.toHaveBeenCalled()
  })

  // -- missing commitMessagePath --------------------------------------------

  it('logs error and calls process.exit(1) when commitMessagePath is empty', () => {
    mockProcessExit()

    expect(() => commitLint({ commitMessagePath: '' })).toThrow('process.exit:1')
    expect(loggerMock.error).toHaveBeenCalledWith('commitMessagePath is required')
  })
})
