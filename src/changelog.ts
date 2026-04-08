import { createWriteStream } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { spinner } from '@clack/prompts'
import conventionalChangelog from 'conventional-changelog'
import { COMMIT_HEADER_RE } from './commitLint.ts'

const COMMIT_TYPE_MAP: Record<string, string> = {
  feat: 'Features',
  fix: 'Bug Fixes',
  perf: 'Performance Improvements',
  revert: 'Reverts',
  refactor: 'Code Refactoring',
  docs: 'Documentation',
  style: 'Styles',
  test: 'Tests',
  build: 'Build System',
  ci: 'Continuous Integration',
}

const ALWAYS_SHOW_TYPES = new Set(['feat', 'fix', 'perf', 'revert', 'refactor'])

const BREAKING_CHANGE_RE = /BREAKING CHANGES?:\s*([\s\S]+)/

const MAIN_TEMPLATE = `{{> header}}

{{> footer}}
{{#each commitGroups}}

{{#if title}}
### {{title}}

{{/if}}
{{#each commits}}
{{> commit root=@root}}
{{/each}}

{{/each}}
`
type Context = NonNullable<Parameters<typeof conventionalChangelog>['2']>

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

function extractBreakingText(commit: any): string {
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

function tryParseHeader(commit: any): { type: string; scope?: string; subject?: string; isBreaking: boolean } | null {
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

function processBreakingChanges(commit: any, context: Context, issues: string[]): boolean {
  let discard = true

  commit.notes.forEach((note: any) => {
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

function mapCommitType(commit: any, discard: boolean): boolean {
  if (commit.revert) {
    commit.type = 'Reverts'
    return true
  }

  const mapped = COMMIT_TYPE_MAP[commit.type]
  if (mapped) {
    if (ALWAYS_SHOW_TYPES.has(commit.type) || !discard) {
      commit.type = mapped
      return true
    }
  }

  return !discard
}

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

function createDefaultWriterOpts(): ChangelogCommandOptions['writerOpts'] {
  return {
    mainTemplate: MAIN_TEMPLATE,

    transform(commit, context) {
      const issues: string[] = []

      const discard = processBreakingChanges(commit, context, issues)

      if (!mapCommitType(commit, discard)) {
        return false
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

export function changelog({
  releaseCount = 0,
  file = 'CHANGELOG.md',
  preset = 'angular',
  writerOpts = createDefaultWriterOpts(),
}: ChangelogCommandOptions = {}): Promise<void> {
  const s = spinner()
  s.start('Generating changelog')

  return new Promise((resolve) => {
    conventionalChangelog({ preset, releaseCount }, undefined, undefined, undefined, writerOpts)
      .pipe(createWriteStream(resolvePath(process.cwd(), file)))
      .on('close', () => {
        s.stop('Changelog generated successfully!')
        resolve()
      })
  })
}
