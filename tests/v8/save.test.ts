import { expect, test } from 'vitest'
import { createWorld, kettlewick } from '../../packages/sim/src/v8'
import { archiveFactorySave, recoverFactorySave } from '../../apps/web/app/lib/factoryProtocol'

function memory() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
}

test('a save the world cannot read keeps lib and archives the original bytes', async () => {
  const files = { 'main.ts': 'export function onTick() {}', 'lib/haul.ts': 'export const haul = 1' }
  const raw = JSON.stringify({ version: 2, files, deployed: files, activeFile: 'lib/haul.ts', world: { tick: 'no' } })
  const storage = memory()
  await archiveFactorySave(storage, raw)
  const archived = [...storage.data.entries()]
  expect(archived).toHaveLength(1)
  expect(archived[0]![0].startsWith('inherit.v8.kettlewick.archive.')).toBe(true)
  expect(archived[0]![1]).toBe(raw)
  expect(recoverFactorySave(raw)).toEqual({ kind: 'files', files, deployed: files, activeFile: 'lib/haul.ts' })
  expect(recoverFactorySave('{')).toEqual({ kind: 'blocked' })
  expect(recoverFactorySave(null)).toEqual({ kind: 'missing' })
  const world = createWorld(kettlewick)
  const live = JSON.stringify({
    version: 3, world, files: kettlewick.files, deployed: kettlewick.files, activeFile: 'main.ts',
  })
  expect(recoverFactorySave(live).kind).toBe('resume')
  const lying = { getItem: () => 'other', setItem: () => {} }
  await expect(archiveFactorySave(lying, raw)).rejects.toThrow('archived save')
})
