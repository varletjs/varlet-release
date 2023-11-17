import { createSpinner } from 'nanospinner'
import fse from 'fs-extra'
import { type ExecaReturnBase, execa } from 'execa'
import logger from './logger'
import semver from 'semver'
import { glob } from 'glob'
import inquirer from 'inquirer'
import { resolve } from 'path'
import { changelog } from './changelog.js'

const cwd = process.cwd()
const { writeFileSync, readJSONSync } = fse
const { prompt } = inquirer

const releaseTypes = ['premajor', 'preminor', 'prepatch', 'major', 'minor', 'patch'] as const

async function getRemoteVersion() {
  const { name: packageName, version } = readJSONSync(resolve(cwd, 'package.json'))

  const s = createSpinner('Get Remote version...').start()
  const choices = (
    (
      await Promise.allSettled([
        execa('npm', ['view', `${packageName}@latest`, 'version']),
        execa('npm', ['view', `${packageName}@alpha`, 'version']),
      ])
    ).filter((res) => res.status === 'fulfilled') as PromiseFulfilledResult<ExecaReturnBase<string>>[]
  ).map((res) => res.value.stdout)
  s.stop()

  if (choices.length) {
    const name = 'Please select the version'
    const ret = await prompt([
      {
        name,
        type: 'list',
        choices,
      },
    ])

    return ret[name] as string
  }

  const name = 'Get remote version error, if this is the first release, please select'
  const ret = await prompt([
    {
      name,
      type: 'list',
      choices: [
        {
          name: 'Use default version 0.0.0',
          value: '0.0.0',
        },
        {
          name: 'Use package.json version',
          value: version,
        },
      ],
    },
  ])

  return ret[name] as string
}

async function isWorktreeEmpty() {
  const ret = await execa('git', ['status', '--porcelain'])
  return !ret.stdout
}

async function publish(preRelease: boolean) {
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

async function pushGit(version: string, remote = 'origin') {
  const s = createSpinner('Pushing to remote git repository').start()
  await execa('git', ['add', '.'])
  await execa('git', ['commit', '-m', `v${version}`])
  await execa('git', ['tag', `v${version}`])
  await execa('git', ['push', remote, `v${version}`])
  const ret = await execa('git', ['push'])
  s.success({ text: 'Push remote repository successfully' })

  ret.stdout && logger.info(ret.stdout)
}

function updateVersion(version: string) {
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

async function getExpectVersion(currentVersion: string) {
  const name = 'Please select release type'
  const choices = releaseTypes.map((type) => {
    const version = semver.inc(
      currentVersion,
      type.startsWith('pre') && currentVersion.includes('alpha') ? 'prerelease' : type,
      'alpha',
    )
    return {
      name: `${type}(${version})`,
      value: version,
    }
  })
  const ret = await prompt([
    {
      name,
      type: 'list',
      choices,
    },
  ])

  const expectVersion = ret[name] as string

  return {
    isPreRelease: expectVersion.includes('alpha'),
    expectVersion,
  }
}

export interface ReleaseCommandOptions {
  remote?: string
  task?(): Promise<void>
}

export async function release(options: ReleaseCommandOptions) {
  try {
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

    const currentVersion = await getRemoteVersion()
    logger.title(`current version: ${currentVersion}`)

    const { expectVersion, isPreRelease } = await getExpectVersion(currentVersion)

    if (!(await confirmVersion(currentVersion, expectVersion))) {
      return
    }

    updateVersion(expectVersion)

    if (options.task) {
      await options.task()
    }

    await publish(isPreRelease)

    if (!isPreRelease) {
      await changelog()
      await pushGit(expectVersion, options.remote)
    }

    logger.success(`Release version ${expectVersion} successfully!`)

    if (isPreRelease) {
      try {
        await execa('git', ['restore', '**/package.json'])
        await execa('git', ['restore', 'package.json'])
      } catch {
        logger.error('Restore package.json has failed, please restore manually')
      }
    }
  } catch (error: any) {
    logger.error(error.toString())
    process.exit(1)
  }
}
