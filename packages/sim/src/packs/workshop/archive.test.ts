import { expect, test } from 'vitest'
import { archivedFiles, archives, openArchivedSave } from './archive'

function memory() {
  const entries = new Map<string, string>()
  return {
    get length() { return entries.size },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, raw: string) => { entries.set(key, raw) },
  }
}
const key = 'inherit.pack.workshop'
const files = { 'main.ts': '// my controller', 'lib.ts': 'export const n = 1' }
const old = JSON.stringify({
  formatVersion: 1, packId: 'workshop', packVersion: 1,
  world: { version: 6 }, entryWorld: { version: 6 },
  project: { working: files, deployed: files, history: [{ name: 'One', files }], snapshots: [{ name: 'Two', files }] },
})
test('v5 recovery keeps exact bytes, both projects and every revision before replacing anything', async () => {
  const storage = memory()
  storage.setItem(key, old)
  expect(await openArchivedSave(storage)).toBeNull()
  expect(await openArchivedSave(storage)).toBeNull()
  expect(archives(storage)).toHaveLength(1)
  expect(archives(storage)[0].raw).toBe(old)
  expect(storage.getItem(key)).toBe(old)
  expect(archivedFiles(old).map(g => g.files)).toEqual([files, files, files, files])
})

test('pre-pack code, malformed data and quota failures leave the source recoverable', async () => {
  const storage = memory()
  const legacy = JSON.stringify({ entries: { '0': { code: '// saved' } } })
  storage.setItem('inherit.workshop.v1', legacy)
  expect(await openArchivedSave(storage)).toBeNull()
  expect(archivedFiles(archives(storage)[0].raw)[0].files['main.ts']).toBe('// saved')
  storage.setItem(key, '{broken')
  await expect(openArchivedSave(storage)).rejects.toThrow(/recover/)
  expect(archives(storage).map(a => a.raw)).toContain('{broken')
  storage.setItem(key, old)
  storage.setItem = () => { throw new Error('Quota') }
  await expect(openArchivedSave(storage)).rejects.toThrow('Quota')
  expect(storage.getItem(key)).toBe(old)
})
