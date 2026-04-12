import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { styleText } from 'node:util'
import { cancel, confirm, isCancel, select, spinner } from '@clack/prompts'
import { logger } from 'rslog'
import semver, { type ReleaseType } from 'semver'
import { x as exec } from 'tinyexec'
import { changelog } from './changelog.ts'
import { readJSONSync } from './utils.ts'

const RELEASE_TYPES = ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor']

const BACK_VALUE = 'back' as const

interface PackageJsonConfig {
  name: string
  version: string
  private: boolean
}

interface PackageJsonEntry {
  filePath: string
  config: PackageJsonConfig
}

function unwrapPromptResult<T>(result: T | symbol): T {
  if (isCancel(result)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }
  return result
}

function execGit(...args: string[]) {
  return exec('git', args, { throwOnError: true })
}

function logStdout(ret: { stdout: string }) {
  if (ret.stdout) {
    logger.log(ret.stdout)
  }
}

async function isWorktreeEmpty() {
  const ret = await exec('git', ['status', '--porcelain'])
  return !ret.stdout
}

export async function isSameVersion(version?: string, cwd: string = process.cwd()): Promise<boolean | undefined> {
  const s = spinner()
  s.start('Check remote version...')

  const packageJsonEntries = getPackageJsons(cwd)
  const packageJson = packageJsonEntries.find((entry) => !entry.config.private) || packageJsonEntries[0]
  if (packageJson) {
    const { config } = packageJson
    try {
      await exec('npm', ['view', `${config.name}@${version ?? config.version}`, 'version'], {
        throwOnError: true,
      })

      s.cancel()
      logger.warn(`The npm package has a same remote version ${version ?? config.version}.`)
      return true
    } catch {
      s.stop()
      return false
    }
  }
}

export interface PublishCommandOptions {
  preRelease?: boolean
  checkRemoteVersion?: boolean
  npmTag?: string
  cwd?: string
}

export async function publish({
  preRelease,
  checkRemoteVersion,
  npmTag,
  cwd = process.cwd(),
}: PublishCommandOptions): Promise<void> {
  const s = spinner()
  s.start('Publishing all packages')
  const args = ['-r', 'publish', '--no-git-checks', '--access', 'public']

  if (checkRemoteVersion && (await isSameVersion(undefined, cwd))) {
    logger.error('publishing automatically skipped.')
    return
  }

  if (preRelease) {
    args.push('--tag', 'alpha')
  } else if (npmTag) {
    args.push('--tag', npmTag)
  }

  try {
    const ret = await exec('pnpm', args, { throwOnError: true })
    s.stop('Publish all packages successfully')
    logStdout(ret)
  } catch (error: unknown) {
    s.cancel('Publish all packages failed')
    throw (error as any)?.output?.stderr ?? error
  }
}

async function pushGit(version: string, remote = 'origin', skipGitTag = false) {
  const s = spinner()
  s.start('Pushing to remote git repository')
  await execGit('add', '.')
  await execGit('commit', '-m', `v${version}`)

  if (!skipGitTag) {
    await execGit('tag', `v${version}`)
    await execGit('push', remote, `v${version}`)
  }

  const ret = await execGit('push')
  s.stop('Push remote repository successfully')
  logStdout(ret)
}

export function getPackageJsons(cwd: string = process.cwd()): PackageJsonEntry[] {
  const packageJsonPaths = [resolve(cwd, 'package.json')]
  const packagesDir = resolve(cwd, 'packages')
  if (existsSync(packagesDir)) {
    for (const name of readdirSync(packagesDir)) {
      const pkgPath = resolve(packagesDir, name, 'package.json')
      if (existsSync(pkgPath)) {
        packageJsonPaths.push(pkgPath)
      }
    }
  }

  return packageJsonPaths.map((path) => ({
    filePath: path,
    config: readJSONSync<PackageJsonConfig>(path),
  }))
}

export function updateVersion(version: string, cwd: string = process.cwd()): void {
  for (const { config, filePath } of getPackageJsons(cwd)) {
    config.version = version
    writeFileSync(filePath, JSON.stringify(config, null, 2))
  }
}

