import { x as exec } from 'tinyexec'
import { release } from '../dist/index.js'

release({
  checkRemoteVersion: true,
  task: async () => {
    await exec('pnpm', ['run', 'build'])
  },
})
