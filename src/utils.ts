import { readFileSync } from 'node:fs'

export function readJSONSync<T extends Record<string, any>>(path: string): T {
  const content = readFileSync(path, 'utf-8').replace(/^\uFEFF/, '')
  try {
    return JSON.parse(content)
  } catch (err: any) {
    err.message = `${path}: ${err.message}`
    throw err
  }
}
