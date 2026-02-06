import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const indexMock = vi.hoisted(() => ({
  release: vi.fn(),
  publish: vi.fn(),
  changelog: vi.fn(),
  commitLint: vi.fn(),
}))

const fsMock = vi.hoisted(() => ({
  readJSONSync: vi.fn(() => ({ version: '0.0.0' })),
}))

vi.mock('fs-extra', () => ({
  default: {
    readJSONSync: fsMock.readJSONSync,
  },
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
    fsMock.readJSONSync.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runs release command with options', async () => {
    await runCli([
      'release',
      '--remote',
      'upstream',
      '--skip-npm-publish',
      '--skip-changelog',
      '--skip-git-tag',
      '--npm-tag',
      'beta',
      '--check-remote-version',
    ])

    expect(indexMock.release).toHaveBeenCalledWith(
      expect.objectContaining({
        remote: 'upstream',
        skipNpmPublish: true,
        skipChangelog: true,
        skipGitTag: true,
        npmTag: 'beta',
        checkRemoteVersion: true,
      }),
    )
  })

  it('supports short flags for release', async () => {
    await runCli(['release', '-r', 'origin', '-s', '-sc', '-sgt', '-nt', 'next', '-c'])

    expect(indexMock.release).toHaveBeenCalledWith(
      expect.objectContaining({
        remote: 'origin',
        skipNpmPublish: true,
        skipChangelog: true,
        skipGitTag: true,
        npmTag: 'next',
        checkRemoteVersion: true,
      }),
    )
  })

  it('runs publish command with options', async () => {
    await runCli(['publish', '--check-remote-version', '--npm-tag', 'beta'])

    expect(indexMock.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        checkRemoteVersion: true,
        npmTag: 'beta',
      }),
    )
  })

  it('supports short flags for publish', async () => {
    await runCli(['publish', '-c', '-nt', 'beta'])

    expect(indexMock.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        checkRemoteVersion: true,
        npmTag: 'beta',
      }),
    )
  })

  it('runs changelog command with options', async () => {
    await runCli(['changelog', '--releaseCount', '3', '--file', 'CHANGELOG.md', '--preset', 'angular'])

    expect(indexMock.changelog).toHaveBeenCalledWith(
      expect.objectContaining({
        releaseCount: '3',
        file: 'CHANGELOG.md',
        preset: 'angular',
      }),
    )
  })

  it('supports short flags for changelog', async () => {
    await runCli(['changelog', '-rc', '5', '-f', 'CHANGELOG.md', '-p', 'angular'])

    expect(indexMock.changelog).toHaveBeenCalledWith(
      expect.objectContaining({
        releaseCount: '5',
        file: 'CHANGELOG.md',
        preset: 'angular',
      }),
    )
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
})
