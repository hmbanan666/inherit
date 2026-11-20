import { expect, test } from 'vitest'
import { createWorld, levels, step, type Factory, type World } from './index'

function shift(world: World, ticks: number, handler: (ctx: Factory) => void) {
  for (let t = 0; t < ticks; t++) step(world, handler)
}
test('a furnace requires an instruction and four ticks of work to make one ingot', () => {
  const world = createWorld(levels[0])
  shift(world, 10, (ctx) => {
    if (ctx.tick === 1) ctx.dig('mine')
  })
  const furnace = world.machines.find((m) => m.id === 'furnace-a')!
  expect(furnace.status).toBe('ready')
  shift(world, 3, (ctx) => ctx.work('furnace-a'))
  expect(furnace.processed).toBe(0)
  step(world, (ctx) => ctx.work('furnace-a'))
  expect(world.belts.find((b) => b.to === 'dock')?.items.map((i) => i.kind)).toEqual(['ingot'])
})
test('a splitter keeps ore until its chosen output is connected', () => {
  const world = createWorld(levels[1])
  shift(world, 10, (ctx) => {
    if (ctx.tick === 1) ctx.dig('mine')
    ctx.route('splitter', 'furnace-b')
  })
  expect(world.machines.find((m) => m.id === 'splitter')?.queue).toEqual(['ore'])
  step(world, (ctx) => ctx.route('splitter', 'furnace-a'))
  expect(world.belts.find((b) => b.from === 'splitter')?.items[0]?.kind).toBe('ore')
})
test('the press holds an ingot until it also receives coal', () => {
  const level = levels[2]
  const layout = structuredClone(level.layout)
  layout.stations.push(...level.additions)
  layout.links.push({ from: 'coal-mine', to: 'press' })
  const world = createWorld(level, layout)
  shift(world, 25, (ctx) => {
    if (ctx.tick === 1) ctx.dig('mine')
    ctx.work('furnace-a')
    ctx.work('press')
  })
  const press = world.machines.find((m) => m.id === 'press')!
  expect(press.queue).toEqual(['ingot'])
  expect(press.status).toBe('starved')
  step(world, (ctx) => ctx.dig('coal-mine'))
  shift(world, 20, (ctx) => ctx.work('press'))
  expect(press.queue).toEqual([])
  expect(world.shipped).toBe(1)
})
