import { expect, test } from 'vitest'
import { advanceGame, createCampaign, townSnapshot, loadSave, serializeSave } from './index'

test('three ingots from a newly connected shed bring Bram and the mail horse back to the forge', () => {
  const c = createCampaign()
  expect(c.world.belts).toHaveLength(0)
  expect(townSnapshot(c).people.find((p) => p.id === 'bram')?.ask?.items).toEqual({ 'iron-ingot': 3 })
  for (let i = 0; i < 40; i++)
    advanceGame(c, (ctx) => {
      ctx.connect!('mine', 'furnace')
      ctx.connect!('furnace', 'cart')
      ctx.dig('mine')
      ctx.work('furnace')
    })
  expect(townSnapshot(c).buildings.find((b) => b.id === 'forge')?.state).toBe('working')
  expect(townSnapshot(c).debt.next).toMatchObject({ amount: 100, dueDay: 3 })
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
