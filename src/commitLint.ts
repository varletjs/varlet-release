import fse from 'fs-extra'
import semver from 'semver'
import logger from './logger.js'

const { readFileSync } = fse

export const COMMIT_MESSAGE_RE =
  /^(revert|fix|feat|docs|perf|test|types|style|build|chore|release|refactor|merge|wip)(\(.+\))?!?: (.|\n)+/

const ERROR_MESSAGE = 'Commit message invalid.'
const WARNING_MESSAGE = `\
The rules for commit messages are as follows

Example:

feat: add a new feature
feat(ui/button): add a new feature in the ui/button scope

fix: fix a bug
fix(ui/button): fix a bug in the ui/button scope

docs: fix an error in the documentation
docs(ui/button): fix a documentation error in the ui/button scope

Allowed types:
- fix
- feat
- docs
- perf
- test
- types
- style
- build
- chore
- release
- refactor
- revert
- merge
- wip

Commit message reference: https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y
参考阮一峰Commit message编写指南: https://www.ruanyifeng.com/blog/2016/01/commit_message_change_log.html`

export function isVersionCommitMessage(message: string) {
  return message.startsWith('v') && semver.valid(message.slice(1))
}

export function getCommitMessage(commitMessagePath: string) {
  return readFileSync(commitMessagePath, 'utf-8').trim()
}

export interface CommitLintCommandOptions {
  commitMessagePath: string
  commitMessageRe?: string | RegExp
  errorMessage?: string
  warningMessage?: string
}

export function commitLint(options: CommitLintCommandOptions) {
  const {
    commitMessagePath,
    commitMessageRe = COMMIT_MESSAGE_RE,
    errorMessage = ERROR_MESSAGE,
    warningMessage = WARNING_MESSAGE,
  } = options

  if (!commitMessagePath) {
    logger.error('commitMessagePath is required')
    process.exit(1)
  }

  const commitMessage = getCommitMessage(commitMessagePath)
  const isValidCommitMessage = new RegExp(commitMessageRe).test(commitMessage)

  if (!isVersionCommitMessage(commitMessage) && !isValidCommitMessage) {
    logger.error(errorMessage)
    logger.warning(warningMessage)
    process.exit(1)
  }
}
