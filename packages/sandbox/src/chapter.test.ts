import { describe, expect, test } from 'vitest'
import { createWorld, evaluate, levels, step, type Layout } from '@inherit/sim'
import { solutions } from '../../../tests/chapter-controllers'
import { createProgram } from './index'

async function replay(index: number, source: string, build = true, ticks = 240) {
  const level = levels[index]
  const layout: Layout = structuredClone(level.layout)
  if (build && index === 1) layout.links.push({ from: 'splitter', to: 'furnace-b' })
  if (build && index === 2) {
    layout.stations.push(...level.additions)
    layout.links.push({ from: 'coal-mine', to: 'press' })
  }
  const world = createWorld(level, layout)
  const program = await createProgram(source)
  try {
    for (let t = 0; t < ticks; t++) {
      step(world, program.onTick)
      if (evaluate(world).every((c) => c.status === 'pass')) break
    }
    return world
  } finally {
    program.dispose()
  }
}
describe.each(levels.map((l, i) => ({ title: l.title, i })))('$title', ({ i }) => {
  test('ships the reference order with all checks green', async () => {
    expect(evaluate(await replay(i, solutions[i])).every((c) => c.status === 'pass')).toBe(true)
  })
  test('the starter still needs a change to the handler', async () => {
    expect(evaluate(await replay(i, levels[i].starter, false)).some((c) => c.status !== 'pass')).toBe(true)
    if (i === 1 || i === 2) {
      expect(evaluate(await replay(i, levels[i].starter)).some((c) => c.status !== 'pass')).toBe(true)
    }
  })
})
test('alternating between unequal furnaces leaves the rail order below its shipping rate', async () => {
  const naive = levels[1].starter.replace(
    '"splitter", "furnace-a"',
    '"splitter", ctx.tick % 2 ? "furnace-a" : "furnace-b"',
  )
  const world = await replay(1, naive)
  expect(evaluate(world).find((c) => c.label === 'Load the rail wagons')?.status).toBe('fail')
})
test('the press operator can see which ingredient is missing', async () => {
  const world = await replay(2, levels[2].starter, false)
  expect(evaluate(world)).toContainEqual({
    label: 'Get coal to the press',
    status: 'fail',
    value: '0/1 coal',
  })
})
test('digging into a full belt spills ore even though the truck keeps collecting', async () => {
  const world = await replay(3, levels[3].starter)
  expect(world.shipped).toBeGreaterThanOrEqual(levels[3].order)
  expect(world.lost).toBeGreaterThan(0)
  expect(evaluate(world)).toContainEqual({
    label: 'Keep material on the belts',
    status: 'fail',
    value: world.lost + ' lost / 0 allowed',
  })
})
test('missing splitter belt or coal supply prevents completion', async () => {
  for (const i of [1, 2])
    expect(evaluate(await replay(i, solutions[i], false)).some((c) => c.status !== 'pass')).toBe(true)
})
test('the last pickup accepts a complete twelve-sack order on tick 128', async () => {
  const world = await replay(4, solutions[4])
  expect(world.shipped).toBe(12)
  expect(world.tick).toBe(128)
  expect(world.lost).toBe(0)
  expect(world.machines.find((m) => m.kind === 'coal')?.processed).toBe(12)
})
test('a counter reset on each tick overspends even with a lossless shipment', async () => {
  const forgetful = solutions[4]
    .replace('let sacks = 0', '')
    .replace('  if (ctx.space("mine"))', '  let sacks = 0\n  if (ctx.space("mine"))')
  const world = await replay(4, forgetful)
  expect(world.shipped).toBe(12)
  expect(world.lost).toBe(0)
  expect(
    evaluate(world)
      .filter((c) => c.status !== 'pass')
      .map((c) => c.label),
  ).toEqual(['Stay within the coal allowance'])
})
test('missing the last pickup leaves the undelivered parts at the dock', async () => {
  const late = solutions[4].replace(
    '  if (ctx.space("mine"))',
    '  if (ctx.tick <= 8) return\n  if (ctx.space("mine"))',
  )
  const before = await replay(4, late, true, 127)
  expect(evaluate(before).at(-1)).toMatchObject({ status: 'warn', value: '10/12 parts · tick 127/128' })
  const after = await replay(4, late)
  expect(after.shipped).toBe(11)
  expect(evaluate(after).at(-1)).toMatchObject({ status: 'fail', label: 'Last truck left. Run to retry' })
})
test('one furnace cannot supply the lock crew before the last truck', async () => {
  const world = await replay(4, solutions[4].replace('a <= b ? "furnace-a" : "furnace-b"', '"furnace-a"'))
  expect(world.shipped).toBeLessThan(12)
  expect(evaluate(world).at(-1)?.status).toBe('fail')
})
test.each([1, 4])('a fresh controller replays level %i identically', async (i) => {
  expect(await replay(i, solutions[i])).toEqual(await replay(i, solutions[i]))
})
test('interrupts runaway handlers and reports the source file', async () => {
  const program = await createProgram('export function onTick() { while (true) {} }')
  try {
    expect(() => step(createWorld(levels[0]), program.onTick)).toThrow(/interrupted|time budget/i)
  } finally {
    program.dispose()
  }
})
test('runtime errors point to the original TypeScript line', async () => {
  const program = await createProgram(
    'type X = number\n\nexport function onTick() {\n  throw new Error("jam")\n}',
  )
  try {
    expect(() => step(createWorld(levels[0]), program.onTick)).toThrow(/controller.ts:4.*jam/)
  } finally {
    program.dispose()
  }
})
