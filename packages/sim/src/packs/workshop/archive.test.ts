import { expect, test } from 'vitest'
import { archivePrefix, type Archive } from '../../framework/archive'
import { openArchivedSave } from './archive'

function memory() {
  const entries = new Map<string, string>()
  return {
    clear: () => entries.clear(),
    removeItem: (key: string) => { entries.delete(key) },
    get length() { return entries.size },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, raw: string) => { entries.set(key, raw) },
  }
}
const key = 'inherit.pack.workshop'
const files = { 'main.ts': '// my controller', 'lib.ts': 'export const n = 1' }
const project = {
  working: files,
  deployed: files,
  history: [{ name: 'One', files }],
  snapshots: [{ name: 'Two', files }],
}
function chapterSave(version: number) {
  return JSON.stringify({
    formatVersion: version,
    packId: 'workshop',
    packVersion: version,
    world: { version: 6 },
    entryWorld: { version: 6 },
    project,
  })
}
function archives(storage: Storage): Archive[] {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => !!key?.startsWith(archivePrefix('workshop')))
    .map(key => JSON.parse(storage.getItem(key)!))
}
test.each([1, 2])('chapter format %i preserves the exact bytes and all projects before replacement', async version => {
  const storage = memory()
  const original = chapterSave(version)
  storage.setItem(key, original)
  expect(await openArchivedSave(storage)).toBeNull()
  expect(await openArchivedSave(storage)).toBeNull()
  expect(archives(storage)).toEqual([{ name: 'v5 Workshop code', raw: original, project }])
  expect(storage.getItem(key)).toBe(original)
})

test('pre-pack code, malformed data and quota failures leave the source recoverable', async () => {
  const storage = memory()
  const legacy = JSON.stringify({ entries: { '0': { code: '// saved' } } })
  storage.setItem('inherit.workshop.v1', legacy)
  expect(await openArchivedSave(storage)).toBeNull()
  expect(archives(storage)[0]).toMatchObject({ raw: legacy, project: JSON.parse(legacy).entries })
  storage.setItem(key, '{broken')
  await expect(openArchivedSave(storage)).rejects.toThrow(/recover/)
  expect(archives(storage).map(a => a.raw)).toContain('{broken')
  const old = chapterSave(1)
  storage.setItem(key, old)
  storage.setItem = () => { throw new Error('Quota') }
  await expect(openArchivedSave(storage)).rejects.toThrow('Quota')
  await expect(openArchivedSave(storage, true)).rejects.toThrow('Quota')
  expect(storage.getItem(key)).toBe(old)
})
