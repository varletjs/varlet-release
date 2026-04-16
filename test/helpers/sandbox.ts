import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { vi } from 'vite-plus/test'

export function ensureDirSync(path: string) {
  mkdirSync(path, { recursive: true })
}

export function createSandbox(prefix: string) {
  return join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
}

interface CleanupSandboxOptions {
  logErrors?: boolean
}

export function cleanupSandbox(testSandbox?: string, options?: CleanupSandboxOptions) {
  try {
    testSandbox && rmSync(testSandbox, { recursive: true, force: true })
  } catch (error) {
    if (options?.logErrors) {
      console.warn(`Failed to clean up sandbox "${testSandbox}":`, error)
    }
  }
}

export function createGitSandbox(): { repoDir: string; commitMsgPath: string } {
  const repoDir = mkdtempSync(join(tmpdir(), 'varlet-commit-lint-'))
  const gitDir = join(repoDir, '.git')
  mkdirSync(gitDir)
  const commitMsgPath = join(gitDir, 'COMMIT_EDITMSG')
  return { repoDir, commitMsgPath }
}

export function mockProcessExit() {
  return vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`process.exit:${code}`)
  }) as never)
}
