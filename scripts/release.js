import { x as exec } from 'tinyexec'
import { release } from '../dist/index.js'

release({
  checkRemoteVersion: true,
  task: async () => {
    console.log('Building the project...')
    await exec('pnpm', ['run', 'build'])
    console.log('Build completed.')
  },
})
