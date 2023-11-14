import conventionalChangelog from 'conventional-changelog'
import fse from 'fs-extra'
import { createSpinner } from 'nanospinner'
import { resolve as resolvePath } from 'path'

const { createWriteStream } = fse

export interface ChangelogCommandOptions {
  file?: string
  releaseCount?: number
}

export function changelog({ releaseCount = 0, file = 'CHANGELOG.md' }: ChangelogCommandOptions = {}): Promise<void> {
  const s = createSpinner('Generating changelog').start()

  return new Promise((resolve) => {
    conventionalChangelog({
      preset: 'angular',
      releaseCount,
    })
      .pipe(createWriteStream(resolvePath(process.cwd(), file)))
      .on('close', () => {
        s.success({ text: 'Changelog generated success!' })
        resolve()
      })
  })
}
