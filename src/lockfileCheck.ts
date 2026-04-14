import { spinner } from '@clack/prompts'
import { logger } from 'rslog'
import { x as exec } from 'tinyexec'

export type PackageManager = 'npm' | 'yarn' | 'pnpm'

export interface LockfileCheckOptions {
  packageManager?: PackageManager
  install?: boolean
}

export function getLockfilePath(packageManager: PackageManager): string {
  switch (packageManager) {
    case 'pnpm':
      return 'pnpm-lock.yaml'
    case 'yarn':
      return 'yarn.lock'
    case 'npm':
      return 'package-lock.json'
  }
}

export async function checkLockfileSync(packageManager: PackageManager): Promise<boolean> {
  const lockfile = getLockfilePath(packageManager)

  try {
    const { stdout } = await exec('git', ['diff', '--name-only', 'ORIG_HEAD', 'HEAD'], { throwOnError: true })
    return stdout.includes(lockfile)
  } catch {
    logger.warn('Error checking lockfile, please check manually.')
    return false
  }
}

export async function installDependencies(packageManager: PackageManager): Promise<void> {
  const s = spinner()
  s.start('Installing dependencies...')

  const installArgs: Record<PackageManager, string[]> = {
    npm: ['install'],
    yarn: ['install'],
    pnpm: ['install'],
  }

  try {
    await exec(packageManager, installArgs[packageManager], { throwOnError: true })
    s.stop('Dependencies installed successfully')
    logger.success('✨ All dependencies are up to date')
  } catch (error) {
    s.cancel('Failed to install dependencies')
    logger.error(error)
    throw error
  }
}

export async function lockfileCheck(options: LockfileCheckOptions = {}): Promise<void> {
  try {
    const pkgManager = (options.packageManager || 'pnpm') as PackageManager
    const installFlag = options.install || false

    const needSync = await checkLockfileSync(pkgManager)

    if (needSync) {
      logger.warn('Lockfile has been updated!')
      if (installFlag) {
        await installDependencies(pkgManager)
      }
    }
  } catch (error) {
    logger.error('Error checking lockfile sync:', error)
  }
}
