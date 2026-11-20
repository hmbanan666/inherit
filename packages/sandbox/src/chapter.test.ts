import { describe, expect, test } from 'vitest'
import { createWorld, evaluate, levels, step, type Layout } from '@inherit/sim'
import { createProgram } from './index'

const fixes = [
  (code: string) => code.replace('// TODO: fire up the furnace.', 'ctx.work("furnace-a")'),
  (code: string) => code.replace('ctx.route("splitter", "furnace-a")', 'ctx.route("splitter", ctx.tick % 2 ? "furnace-a" : "furnace-b")'),
  (code: string) => code.replace('// TODO: supply the press with coal.', 'ctx.dig("coal-mine")'),
  (code: string) => code.replace('ctx.dig("mine")', 'if (ctx.space("mine")) ctx.dig("mine")'),
]
async function replay(index: number, solved: boolean, build = true) {
  const level = levels[index]
  const layout: Layout = structuredClone(level.layout)
  if (build && index === 1) layout.links.push({ from: 'splitter', to: 'furnace-b' })
  if (build && index === 2) {
    layout.stations.push(...level.additions)
    layout.links.push({ from: 'coal-mine', to: 'press' })
  }
  const world = createWorld(level, layout)
  const program = await createProgram(solved ? fixes[index](level.starter) : level.starter)
  try {
    for (let t = 0; t < 240; t++) step(world, program.onTick)
    return world
  } finally { program.dispose() }
}
describe.each(levels.map((l, i) => ({ title: l.title, i })))('$title', ({ i }) => {
  test('ships the reference order with all checks green', async () => {
    expect(evaluate(await replay(i, true)).map(c => c.status)).toEqual(expect.arrayContaining(['pass']))
    expect(evaluate(await replay(i, true)).every(c => c.status === 'pass')).toBe(true)
  })
  test('the starter still needs a change to the handler', async () => {
    expect(evaluate(await replay(i, false)).every(c => c.status === 'pass')).toBe(false)
  })
})
test('missing splitter belt or coal supply prevents completion', async () => {
  for (const i of [1, 2]) expect(evaluate(await replay(i, true, false)).some(c => c.status !== 'pass')).toBe(true)
})
test('the same layout and controller replay identically', async () => {
  expect(await replay(1, true)).toEqual(await replay(1, true))
})
test('interrupts runaway handlers and reports the source file', async () => {
  const program = await createProgram('export function onTick() { while (true) {} }')
  try { expect(() => step(createWorld(levels[0]), program.onTick)).toThrow(/interrupted|time budget/i) }
  finally { program.dispose() }
})
test('runtime errors point to the original TypeScript line', async () => {
  const program = await createProgram('type X = number\n\nexport function onTick() {\n  throw new Error("jam")\n}')
  try { expect(() => step(createWorld(levels[0]), program.onTick)).toThrow(/controller.ts:4.*jam/) }
  finally { program.dispose() }
})
