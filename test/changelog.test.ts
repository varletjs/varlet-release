import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { x as exec } from 'tinyexec'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vite-plus/test'
import { changelog } from '../src/changelog'

const promptsMock = vi.hoisted(() => {
  const spinner = vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
  }))
  return { spinner }
})

vi.mock('@clack/prompts', () => promptsMock)

vi.mock('tinyexec', async (importOriginal) => {
  const actual = await importOriginal<typeof import('tinyexec')>()
  return {
    ...actual,
    x: (cmd: string, args: string[], opts?: any) => {
      const injectedOpts = {
        ...opts,
        nodeOptions: {
          cwd: process.cwd(),
          ...opts?.nodeOptions,
        },
      }
      const effectiveCwd = resolve(injectedOpts.nodeOptions.cwd)
      if (!effectiveCwd.startsWith(resolve(tmpdir()))) {
        throw new Error(
          `Safety guard: refusing to run "${cmd} ${args.join(' ')}" outside sandbox. cwd="${effectiveCwd}"`,
        )
      }
      return actual.x(cmd, args, injectedOpts)
    },
  }
})

function ensureDirSync(path: string) {
  mkdirSync(path, { recursive: true })
}

function createSandbox(prefix: string) {
  return join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
}

function cleanupSandbox(testSandbox?: string) {
  try {
    testSandbox && rmSync(testSandbox, { recursive: true, force: true })
  } catch {}
}

