#!/usr/bin/env node
import { release, changelog, commitLint } from '../dist/index.js'
import { Command } from 'commander'

const program = new Command()

program
  .command('release')
  .option('-r --remote <remote>', 'Remote name')
  .description('Release all packages and generate changelogs')
  .action(async (options) => release(options))

program
  .command('changelog')
  .option('-rc --releaseCount <releaseCount>', 'Release count')
  .option('-f --file <file>', 'Changelog filename')
  .description('Generate changelog')
  .action(async (options) => changelog(options))

program
  .command('commit-lint')
  .option('-p --commitMessagePath <commitMessagePath>', 'Git commit message path')
  .option('-cmr --commitMessageRe <reg>', 'Validate the regular of whether the commit message passes')
  .option('-em --errorMessage <message>', 'Validation failed to display error messages')
  .option('-wm --warningMessage <message>', 'Validation failed to display warning messages')
  .description('Lint commit message')
  .action(async (option) => commitLint(option))

program.parse()
