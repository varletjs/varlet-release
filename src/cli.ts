#!/usr/bin/env node
import { cli, command } from 'cleye'
import pkg from '../package.json' with { type: 'json' }
import { changelog, commitLint, publish, release } from './index.ts'

cli({
  name: 'vr',
  version: pkg.version,
  commands: [
    command(
      {
        name: 'release',
        flags: {
          remote: { type: String, alias: 'r', description: 'Remote name' },
          skipNpmPublish: { type: Boolean, alias: 's', description: 'Skip npm publish' },
          skipChangelog: { type: Boolean, description: 'Skip generate changelog' },
          skipGitTag: { type: Boolean, description: 'Skip git tag' },
          npmTag: { type: String, alias: 't', description: 'Npm tag' },
          checkRemoteVersion: { type: Boolean, alias: 'c', description: 'Check remote version' },
        },
        help: {
          description: 'Release all packages and generate changelogs',
        },
      },
      (argv) => release(argv.flags),
    ),
    command(
      {
        name: 'publish',
        flags: {
          checkRemoteVersion: { type: Boolean, alias: 'c', description: 'Check remote version' },
          npmTag: { type: String, alias: 't', description: 'Npm tag' },
        },
        help: {
          description: 'Publish to npm',
        },
      },
      (argv) => publish(argv.flags),
    ),
    command(
      {
        name: 'changelog',
        flags: {
          releaseCount: { type: Number, alias: 'c', description: 'Release count' },
          file: { type: String, alias: 'f', description: 'Changelog filename' },
        },
        help: {
          description: 'Generate changelog',
        },
      },
      (argv) => changelog(argv.flags),
    ),
    command(
      {
        name: 'commit-lint',
        flags: {
          commitMessagePath: { type: String, alias: 'p', default: '', description: 'Git commit message path' },
          commitMessageRe: {
            type: String,
            alias: 'r',
            description: 'Validate the regular of whether the commit message passes',
          },
          errorMessage: { type: String, alias: 'e', description: 'Validation failed to display error messages' },
          warningMessage: { type: String, alias: 'w', description: 'Validation failed to display warning messages' },
        },
        help: {
          description: 'Lint commit message',
        },
      },
      (argv) => commitLint(argv.flags),
    ),
  ],
})
