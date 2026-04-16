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
    ...fmt({
      ignores: ['dist/**', 'CHANGELOG.md'],
    }),
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['dist/**', 'node_modules/**', 'test/**'],
    },
  },
  server: {
    watch: {
      ignored: ['**/package.json'],
    },
  },
})
