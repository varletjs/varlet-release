import { beforeEach, describe, expect, it, vi } from 'vitest'
import { changelog } from '../src/changelog'

const fsMock = vi.hoisted(() => {
  const createWriteStream = vi.fn(() => ({
    on: vi.fn((event: string, callback: () => void) => {
      if (event === 'close') {
        callback()
      }
      return undefined
    }),
  }))

  return { createWriteStream }
})

const promptsMock = vi.hoisted(() => {
  const spinner = vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
  }))

  return { spinner }
})

const conventionalMock = vi.hoisted(() => {
  const state = {
    writerOpts: undefined as any,
  }

  const fn = vi.fn((...args: any[]) => {
    state.writerOpts = args[4]
    return {
      pipe: (dest: any) => dest,
    }
  })

  return { state, fn }
})

vi.mock('fs-extra', () => ({
  default: {
    createWriteStream: fsMock.createWriteStream,
  },
}))

vi.mock('@clack/prompts', () => promptsMock)

vi.mock('conventional-changelog', () => ({
  default: conventionalMock.fn,
}))

describe('changelog', () => {
  beforeEach(() => {
    fsMock.createWriteStream.mockClear()
    promptsMock.spinner.mockClear()
    conventionalMock.fn.mockClear()
    conventionalMock.state.writerOpts = undefined
  })

  it('keeps feat! commits and adds breaking notes', async () => {
    await changelog({ file: 'CHANGELOG.md' })

    const transform = conventionalMock.state.writerOpts?.transform
    expect(typeof transform).toBe('function')

    const commit = {
      type: 'feat!',
      scope: 'core',
      subject: 'add feature',
      hash: 'abcdef012345',
      notes: [] as Array<{ title: string; text?: string }>,
      references: [] as Array<{ issue: string }>,
    }

    const context = {
      host: 'https://github.com',
      owner: 'varletjs',
      repository: 'release',
    }

    const result = transform(commit, context)

    expect(result).not.toBe(false)
    expect(commit.type).toBe('Features')
    expect(commit.notes).toHaveLength(1)
    expect(commit.notes[0].title).toBe('BREAKING CHANGES')
  })
})
