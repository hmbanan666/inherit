import { expect, test } from 'vitest'
import { runOnce } from './index'

test('a pack installs its documented globals and records the source line', async () => {
  const turns: number[] = []
  const lines: number[] = []
  const api = { tick: 0, plant(count: number) { turns.push(count); return count + 1 },
    traceSite(site: { line: number }) { lines.push(site.line) } }
  const logs = await runOnce({ files: { 'main.ts': '// Plant the row.\nconsole.log(plant(3))' },
    operations: ['plant'], exposure: 'globals' }, api)
  expect(turns).toEqual([3])
  expect(lines).toEqual([2])
  expect(logs).toEqual(['4'])
})

test('a pack module loads inside the guest and returns a value to a global operation', async () => {
  const values: number[] = []
  await runOnce({files:{'main.ts':'import { twice } from "numbers"; plant(twice(3))'},
    guestModules:{numbers:{source:'export function twice(n:number){return n*2}',declarations:'declare module "numbers" { export function twice(n:number):number }'}},
    operations:['plant'], exposure:'globals'}, {tick:0, ...{plant(n:number){values.push(n)}}})
  expect(values).toEqual([6])
})
