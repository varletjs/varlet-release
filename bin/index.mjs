#!/usr/bin/env node
import { releaseCommand, changelogCommand } from '../dist/index.js'
import { Command } from 'commander'

const program = new Command()

releaseCommand(program)
changelogCommand(program)

program.parse()
