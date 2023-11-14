#!/usr/bin/env node
import { release, changelog } from '../dist/index.js'
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

program.parse()
