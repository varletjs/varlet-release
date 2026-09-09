import { createWriteStream } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { spinner } from '@clack/prompts'
import { StandardChangelog } from 'standard-changelog'
import type { Commit, ConventionalChangelog } from 'standard-changelog'
import { COMMIT_HEADER_RE } from './commitLint.ts'

const COMMIT_TYPE_MAP = {
  feat: 'Features',
  fix: 'Bug Fixes',
  perf: 'Performance Improvements',
  revert: 'Reverts',
  refactor: 'Refactoring',
  docs: 'Documentation',
  style: 'Styles',
  test: 'Tests',
  build: 'Build System',
  ci: 'Continuous Integration',
} as const

type CommitType = keyof typeof COMMIT_TYPE_MAP

const ALWAYS_SHOW_TYPES = ['feat', 'fix', 'perf', 'revert', 'refactor'] as NonNullable<ChangelogOptions['showTypes']>

// The breaking change description ends at the next footer token (Token: value / Token #value)
// or the end of the text, following the Conventional Commits specification.
const BREAKING_CHANGE_RE = /BREAKING CHANGES?:\s*([\s\S]*?)(?=\r?\n[\w-]+(?::\s|\s#)|$)/

type Context = Parameters<ConventionalChangelog['context']>['0']

function linkify(text: string, context: Context, issues: string[]): string {
  let result = text
  const repoUrl = context.repository ? `${context.host}/${context.owner}/${context.repository}` : context.repoUrl

  if (repoUrl) {
    const issueBaseUrl = `${repoUrl}/issues/`
    result = result.replace(/#([0-9]+)/g, (_, issue) => {
      issues.push(issue)
      return `[#${issue}](${issueBaseUrl}${issue})`
    })
  }

  if (context.host) {
    result = result.replace(/\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g, (_, username) =>
      username.includes('/') ? `@${username}` : `[@${username}](${context.host}/${username})`,
    )
  }

  return result
}

function extractBreakingText(commit: Commit): string {
  const body = typeof commit.body === 'string' ? commit.body : ''
  const footer = typeof commit.footer === 'string' ? commit.footer : ''
  const match = BREAKING_CHANGE_RE.exec(`${footer}\n${body}`)

  if (match?.[1]) {
    return match[1].trim()
  }
  if (typeof commit.subject === 'string' && commit.subject) {
    return commit.subject
  }
  if (typeof commit.header === 'string' && commit.header) {
    return commit.header
  }
  return ''
}

function tryParseHeader(
  commit: Commit,
): { type: string; scope?: string; subject?: string; isBreaking: boolean } | null {
  if (typeof commit.header !== 'string') {
    return null
  }
  const match = COMMIT_HEADER_RE.exec(commit.header.trim())
  if (!match) {
    return null
  }

  return {
    type: match[1],
    scope: match[2] || undefined,
    subject: match[4] || undefined,
    isBreaking: Boolean(match[3]),
  }
}

function processBreakingChanges(commit: Commit, context: Context, issues: string[]): boolean {
  let discard = true

  commit.notes.forEach((note) => {
    note.title = 'BREAKING CHANGES'
    discard = false
  })

  const hadBreakingNotes = commit.notes.length > 0

  const addBreakingNote = () => {
    if (!hadBreakingNotes) {
      const text = linkify(extractBreakingText(commit), context, issues)
      commit.notes.push({ title: 'BREAKING CHANGES', text })
    }
    discard = false
  }

  const parsed = tryParseHeader(commit)
  if (parsed) {
    if (!commit.type) {
      commit.type = parsed.type
    }
    if (!commit.scope && parsed.scope) {
      commit.scope = parsed.scope
    }
    if (!commit.subject && parsed.subject) {
      commit.subject = parsed.subject
    }
    if (parsed.isBreaking) {
      addBreakingNote()
    }
  }

  if (typeof commit.type === 'string' && commit.type.endsWith('!')) {
    commit.type = commit.type.slice(0, -1)
    addBreakingNote()
  }

  return discard
}

function mapCommitType(
  commit: Commit,
  discard: boolean,
  showTypes: NonNullable<ChangelogOptions['showTypes']>,
): boolean {
  if (commit.revert) {
    commit.type = 'revert'
  }

  if (!commit.type) {
    return false
  }

  const mapped = COMMIT_TYPE_MAP[commit.type as CommitType]
  if (mapped) {
    if (showTypes.includes(commit.type as CommitType) || !discard) {
      commit.type = mapped
      return true
    }
  }

  return !discard
}

function createDefaultWriterOpts({
  showTypes,
}: {
  showTypes: NonNullable<ChangelogOptions['showTypes']>
}): NonNullable<ChangelogOptions['writerOpt']> {
  return {
    template(context): string {
      const { headerPartial, preamblePartial, commitPartial, footerPartial, commitGroups } = context

      const blocks: string[] = []

      const header = headerPartial(context)
      if (header) {
        blocks.push(header)
      }

      const preamble = preamblePartial(context)
      if (preamble) {
        blocks.push(preamble)
      }

      const footer = footerPartial(context)
      if (footer) {
        blocks.push(footer)
      }

      if (commitGroups) {
        for (const group of commitGroups) {
          if (!group.commits?.length) {
            continue
          }
          const items: string[] = []
          items.push(`### ${group.title}`)
          items.push('')
          for (const commit of group.commits) {
            const rendered = commitPartial(context, commit)
            if (rendered) {
              items.push(`* ${rendered}`)
            }
          }
          blocks.push(items.join('\n'))
        }
      }

      return blocks.join('\n\n')
    },

    transform(_commit, context) {
      const commit = JSON.parse(JSON.stringify(_commit)) as Commit
      const issues: string[] = []

      const discard = processBreakingChanges(commit, context, issues)

      if (!mapCommitType(commit, discard, showTypes)) {
        return null
      }

      if (commit.scope === '*') {
        commit.scope = ''
      }
      if (typeof commit.hash === 'string') {
        commit.shortHash = commit.hash.substring(0, 7)
      }
      if (typeof commit.subject === 'string') {
        commit.subject = linkify(commit.subject, context, issues)
      }

      commit.references = commit.references.filter((ref) => !issues.includes(ref.issue))

      return commit
    },
  }
}

export interface ChangelogOptions {
  cwd?: string
  releaseCount?: number
  file?: string
  showTypes?: readonly CommitType[]
  outputUnreleased?: boolean
  writerOpt?: Parameters<ConventionalChangelog['writer']>[0]
}

export function changelog({
  cwd = process.cwd(),
  releaseCount = 0,
  file = 'CHANGELOG.md',
  showTypes = ALWAYS_SHOW_TYPES,
  outputUnreleased,
  writerOpt,
}: ChangelogOptions = {}): Promise<void> {
  const s = spinner()
  s.start('Generating changelog')

  const defaultWriterOpts = writerOpt || createDefaultWriterOpts({ showTypes })

  return new Promise((resolve, reject) => {
    const generator = new StandardChangelog(cwd).readPackage().options({
      releaseCount,
      outputUnreleased,
    })

    const onError = (error: Error) => {
      s.cancel('Changelog generation failed')
      reject(error)
    }

    generator
      .writer(defaultWriterOpts)
      .writeStream()
      .on('error', onError)
      .pipe(createWriteStream(resolvePath(cwd, file)))
      .on('error', onError)
      .on('close', () => {
        s.stop('Changelog generated successfully!')
        resolve()
      })
  })
}
