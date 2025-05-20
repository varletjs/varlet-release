import { resolve as resolvePath } from 'path'
import conventionalChangelog from 'conventional-changelog'
import fse from 'fs-extra'
import { createSpinner } from 'nanospinner'

const { createWriteStream } = fse

export interface ChangelogCommandOptions {
  file?: string
  releaseCount?: number
  preset?:
    | 'angular'
    | 'atom'
    | 'codemirror'
    | 'conventionalcommits'
    | 'ember'
    | 'eslint'
    | 'express'
    | 'jquery'
    | 'jshint'
  writerOpts?: Parameters<typeof conventionalChangelog>['4']
}

export function changelog({
  releaseCount = 0,
  file = 'CHANGELOG.md',
  preset = 'angular',
  writerOpts = {
    transform: (commit: any) => {
      if (commit.type === `feat`) {
        commit.type = `Features`
      } else if (commit.type === `fix`) {
        commit.type = `Bug Fixes`
      } else if (commit.type === `perf`) {
        commit.type = `Performance Improvements`
      } else if (commit.type === `refactor`) {
        commit.type = `Refactor`
      } else {
        return false
      }

      return commit
    },
  },
}: ChangelogCommandOptions = {}): Promise<void> {
  const s = createSpinner('Generating changelog').start()

  return new Promise((resolve) => {
    conventionalChangelog(
      {
        preset,
        releaseCount,
      },
      undefined,
      undefined,
      undefined,
      writerOpts,
    )
      .pipe(createWriteStream(resolvePath(process.cwd(), file)))
      .on('close', () => {
        s.success({ text: 'Changelog generated success!' })
        resolve()
      })
  })
}
