import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type TinyExec } from 'tinyexec'
import { vi } from 'vite-plus/test'
import { ensureDirSync } from './sandbox'

export function createFullExecMock(overrides?: (cmd: string, args: string[]) => Promise<any> | undefined) {
  return (cmd: string, args: string[]): Promise<any> | undefined => {
    if (overrides) {
      const result = overrides(cmd, args)
      if (result !== undefined) {
        return result
      }
    }

    const ok = (stdout = '') => Promise.resolve({ stdout, stderr: '' } as any)

    if (cmd === 'git') {
      if (args[0] === 'remote') {
        return ok('origin\thttps://github.com/test/repo.git (push)')
      }
      if (args[0] === 'branch') {
        return ok('main')
      }
      return ok()
    }

    if (cmd === 'npm') {
      if (args[0] === 'config') {
        return ok('https://registry.npmjs.org/')
      }
      if (args[0] === 'view') {
        return Promise.reject(new Error('404 Not Found'))
      }
    }

    return ok()
  }
}

export async function setupGitRepo(testRepo: string, testRemote: string, exec: TinyExec) {
  ensureDirSync(testRepo)
  ensureDirSync(testRemote)

  const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(testRepo)

  try {
    await exec('git', ['init', '--bare', testRemote])
    await exec('git', ['init'])

    await exec('git', ['config', 'user.name', 'Tester'])
    await exec('git', ['config', 'user.email', 'test@example.com'])
    await exec('git', ['config', 'commit.gpgsign', 'false'])
    await exec('git', ['config', 'core.autocrlf', 'false'])

    writeFileSync(
      join(testRepo, 'package.json'),
      JSON.stringify({ name: 'varlet-e2e-dummy', version: '1.0.0', private: false }, null, 2),
    )

    await exec('git', ['add', '.'])
    await exec('git', ['commit', '-m', 'chore: initial commit'])
    await exec('git', ['remote', 'add', 'origin', testRemote])

    let branchName = (await exec('git', ['branch', '--show-current'])).stdout.trim()
    if (!branchName) {
      branchName = 'master'
    }

    await exec('git', ['push', '-u', 'origin', branchName])
    await exec('git', ['tag', 'v1.0.0'])
    await exec('git', ['push', 'origin', 'v1.0.0'])
  } finally {
    cwdSpy.mockRestore()
  }
}
