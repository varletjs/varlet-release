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
    transform(commit, context) {
      let discard = true
      const issues: string[] = []

      commit.notes.forEach((note) => {
        note.title = 'BREAKING CHANGES'
        discard = false
      })

      if (commit.type === 'feat') {
        commit.type = 'Features'
      } else if (commit.type === 'fix') {
        commit.type = 'Bug Fixes'
      } else if (commit.type === 'perf') {
        commit.type = 'Performance Improvements'
      } else if (commit.type === 'revert' || commit.revert) {
        commit.type = 'Reverts'
      } else if (commit.type === 'refactor') {
        commit.type = 'Code Refactoring'
      } else if (discard) {
        return false
      } else if (commit.type === 'docs') {
        commit.type = 'Documentation'
      } else if (commit.type === 'style') {
        commit.type = 'Styles'
      } else if (commit.type === 'test') {
        commit.type = 'Tests'
      } else if (commit.type === 'build') {
        commit.type = 'Build System'
      } else if (commit.type === 'ci') {
        commit.type = 'Continuous Integration'
      }

      if (commit.scope === '*') {
        commit.scope = ''
      }

      if (typeof commit.hash === 'string') {
        commit.shortHash = commit.hash.substring(0, 7)
      }

      if (typeof commit.subject === 'string') {
        let url = context.repository ? `${context.host}/${context.owner}/${context.repository}` : context.repoUrl
        if (url) {
          url = `${url}/issues/`
          commit.subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
            issues.push(issue)
            return `[#${issue}](${url}${issue})`
          })
        }
        if (context.host) {
          commit.subject = commit.subject.replace(/\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g, (_, username) => {
            if (username.includes('/')) {
              return `@${username}`
            }

            return `[@${username}](${context.host}/${username})`
          })
        }
      }

      commit.references = commit.references.filter((reference) => {
        if (issues.indexOf(reference.issue) === -1) {
          return true
        }

        return false
      })

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
