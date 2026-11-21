import { expect, test } from 'vitest'
import { advanceGame, createCampaign, townSnapshot, DAY, loadSave, serializeSave } from './index'

test('Bram pays in full for the mail horse and a regular order after long breaks', () => {
  const c = createCampaign()
  expect(c.world.belts).toHaveLength(0)
  expect(townSnapshot(c).people.find((p) => p.id === 'bram')?.ask?.items).toEqual({ 'iron-ingot': 3 })
  const money = c.economy.money
  const deliver = () =>
    advanceGame(c, (ctx) => {
      ctx.connect!('mine', 'furnace')
      ctx.connect!('furnace', 'cart')
      ctx.dig('mine')
      ctx.work('furnace')
    })
  const wait = () => {
    for (let i = 0; i < 12 * DAY; i++) advanceGame(c, () => {})
  }
  wait()
  while (c.world.tick < 13 * DAY && c.town.beat === 1) deliver()
  expect(c.economy.money).toBe(money + 50)
  expect(townSnapshot(c).buildings.find((b) => b.id === 'forge')?.state).toBe('working')
  expect(townSnapshot(c).debt.next).toEqual({ amount: 100 })
  const order = c.economy.orders[0]
  wait()
  advanceGame(c, (ctx) => {
    expect(ctx.orders!()).toEqual([{ id: order.id, who: 'bram', items: order.items, filled: order.filled }])
  })
  expect(townSnapshot(c).people.find((p) => p.id === 'bram')?.mood).toBe('waiting')
  const resumeAt = c.world.tick
  while (c.world.tick < resumeAt + DAY && c.economy.orders.includes(order)) deliver()
  expect(townSnapshot(c).people.find((p) => p.id === 'bram')?.mood).toBe('happy')
  expect(c.economy.money).toBe(money + 50 + 12)
  expect(townSnapshot(c).debt.owed).toBe(600)
})

test('the mixed vein replays the same stream of iron and copper after reload', () => {
  const initial = createCampaign(309)
  initial.town.beat = 4
  const take = (c: typeof initial, n: number) => {
    const kinds: string[] = []
    for (let i = 0; i < n; i++)
      advanceGame(c, (ctx) => {
        ctx.connect!('mine', 'cart')
        ctx.dig('mine')
        kinds.push(c.world.belts[0].items.at(-1)!.kind)
      })
    return kinds
  }
  take(initial, 60)
  const restored = loadSave(serializeSave(initial))
  const kinds = take(initial, 600)
  expect(take(restored, 600)).toEqual(kinds)
  const copper = kinds.filter((k) => k === 'copper-ore').length
  expect(copper).toBeGreaterThan(150)
  expect(copper).toBeLessThan(250)
})
