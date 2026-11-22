import { expect, test } from 'vitest'
import { runOnce } from './index'

test('a pack installs its documented globals and records the source line', async () => {
  const turns: number[] = []
  const lines: number[] = []
  const api = { tick: 0, plant(count: number) { turns.push(count); return count + 1 },
    traceSite(site: { line: number }) { lines.push(site.line) } }
  const logs = await runOnce({ files: { 'main.ts': '// Plant the row.\nconsole.log(plant(3))' },
    chapterExports: ['plant'], exposure: 'globals' }, api)
  expect(turns).toEqual([3])
  expect(lines).toEqual([2])
  expect(logs).toEqual(['4'])
})
