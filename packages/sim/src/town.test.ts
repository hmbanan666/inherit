import { expect, test } from 'vitest'
import { advanceGame, createCampaign, DAY } from './index'

test('idle income ends at the current order budget and stock fills the next matching ask first', () => {
  const c = createCampaign()
  c.town.beat = 2
  advanceGame(c)
  expect(c.economy.orders).toHaveLength(0)
  c.lesson.released.push({ kind: 'section', id: 'orders' })
  const start = c.economy.money
  for (let i = 0; i < 2 * DAY; i++)
    advanceGame(c, (api) => {
      api.take('mine')
      api.put('furnace')
      api.take('furnace')
      api.put('cart')
    })
  expect(c.economy.money - start).toBe(12)
  expect(c.economy.orders).toHaveLength(0)
  expect(c.town.waiting['iron-ingot']).toBeGreaterThan(100)
  c.world.machines[1].output = { kind: 'plate' }
  advanceGame(c, (api) => {
    api.take('furnace')
    api.put('cart')
  })
  c.town.beat = 3
  c.town.wired = true
  advanceGame(c, (api) => {
    expect(api.look('cart').waiting?.plate).toBe(1)
    expect(api.look('cart').wanted).toContain('plate')
  })
  expect(c.town.filled).toBe(1)
  expect(c.town.waiting.plate).toBeUndefined()
})
