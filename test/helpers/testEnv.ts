import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureDirSync } from './sandbox'

let isolatedEnv: NodeJS.ProcessEnv | undefined

function createIsolatedGitEnv(): NodeJS.ProcessEnv {
  const root = mkdtempSync(join(tmpdir(), 'varlet-release-test-env-'))
  const homeDir = join(root, 'home')
  const xdgConfigHome = join(root, 'xdg-config')
  const gitConfigGlobal = join(root, '.gitconfig')

  ensureDirSync(homeDir)
  ensureDirSync(xdgConfigHome)
  writeFileSync(gitConfigGlobal, '', 'utf8')

  return {
    ...process.env,
    HOME: homeDir,
    USERPROFILE: homeDir,
    XDG_CONFIG_HOME: xdgConfigHome,
    GIT_CONFIG_GLOBAL: gitConfigGlobal,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0',
  }
}

export function getIsolatedGitEnv(): NodeJS.ProcessEnv {
  isolatedEnv ??= createIsolatedGitEnv()
  return isolatedEnv
}

export function installIsolatedGitEnv() {
  Object.assign(process.env, getIsolatedGitEnv())
}
