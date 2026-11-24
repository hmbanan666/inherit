import { expect, test } from 'vitest'
import { knownLocation, markHostRead, noteHost, scriptFailure } from './hostNotice'

test('a host notice keeps its tick until it clears, then counts again', () => {
  const first = noteHost(undefined, { text: 'main.ts:4 · Add the closing }', tick: 3, file: 'main.ts', line: 4 })
  const again = noteHost(first, { text: first.text, tick: 9, file: 'main.ts', line: 4 })
  expect(again).toBe(first)
  expect(again.tick).toBe(3)
  const read = markHostRead(again)
  expect(read?.read).toBe(true)
  expect(noteHost(read, { text: first.text, tick: 12, file: 'main.ts', line: 4 })).toBe(read)
  const recovered = noteHost(undefined, { text: first.text, tick: 20, file: 'main.ts', line: 4 })
  expect(recovered.read).toBe(false)
  expect(recovered.tick).toBe(20)
})

test('a jump needs a file the player can open', () => {
  expect(knownLocation({ 'main.ts': 'export {}' }, 'main.ts', 4)).toEqual({ file: 'main.ts', line: 4 })
  expect(knownLocation({ 'main.ts': 'export {}' }, 'missing.ts', 4)).toBeUndefined()
  expect(knownLocation({ 'main.ts': 'export {}' }, 'main.ts', 0)).toBeUndefined()
  const error = new Error('main.ts:4 · Add the closing }')
  Object.assign(error, { diagnostic: { file: 'main.ts', line: 4 } })
  expect(scriptFailure(error)).toEqual({ text: 'main.ts:4 · Add the closing }', file: 'main.ts', line: 4 })
  expect(scriptFailure(new Error('Could not save the works in this browser.'))).toEqual({
    text: 'Could not save the works in this browser.',
  })
})