async function confirmRegistry() {
  const registry = (await exec('npm', ['config', 'get', 'registry'])).stdout
  return unwrapPromptResult(
    await confirm({
      message: `Current registry is: ${registry}`,
    }),
  )
}

async function confirmVersion(currentVersion: string, expectVersion: string) {
  return unwrapPromptResult(
    await select({
      message: 'Version confirm',
      options: [
        { label: `All packages version ${currentVersion} -> ${expectVersion}`, value: 'confirm' as const },
        { label: 'Back to previous step', value: BACK_VALUE },
      ],
    }),
  )
}

async function confirmRefs(remote = 'origin') {
  const { stdout } = await exec('git', ['remote', '-v'])
  const reg = new RegExp(`${remote}\\t(.*) \\(push\\)`)

  const repo = stdout.match(reg)?.[1]
  const { stdout: branch } = await exec('git', ['branch', '--show-current'])

  return unwrapPromptResult(
    await confirm({
      message: `Current refs ${repo}:refs/for/${styleText('blue', branch)}`,
    }),
  )
}

function computeExpectVersion(currentVersion: string, type: ReleaseType): string {
  const incremented = semver.inc(currentVersion, type, `alpha.${Date.now()}`)
  if (!incremented) {
    throw new Error(`Failed to increment version ${currentVersion} with type ${type}`)
  }
  return type.startsWith('pre') ? incremented.slice(0, -2) : incremented
}

async function getReleaseType(currentVersion: string) {
  return unwrapPromptResult(
    await select({
      message: 'Please select release type',
      options: RELEASE_TYPES.map((type) => {
        const expectVersion = computeExpectVersion(currentVersion, type as ReleaseType)
        return { label: `${type} (${currentVersion} → ${expectVersion})`, value: type }
      }),
    }),
  ) as ReleaseType
}

async function getReleaseVersion(currentVersion: string) {
  while (true) {
    const type = await getReleaseType(currentVersion)
    const isPreRelease = type.startsWith('pre')
    const expectVersion = computeExpectVersion(currentVersion, type)

    const confirmResult = await confirmVersion(currentVersion, expectVersion)

    if (confirmResult !== BACK_VALUE) {
      return { isPreRelease, expectVersion }
    }
  }
}

async function restorePackageJsons() {
  try {
    await execGit('restore', '**/package.json', 'package.json')
  } catch {
    /* empty */
  }
}

export interface ReleaseCommandOptions {
  remote?: string
  npmTag?: string
  cwd?: string
  skipNpmPublish?: boolean
  skipChangelog?: boolean
  skipGitTag?: boolean
  checkRemoteVersion?: boolean
  task?(newVersion: string, oldVersion: string): Promise<void>
}

export async function release(options: ReleaseCommandOptions): Promise<void> {
  const cwd = options.cwd ?? process.cwd()

  try {
    const currentVersion = readJSONSync<{ version: string }>(resolve(cwd, 'package.json')).version

    if (!currentVersion) {
      logger.error('Your package is missing the version field')
      return
    }

    if (!(await isWorktreeEmpty())) {
      logger.error('Git worktree is not empty, please commit changed')
      return
    }

    if (!(await confirmRefs(options.remote))) {
      return
    }

    if (!options.skipNpmPublish && !(await confirmRegistry())) {
      return
    }

    const { isPreRelease, expectVersion } = await getReleaseVersion(currentVersion)

    if (options.checkRemoteVersion && (await isSameVersion(expectVersion, cwd))) {
      logger.error('Please check remote version.')
      return
    }

    updateVersion(expectVersion, cwd)

    if (options.task) {
      await options.task(expectVersion, currentVersion)
    }

    if (!options.skipNpmPublish) {
      await publish({ preRelease: isPreRelease, npmTag: options.npmTag, cwd })
    }

    if (!isPreRelease) {
      if (!options.skipChangelog) {
        await changelog({ cwd })
      }
      await pushGit(expectVersion, options.remote, options.skipGitTag)
    }

    logger.success(`Release version ${expectVersion} successfully!`)

    if (isPreRelease) {
      await restorePackageJsons()
    }
  } catch (error: unknown) {
    logger.error(error)
    process.exit(1)
  }
}
