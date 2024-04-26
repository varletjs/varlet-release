import fse from 'fs-extra'
import logger from './logger'
import semver, { type ReleaseType } from 'semver'
import inquirer from 'inquirer'
import { execa } from 'execa'
import { createSpinner } from 'nanospinner'
import { glob } from 'glob'
import { resolve } from 'path'
import { changelog } from './changelog.js'

const cwd = process.cwd()
const { writeFileSync, readJSONSync } = fse
const { prompt } = inquirer

const releaseTypes = ['premajor', 'preminor', 'prepatch', 'major', 'minor', 'patch']

const BACK_HINT = 'Back to previous step' as const

async function isWorktreeEmpty() {
  const ret = await execa('git', ['status', '--porcelain'])
  return !ret.stdout
}

export async function isSameVersion(version?: string) {
  const s = createSpinner('Check remote version...').start()

  const packageJsones = getPackageJsons()
  const packageJson = packageJsones.find((packageJson) => !packageJson.config.private) || packageJsones[0]
  if (packageJson) {
    const { config } = packageJson
    try {
      await execa('npm', ['view', `${config.name}@${version ?? config.version}`, 'version'])

      s.warn({
        text: `The npm package has a same remote version ${config.version}.`,
      })
      return true
    } catch {
      s.success()
      return false
    }
  }
}

export interface PublishCommandOptions {
  preRelease?: boolean
  checkRemoteVersion?: boolean
  npmTag?: string
}

export async function publish({ preRelease, checkRemoteVersion, npmTag }: PublishCommandOptions) {
  const s = createSpinner('Publishing all packages').start()
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

  const ret = await execa('pnpm', args)
  if (ret.stderr && ret.stderr.includes('npm ERR!')) {
    throw new Error('\n' + ret.stderr)
  } else {
    s.success({ text: 'Publish all packages successfully' })
    ret.stdout && logger.info(ret.stdout)
  }
}

async function pushGit(version: string, remote = 'origin', skipGitTag = false) {
  const s = createSpinner('Pushing to remote git repository').start()
  await execa('git', ['add', '.'])
  await execa('git', ['commit', '-m', `v${version}`])

  if (!skipGitTag) {
    await execa('git', ['tag', `v${version}`])
    await execa('git', ['push', remote, `v${version}`])
  }

  const ret = await execa('git', ['push'])
  s.success({ text: 'Push remote repository successfully' })
  ret.stdout && logger.info(ret.stdout)
}

function getPackageJsons() {
  const packageJsons = ['package.json', ...glob.sync('packages/*/package.json')]

  return packageJsons.map((path) => {
    const filePath = resolve(cwd, path)
    return {
      config: readJSONSync(filePath) as {
        name: string
        version: string
        private: boolean
      },
      filePath,
    }
  })
}

export function updateVersion(version: string) {
  const packageJsons = getPackageJsons()

  packageJsons.forEach(({ config, filePath }) => {
    config.version = version
    writeFileSync(filePath, JSON.stringify(config, null, 2))
  })
}

async function confirmRegistry() {
  const registry = (await execa('npm', ['config', 'get', 'registry'])).stdout
  const name = 'Registry confirm'
  const ret = await prompt([
    {
      name,
      type: 'confirm',
      message: `Current registry is: ${registry}`,
    },
  ])

  return ret[name]
}

async function confirmVersion(currentVersion: string, expectVersion: string) {
  const name = 'Version confirm'
  const ret = await prompt([
    {
      name,
      type: 'list',
      choices: [`All packages version ${currentVersion} -> ${expectVersion}`, BACK_HINT],
    },
  ])

  return ret[name]
}

async function confirmRefs(remote = 'origin') {
  const { stdout } = await execa('git', ['remote', '-v'])
  const reg = new RegExp(`${remote}\t(.*) \\(push`)
  const repo = stdout.match(reg)?.[1]
  const { stdout: branch } = await execa('git', ['branch', '--show-current'])

  const name = 'Refs confirm'
  const ret = await prompt([
    {
      name,
      type: 'confirm',
      message: `Current refs ${repo}:refs/for/${branch}`,
    },
  ])

  return ret[name]
}

async function getReleaseType() {
  const name = 'Please select release type'
  const ret = await prompt([
    {
      name,
      type: 'list',
      choices: releaseTypes,
    },
  ])

  return ret[name] as ReleaseType
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
  task?(): Promise<void>
}

export async function release(options: ReleaseCommandOptions) {
  try {
    const currentVersion = readJSONSync(resolve(cwd, 'package.json')).version

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

    if (!(await confirmRegistry())) {
      return
    }

    const { isPreRelease, expectVersion } = await getReleaseVersion(currentVersion)

    if (options.checkRemoteVersion && (await isSameVersion(expectVersion))) {
      logger.error('Please check remote version.')
      return
    }

    updateVersion(expectVersion)

    if (options.task) {
      await options.task()
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
        await execa('git', ['restore', '**/package.json'])
      } catch {
        /* empty */
      }

      try {
        await execa('git', ['restore', 'package.json'])
      } catch {
        /* empty */
      }
    }
  } catch (error: any) {
    logger.error(error.toString())
    process.exit(1)
  }
}
