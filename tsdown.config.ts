import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: 'esm',
  outDir: 'dist',
  fixedExtension: false,
  dts: {
    entry: ['src/index.ts'],
  },
})