describe('changelog', () => {
  let testSandbox: string
  let testRepo: string

  beforeAll(async () => {
    testSandbox = createSandbox('varlet-changelog-test')
    testRepo = join(testSandbox, 'repo')
    ensureDirSync(testRepo)
    vi.spyOn(process, 'cwd').mockReturnValue(testRepo)

    await exec('git', ['init'])
    await exec('git', ['config', 'user.name', 'Tester'])
    await exec('git', ['config', 'user.email', 'test@example.com'])
    await exec('git', ['config', 'commit.gpgsign', 'false'])

    writeFileSync(
      join(testRepo, 'package.json'),
      JSON.stringify(
        {
          name: 'varlet-changelog-dummy',
          version: '1.0.0',
          repository: { url: 'https://github.com/varletjs/release' },
        },
        null,
        2,
      ),
    )

    await exec('git', ['add', '.'])
    await exec('git', ['commit', '-m', 'chore: initial commit', '--date=2024-01-01T00:00:00Z'], {
      nodeOptions: {
        env: {
          ...process.env,
          GIT_COMMITTER_DATE: '2024-01-01T00:00:00Z',
          GIT_AUTHOR_DATE: '2024-01-01T00:00:00Z',
          TZ: 'UTC',
        },
      },
    })

    const commits = [
      { msg: 'feat: add test feature\n\n#1', date: '2024-01-02T00:00:00Z' },
      { msg: 'fix: handle error', date: '2024-01-03T00:00:00Z' },
      { msg: 'perf: improve speed', date: '2024-01-04T00:00:00Z' },
      { msg: 'revert: revert feat', date: '2024-01-05T00:00:00Z' },
      { msg: 'refactor: clean codebase', date: '2024-01-06T00:00:00Z' },
      { msg: 'docs: update readme', date: '2024-01-07T00:00:00Z' },
      { msg: 'style: format code', date: '2024-01-08T00:00:00Z' },
      { msg: 'test: add unit test', date: '2024-01-09T00:00:00Z' },
      { msg: 'build: update vite', date: '2024-01-10T00:00:00Z' },
      { msg: 'ci: update github actions', date: '2024-01-11T00:00:00Z' },
      { msg: 'feat!: breaking change new API', date: '2024-01-12T00:00:00Z' },
      {
        msg: 'fix(sub)!: breaking bug',
        date: '2024-01-13T00:00:00Z',
      },
      {
        msg: 'refactor: breaking text for body\n\nBREAKING CHANGES:\nhello',
        date: '2024-01-13T00:00:00Z',
      },
    ]

    for (const { msg, date } of commits) {
      writeFileSync(join(testRepo, 'test.txt'), msg)
      await exec('git', ['add', '.'])
      await exec('git', ['commit', '-m', msg, `--date=${date}`], {
        nodeOptions: {
          env: {
            ...process.env,
            GIT_COMMITTER_DATE: date,
            GIT_AUTHOR_DATE: date,
            TZ: 'UTC',
          },
        },
      })
    }
  })

  afterAll(() => {
    cleanupSandbox(testSandbox)
  })

  it('should generate changelog and match snapshot', async () => {
    await changelog({ cwd: testRepo })
    const filePath = join(testRepo, 'CHANGELOG.md')
    expect(existsSync(filePath)).toBe(true)

    const content = readFileSync(filePath, 'utf-8')
    const sanitizedContent = content
      .replace(/\d{4}-\d{2}-\d{2}/g, 'YYYY-MM-DD')
      .replace(/\([a-z0-9]{7}\)/g, '(0000000)')
    expect(sanitizedContent).toMatchSnapshot()

    expect(sanitizedContent).toContain('### Features')
    expect(sanitizedContent).toContain('### Bug Fixes')
    expect(sanitizedContent).toContain('### Performance Improvements')
    expect(sanitizedContent).toContain('### Reverts')
    expect(sanitizedContent).toContain('### Refactoring')
    expect(sanitizedContent).toContain('BREAKING CHANGES')

    expect(sanitizedContent).not.toContain('### Documentation')
    expect(sanitizedContent).not.toContain('### Styles')
    expect(sanitizedContent).not.toContain('### Tests')
    expect(sanitizedContent).not.toContain('### Build System')
    expect(sanitizedContent).not.toContain('### Continuous Integration')
  })

  it('should generate changelog with custom file name', async () => {
    const customFileName = 'CUSTOM_CHANGELOG.md'
    await changelog({ cwd: testRepo, file: customFileName })
    const filePath = join(testRepo, customFileName)
    expect(existsSync(filePath)).toBe(true)
  })

  it('should handle custom showTypes to include only specified types', async () => {
    await changelog({ cwd: testRepo, showTypes: ['feat', 'fix'], file: 'custom-types.md' })
    const filePath = join(testRepo, 'custom-types.md')
    const content = readFileSync(filePath, 'utf-8')
    const sanitizedContent = content
      .replace(/\d{4}-\d{2}-\d{2}/g, 'YYYY-MM-DD')
      .replace(/\([a-z0-9]{7}\)/g, '(0000000)')

    expect(sanitizedContent).toContain('### Features')
    expect(sanitizedContent).toContain('### Bug Fixes')
    expect(sanitizedContent).not.toContain('### Performance Improvements')
    expect(sanitizedContent).not.toContain('### Reverts')
    expect(sanitizedContent).not.toContain('### Refactoring')
  })

  it('should include breaking changes even when type is not in showTypes', async () => {
    await changelog({ cwd: testRepo, showTypes: ['feat'], file: 'breaking-test.md' })
    const filePath = join(testRepo, 'breaking-test.md')
    const content = readFileSync(filePath, 'utf-8')
    const sanitizedContent = content
      .replace(/\d{4}-\d{2}-\d{2}/g, 'YYYY-MM-DD')
      .replace(/\([a-z0-9]{7}\)/g, '(0000000)')

    // feat should be included
    expect(sanitizedContent).toContain('### Features')
    // fix with breaking change should be included even though fix is not in showTypes
    // Note: scope is shown as **sub:** in bold, and type prefix is removed
    expect(sanitizedContent).toContain('**sub:**')
    expect(sanitizedContent).toContain('breaking bug')
    // feat! breaking change should be included
    expect(sanitizedContent).toContain('breaking change new API')
    // perf should not be included
    expect(sanitizedContent).not.toContain('### Performance Improvements')
  })

  it('should link issue references in commit subject', async () => {
    await changelog({ cwd: testRepo, showTypes: ['feat'], file: 'issue-link-test.md' })
    const filePath = join(testRepo, 'issue-link-test.md')
    const content = readFileSync(filePath, 'utf-8')

    // Check that #1 is linked
    expect(content).toMatch(/\[#1\]\(.*?\/issues\/1\)/)
  })

  it('should handle commits with scope', async () => {
    await changelog({ cwd: testRepo, showTypes: ['fix'], file: 'scope-test.md' })
    const filePath = join(testRepo, 'scope-test.md')
    const content = readFileSync(filePath, 'utf-8')
    const sanitizedContent = content
      .replace(/\d{4}-\d{2}-\d{2}/g, 'YYYY-MM-DD')
      .replace(/\([a-z0-9]{7}\)/g, '(0000000)')

    // fix(sub) should show scope in bold format: **sub:**
    expect(sanitizedContent).toContain('**sub:**')
    expect(sanitizedContent).toContain('breaking bug')
  })

  it('should handle empty scope asterisk', async () => {
    // The transform function should convert scope="*" to empty string
    // This is implicitly tested by ensuring no "*:" appears in output
    await changelog({ cwd: testRepo, file: 'asterisk-test.md' })
    const filePath = join(testRepo, 'asterisk-test.md')
    const content = readFileSync(filePath, 'utf-8')

    // Should not have "*:" as scope
    expect(content).not.toContain('(*):')
  })

  it('should generate short hash from full hash', async () => {
    await changelog({ cwd: testRepo, file: 'hash-test.md' })
    const filePath = join(testRepo, 'hash-test.md')
    const content = readFileSync(filePath, 'utf-8')

    // Commits should have 7-character short hash in the commit links
    expect(content).toMatch(/\[.*?\]\(.*?\/commit\/[a-f0-9]+\)/)
    // Should not have full 40-character hash visible in the main text (only in URLs)
    const sanitizedContent = content.replace(/\[.*?\]\(.*?\/commit\/[a-f0-9]+\)/g, '')
    expect(sanitizedContent).not.toMatch(/[a-f0-9]{40}/)
  })

  it('should handle revert commits', async () => {
    await changelog({ cwd: testRepo, showTypes: ['revert'], file: 'revert-test.md' })
    const filePath = join(testRepo, 'revert-test.md')
    const content = readFileSync(filePath, 'utf-8')
    const sanitizedContent = content
      .replace(/\d{4}-\d{2}-\d{2}/g, 'YYYY-MM-DD')
      .replace(/\([a-z0-9]{7}\)/g, '(0000000)')

    expect(sanitizedContent).toContain('### Reverts')
    // Note: type prefix is removed, so we only see the subject
    expect(sanitizedContent).toContain('revert feat')
  })

  it('should handle all commit types when showTypes includes everything', async () => {
    const allTypes = ['feat', 'fix', 'perf', 'revert', 'refactor', 'docs', 'style', 'test', 'build', 'ci'] as any[]
    await changelog({ cwd: testRepo, showTypes: allTypes, file: 'all-types.md' })
    const filePath = join(testRepo, 'all-types.md')
    const content = readFileSync(filePath, 'utf-8')
    const sanitizedContent = content
      .replace(/\d{4}-\d{2}-\d{2}/g, 'YYYY-MM-DD')
      .replace(/\([a-z0-9]{7}\)/g, '(0000000)')

    expect(sanitizedContent).toContain('### Features')
    expect(sanitizedContent).toContain('### Bug Fixes')
    expect(sanitizedContent).toContain('### Performance Improvements')
    expect(sanitizedContent).toContain('### Reverts')
    expect(sanitizedContent).toContain('### Refactoring')
    expect(sanitizedContent).toContain('### Documentation')
    expect(sanitizedContent).toContain('### Styles')
    expect(sanitizedContent).toContain('### Tests')
    expect(sanitizedContent).toContain('### Build System')
    expect(sanitizedContent).toContain('### Continuous Integration')
  })
})
