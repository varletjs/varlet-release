import { release } from './release'
import { changelog } from './changelog'
import { type Command } from 'commander'

function releaseCommand(program: Command) {
  program
    .command('release')
    .option('-r --remote <remote>', 'Remote name')
    .description('Release all packages and generate changelogs')
    .action(async (options) => release(options))
}

function changelogCommand(program: Command) {
  program
    .command('changelog')
    .option('-rc --releaseCount <releaseCount>', 'Release count')
    .option('-f --file <file>', 'Changelog filename')
    .description('Generate changelog')
    .action(async (options) => changelog(options))
}

export { release, changelog, releaseCommand, changelogCommand }
