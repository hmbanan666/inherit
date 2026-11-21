import { expect, test } from 'vitest'
import { advanceGame, createCampaign, primitiveTick } from './index'

test('a watched hand holds one item across runs, explains mistakes and gives the item back before replay', () => {
  const c = createCampaign()
  const run = primitiveTick(c, 'run')
  expect(run.api.take('mines')).toBeUndefined()
  expect(run.calls[0].message).toBe('There is no place called "mines". Places: mine, furnace, cart.')
  expect(run.api.put('cart')).toBe(false)
  expect(run.api.take('mine')).toBe('iron-ore')
  expect(run.api.take('mine')).toBeUndefined()
  expect(run.api.put('mines')).toBe(false)
  run.finish()
  expect(run.calls.map((x) => x.hand)).toEqual([null, null, 'iron-ore', 'iron-ore', 'iron-ore'])
  const next = primitiveTick(c, 'run')
  expect(next.api.take('mine')).toBe('iron-ore')
  expect(next.api.put('furnace')).toBe(true)
  expect(next.api.take('furnace')).toBeUndefined()
  expect(next.calls.at(-1)?.message).toMatch(/nothing ready yet/i)
  next.finish()
  expect(c.world.hand).toBeUndefined()
})
test.each([
  ['furnace', ['iron-ore'], 'iron-ingot'],
  ['furnace', ['copper-ore'], 'copper-ingot'],
  ['press', ['iron-ingot'], 'plate'],
  ['press', ['copper-ingot'], 'plate'],
  ['cutter', ['copper-ingot'], 'wire'],
  ['cutter', ['plate', 'plate'], 'gear'],
  ['assembler', ['wire', 'plate'], 'bracket'],
] as const)('%s automatically processes %j and holds %s for collection', (kind, inputs, product) => {
  const c = createCampaign()
  c.town.beat = 9
  c.economy.money = 100
  const target = kind === 'furnace' && product === 'copper-ingot' ? 'copper' : kind
  advanceGame(c, (api) => api.buy(kind, target))
  for (const input of inputs) {
    c.world.machines[0].output = { kind: input }
    advanceGame(c, (api) => {
      api.take('mine')
      expect(api.put(target)).toBe(true)
    })
  }
  for (let i = 0; i < 20; i++) advanceGame(c, () => {})
  advanceGame(c, (api) => expect(api.take(target)).toBe(product))
  advanceGame(c, (api) => expect(api.take(target)).toBe(product))
})

test('an unfinished gear leaves the cutter free to draw copper wire', () => {
  const c = createCampaign()
  c.town.beat = 5
  c.economy.money = 26
  advanceGame(c, (api) => api.buy('cutter'))
  for (const item of ['plate', 'copper-ingot'] as const) {
    c.world.machines[0].output = { kind: item }
    advanceGame(c, (api) => {
      api.take('mine')
      api.put('cutter')
    })
  }
  for (let i = 0; i < 8; i++) advanceGame(c, () => {})
  advanceGame(c, (api) => expect(api.look('cutter')).toMatchObject({ inside: ['plate'], ready: 'wire' }))
})
