import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const indexMock = vi.hoisted(() => ({
  release: vi.fn(),
  publish: vi.fn(),
  changelog: vi.fn(),
  commitLint: vi.fn(),
  lockfileCheck: vi.fn(),
}))

vi.mock('../src/index.js', () => indexMock)

async function runCli(args: string[]) {
  const originalArgv = process.argv
  process.argv = ['node', 'cli', ...args]
  try {
    vi.resetModules()
    await import('../src/cli')
  } finally {
    process.argv = originalArgv
  }
}

describe('cli', () => {
  beforeEach(() => {
    indexMock.release.mockClear()
    indexMock.publish.mockClear()
    indexMock.changelog.mockClear()
    indexMock.commitLint.mockClear()
    indexMock.lockfileCheck.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    [
      'release',
      [
        'release',
        '--remote',
        'upstream',
        '--skip-npm-publish',
        '--skip-changelog',
        '--skip-git-tag',
        '--npm-tag',
        'beta',
        '--check-remote-version',
      ],
      indexMock.release,
      {
        remote: 'upstream',
        skipNpmPublish: true,
        skipChangelog: true,
        skipGitTag: true,
        npmTag: 'beta',
        checkRemoteVersion: true,
      },
    ],
    [
      'release short flags',
      ['release', '-r', 'origin', '-s', '--skip-changelog', '--skip-git-tag', '-t', 'next', '-c'],
      indexMock.release,
      {
        remote: 'origin',
        skipNpmPublish: true,
        skipChangelog: true,
        skipGitTag: true,
        npmTag: 'next',
        checkRemoteVersion: true,
      },
    ],
    [
      'publish',
      ['publish', '--check-remote-version', '--npm-tag', 'beta'],
      indexMock.publish,
      { checkRemoteVersion: true, npmTag: 'beta' },
    ],
    [
      'publish short flags',
      ['publish', '-c', '-t', 'beta'],
      indexMock.publish,
      { checkRemoteVersion: true, npmTag: 'beta' },
    ],
    [
      'changelog',
      ['changelog', '--releaseCount', '3', '--file', 'CHANGELOG.md'],
      indexMock.changelog,
      { releaseCount: 3, file: 'CHANGELOG.md' },
    ],
    [
      'changelog short flags',
      ['changelog', '-c', '5', '-f', 'CHANGELOG.md'],
      indexMock.changelog,
      { releaseCount: 5, file: 'CHANGELOG.md' },
    ],
  ])('runs %s command with expected flags', async (_name, args, spy, expectedFlags) => {
    await runCli(args as string[])

    expect(spy).toHaveBeenCalledWith(expect.objectContaining(expectedFlags))
  })

  it('runs commit-lint command with options', async () => {
    await runCli([
      'commit-lint',
      '--commitMessagePath',
      'C:\\tmp\\COMMIT_EDITMSG',
      '--commitMessageRe',
      '^feat',
      '--errorMessage',
      'error',
      '--warningMessage',
      'warn',
    ])

    expect(indexMock.commitLint).toHaveBeenCalledWith(
      expect.objectContaining({
        commitMessagePath: 'C:\\tmp\\COMMIT_EDITMSG',
        commitMessageRe: '^feat',
        errorMessage: 'error',
        warningMessage: 'warn',
      }),
    )
  })

  it('supports short flags for commit-lint', async () => {
    await runCli(['commit-lint', '-p', 'COMMIT_EDITMSG', '-r', '^feat', '-e', 'error', '-w', 'warn'])

    expect(indexMock.commitLint).toHaveBeenCalledWith(
      expect.objectContaining({
        commitMessagePath: 'COMMIT_EDITMSG',
        commitMessageRe: '^feat',
        errorMessage: 'error',
        warningMessage: 'warn',
      }),
    )
  })

  it('runs lockfile-check command with options', async () => {
    await runCli(['lockfile-check', '--packageManager', 'npm', '--skip-install'])

    expect(indexMock.lockfileCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        packageManager: 'npm',
        skipInstall: true,
      }),
    )
  })

  it('supports short flags for lockfile-check', async () => {
    await runCli(['lockfile-check', '-m', 'yarn', '-s'])

    expect(indexMock.lockfileCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        packageManager: 'yarn',
        skipInstall: true,
      }),
    )
  })
})
