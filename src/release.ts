import fse from 'fs-extra'
import logger from './logger'
import semver from 'semver'
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

async function isWorktreeEmpty() {
  const ret = await execa('git', ['status', '--porcelain'])
  return !ret.stdout
}

export async function publish(preRelease: boolean | undefined) {
  const s = createSpinner('Publishing all packages').start()
  const args = ['-r', 'publish', '--no-git-checks', '--access', 'public']

  if (preRelease) {
    args.push('--tag', 'alpha')
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
  }

  await execa('git', ['push', remote, `v${version}`])

  const ret = await execa('git', ['push'])
  s.success({ text: 'Push remote repository successfully' })
  ret.stdout && logger.info(ret.stdout)
}

export function updateVersion(version: string) {
  const packageJsons = glob.sync('packages/*/package.json')
  packageJsons.push('package.json')

  packageJsons.forEach((path: string) => {
    const file = resolve(cwd, path)
    const config = readJSONSync(file)

    config.version = version
    writeFileSync(file, JSON.stringify(config, null, 2))
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
      type: 'confirm',
      message: `All packages version ${currentVersion} -> ${expectVersion}:`,
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

  return ret[name]
}

export interface ReleaseCommandOptions {
  remote?: string
  skipNpmPublish?: boolean
  skipGitTag?: boolean
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

    const type = await getReleaseType()
    const isPreRelease = type.startsWith('pre')
    let expectVersion = semver.inc(currentVersion, type, `alpha.${Date.now()}`) as string
    expectVersion = isPreRelease ? expectVersion.slice(0, -2) : expectVersion

    if (!(await confirmVersion(currentVersion, expectVersion))) {
      return
    }

    updateVersion(expectVersion)

    if (options.task) {
      await options.task()
    }

    if (!options.skipNpmPublish) {
      await publish(isPreRelease)
    }

    if (!isPreRelease) {
      await changelog()
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
