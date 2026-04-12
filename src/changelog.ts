import { createWriteStream } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { spinner } from '@clack/prompts'
import { ConventionalChangelog } from 'conventional-changelog'
import type { Commit, Params } from 'conventional-changelog'
import { COMMIT_HEADER_RE } from './commitLint.ts'

const COMMIT_TYPE_MAP: Record<string, string> = {
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
interface Context {
  host?: string
  owner?: string
  repository?: string
  repoUrl?: string
}

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

  const getCommitHashLink = () => {
    if (!commit.hash) {
      return ''
    }
    const shortHash = commit.hash.substring(0, 7)
    const repoUrl = context.repository ? `${context.host}/${context.owner}/${context.repository}` : context.repoUrl
    return repoUrl ? ` ([${shortHash}](${repoUrl}/commit/${commit.hash}))` : ` (${shortHash})`
  }

  const hashLink = getCommitHashLink()

  if (commit.notes && commit.notes.length > 0) {
    discard = false
    commit.notes = commit.notes.map((note: any) => ({
      ...note,
      title: note.title === 'BREAKING CHANGE' ? 'BREAKING CHANGES' : note.title,
      text: commit.hash && note.text.includes(commit.hash.substring(0, 7)) ? note.text : note.text + hashLink,
    }))
  }

  const hadBreakingNotes = commit.notes && commit.notes.length > 0

  const addBreakingNote = () => {
    if (!hadBreakingNotes) {
      const text = linkify(extractBreakingText(commit), context, issues) + hashLink
      if (!commit.notes) {
        commit.notes = []
      }
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
  cwd?: string
  file?: string
  releaseCount?: number
  mainTemplate?: string
  transformCommit?: (commit: Commit, params: Params) => Partial<Commit> | Promise<Partial<Commit> | null> | null
}

function createDefaultTransformCommit(): ChangelogCommandOptions['transformCommit'] {
  return (commit, params) => {
    const context: Context = {
      host: params.context?.host,
      owner: params.context?.owner,
      repository:
        typeof params.repository === 'object' && params.repository !== null ? params.repository.project : undefined,
      repoUrl: params.context?.repoUrl,
    }
    const issues: string[] = []

    // Create a mutable copy of the commit
    const mutableCommit = { ...commit }
    if (mutableCommit.notes) {
      mutableCommit.notes = [...mutableCommit.notes]
    }

    const discard = processBreakingChanges(mutableCommit, context, issues)

    if (!mapCommitType(mutableCommit, discard)) {
      return null
    }

    if (mutableCommit.scope === '*') {
      mutableCommit.scope = ''
    }
    if (typeof mutableCommit.hash === 'string') {
      mutableCommit.shortHash = mutableCommit.hash.substring(0, 7)
    }
    if (typeof mutableCommit.subject === 'string') {
      mutableCommit.subject = linkify(mutableCommit.subject, context, issues)
    }

    if (mutableCommit.references) {
      mutableCommit.references = mutableCommit.references.filter((ref: any) => !issues.includes(ref.issue))
    }

    return mutableCommit
  }
}

export function changelog({
  cwd = process.cwd(),
  releaseCount = 0,
  file = 'CHANGELOG.md',
  mainTemplate = MAIN_TEMPLATE,
  transformCommit = createDefaultTransformCommit(),
}: ChangelogCommandOptions = {}): Promise<void> {
  const s = spinner()
  s.start('Generating changelog')

  return new Promise((resolve) => {
    const generator = new ConventionalChangelog(cwd)
      .readPackage()
      .loadPreset('angular')
      .options({
        releaseCount,
        transformCommit,
      })
      .writer({
        mainTemplate,
        transform: (commit) => commit,
      })

    generator
      .writeStream()
      .pipe(createWriteStream(resolvePath(cwd, file)))
      .on('close', () => {
        s.stop('Changelog generated successfully!')
        resolve()
      })
  })
}
