import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { styleText } from 'node:util'
import { cancel, confirm, isCancel, select, spinner } from '@clack/prompts'
import { logger } from 'rslog'
import semver, { type ReleaseType } from 'semver'
import { x as exec } from 'tinyexec'
import { changelog } from './changelog'
import { readJSONSync } from './utils'

const cwd = () => process.cwd()

const releaseTypes = ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor']

const BACK_HINT = 'Back to previous step' as const

async function isWorktreeEmpty() {
  const ret = await exec('git', ['status', '--porcelain'])
  return !ret.stdout
}

export async function isSameVersion(version?: string): Promise<boolean | undefined> {
  const s = spinner()
  s.start('Check remote version...')

  const packageJsones = getPackageJsons()
  const packageJson = packageJsones.find((packageJson) => !packageJson.config.private) || packageJsones[0]
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
}

export async function publish({ preRelease, checkRemoteVersion, npmTag }: PublishCommandOptions): Promise<void> {
  const s = spinner()
  s.start('Publishing all packages')
  const args = ['-r', 'publish', '--no-git-checks', '--access', 'public']

  if (checkRemoteVersion && (await isSameVersion())) {
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
    ret.stdout && logger.log(ret.stdout)
  } catch (error: any) {
    s.cancel('Publish all packages failed')
    throw error?.output?.stderr ?? error
  }
}

async function pushGit(version: string, remote = 'origin', skipGitTag = false) {
  const s = spinner()
  s.start('Pushing to remote git repository')
  await exec('git', ['add', '.'], {
    throwOnError: true,
  })
  await exec('git', ['commit', '-m', `v${version}`], {
    throwOnError: true,
  })

  if (!skipGitTag) {
    await exec('git', ['tag', `v${version}`], {
      throwOnError: true,
    })
    await exec('git', ['push', remote, `v${version}`], {
      throwOnError: true,
    })
  }

  const ret = await exec('git', ['push'], {
    throwOnError: true,
  })
  s.stop('Push remote repository successfully')
  ret.stdout && logger.log(ret.stdout)
}

export function getPackageJsons(): {
  filePath: string
  config: {
    name: string
    version: string
    private: boolean
  }
}[] {
  const packageJsons = [resolve(cwd(), 'package.json')]
  const packagesDir = resolve(cwd(), 'packages')
  if (existsSync(packagesDir)) {
    for (const name of readdirSync(packagesDir)) {
      const pkgPath = resolve(packagesDir, name, 'package.json')
      if (existsSync(pkgPath)) {
        packageJsons.push(pkgPath)
      }
    }
  }

  return packageJsons.map((path) => {
    return {
      filePath: path,
      config: readJSONSync<{
        name: string
        version: string
        private: boolean
      }>(path),
    }
  })
}

export function updateVersion(version: string): void {
  const packageJsons = getPackageJsons()

  packageJsons.forEach(({ config, filePath }) => {
    config.version = version
    writeFileSync(filePath, JSON.stringify(config, null, 2))
  })
}

async function confirmRegistry() {
  const registry = (await exec('npm', ['config', 'get', 'registry'])).stdout
  const ret = await confirm({
    message: `Current registry is: ${registry}`,
  })

  if (isCancel(ret)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }

  return ret
}

async function confirmVersion(currentVersion: string, expectVersion: string) {
  const ret = await select({
    message: 'Version confirm',
    options: [`All packages version ${currentVersion} -> ${expectVersion}`, BACK_HINT].map((value) => ({
      label: value,
      value,
    })),
  })

  if (isCancel(ret)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }

  return ret
}

async function confirmRefs(remote = 'origin') {
  const { stdout } = await exec('git', ['remote', '-v'])
  const reg = new RegExp(`${remote}\t(.*) \\(push`)
  const repo = stdout.match(reg)?.[1]
  const { stdout: branch } = await exec('git', ['branch', '--show-current'])

  const ret = await confirm({
    message: `Current refs ${repo}:refs/for/${styleText('blue', branch)}`,
  })

  if (isCancel(ret)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }

  return ret
}

async function getReleaseType() {
  const releaseType = await select({
    message: 'Please select release type',
    options: releaseTypes.map((type) => ({ label: type, value: type })),
  })

  if (isCancel(releaseType)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }

  return releaseType as ReleaseType
}
async function getReleaseVersion(currentVersion: string) {
  let isPreRelease = false
  let expectVersion = ''
  let confirmVersionRet = ''
  do {
    const type = await getReleaseType()
    isPreRelease = type.startsWith('pre')
    expectVersion = semver.inc(currentVersion, type, `alpha.${Date.now()}`) as string
    expectVersion = isPreRelease ? expectVersion.slice(0, -2) : expectVersion

    confirmVersionRet = await confirmVersion(currentVersion, expectVersion)
  } while (confirmVersionRet === BACK_HINT)

  return { isPreRelease, expectVersion }
}

export interface ReleaseCommandOptions {
  remote?: string
  npmTag?: string
  skipNpmPublish?: boolean
  skipChangelog?: boolean
  skipGitTag?: boolean
  checkRemoteVersion?: boolean
  task?(newVersion: string, oldVersion: string): Promise<void>
}

export async function release(options: ReleaseCommandOptions): Promise<void> {
  try {
    const currentVersion = readJSONSync<{ version: string }>(resolve(cwd(), 'package.json')).version

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

    if (options.checkRemoteVersion && (await isSameVersion(expectVersion))) {
      logger.error('Please check remote version.')
      return
    }

    updateVersion(expectVersion)

    if (options.task) {
      await options.task(expectVersion, currentVersion)
    }

    if (!options.skipNpmPublish) {
      await publish({ preRelease: isPreRelease, npmTag: options.npmTag })
    }

    if (!isPreRelease) {
      if (!options.skipChangelog) {
        await changelog()
      }
      await pushGit(expectVersion, options.remote, options.skipGitTag)
    }

    logger.success(`Release version ${expectVersion} successfully!`)

    if (isPreRelease) {
      try {
        await exec('git', ['restore', '**/package.json'], {
          throwOnError: true,
        })
      } catch {
        /* empty */
      }

      try {
        await exec('git', ['restore', 'package.json'], {
          throwOnError: true,
        })
      } catch {
        /* empty */
      }
    }
  } catch (error: any) {
    logger.error(error)
    process.exit(1)
  }
}
