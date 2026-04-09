import { fmt, lint } from '@configurajs/vite-plus'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  pack: {
    entry: ['src/index.ts', 'src/cli.ts'],
    format: 'esm',
    outDir: 'dist',
    fixedExtension: false,
    dts: {
      entry: ['src/index.ts'],
    },
  },
  lint: lint({
    vue: false,
  }),
  fmt: {
    ...fmt(),
    ignorePatterns: ['dist/**', 'CHANGELOG.md'],
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/changelog.ts', 'dist/**', 'node_modules/**', 'test/**'],
    },
  },
  server: {
    watch: {
      ignored: ['**/package.json'],
    },
  },
})
