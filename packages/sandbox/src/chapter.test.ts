import { describe, expect, test } from 'vitest'
import { createWorld, evaluate, levels, step, type Layout } from '@inherit/sim'
import { solutions } from '../../../tests/chapter-controllers'
import { createProgram } from './index'

async function replay(index: number, source: string, build = true) {
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
    for (let t = 0; t < 240; t++) {
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
    expect(evaluate(await replay(i, levels[i].starter)).every((c) => c.status === 'pass')).toBe(false)
  })
})
test('alternating between unequal furnaces leaves the rail order below its shipping rate', async () => {
  const naive = levels[1].starter.replace('"splitter", "furnace-a"', '"splitter", ctx.tick % 2 ? "furnace-a" : "furnace-b"')
  const world = await replay(1, naive)
  expect(evaluate(world).find((c) => c.label === 'Load the rail wagons')?.status).toBe('fail')
})
test('the press operator can see which ingredient is missing', async () => {
  const world = await replay(2, levels[2].starter, false)
  expect(evaluate(world)).toContainEqual({ label: 'Get coal to the press', status: 'fail', value: '0/1 coal' })
})
test('digging into a full belt spills ore even though the truck keeps collecting', async () => {
  const world = await replay(3, levels[3].starter)
  expect(world.shipped).toBeGreaterThanOrEqual(levels[3].order)
  expect(world.lost).toBeGreaterThan(0)
  expect(evaluate(world)).toContainEqual({
    label: 'Keep material on the belts', status: 'fail', value: world.lost + ' lost / 0 allowed',
  })
})
test('missing splitter belt or coal supply prevents completion', async () => {
  for (const i of [1, 2])
    expect(evaluate(await replay(i, solutions[i], false)).some((c) => c.status !== 'pass')).toBe(true)
})
test('the same layout and controller replay identically', async () => {
  expect(await replay(1, solutions[1])).toEqual(await replay(1, solutions[1]))
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
