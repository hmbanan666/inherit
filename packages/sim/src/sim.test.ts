import { expect, test } from 'vitest'
import { createWorld, step, levels } from './index'

test('ore travels on the belt before reaching the furnace', () => {
  const world = createWorld(levels[0])
  step(world, (ctx) => ctx.dig('mine'))
  expect(world.belts[0].items).toHaveLength(1)
  expect(world.machines.find((m) => m.id === 'furnace-a')?.queue).toEqual([])
  for (let i = 0; i < 5; i++) step(world, () => {})
  expect(world.machines.find((m) => m.id === 'furnace-a')?.queue).toEqual(['ore'])
})
