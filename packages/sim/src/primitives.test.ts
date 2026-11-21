import { expect, test } from 'vitest'
import { advanceGame, createCampaign } from './index'

test('a failed put returns the rock, then the furnace makes an ingot without another call', () => {
  const c = createCampaign()
  advanceGame(c, (api) => {
    const rock = api.take('mine')
    expect(rock).toBe('iron-ore')
    expect(api.put('missing', rock)).toBe(false)
  })
  advanceGame(c, (api) => {
    const rock = api.take('mine')
    expect(api.put('furnace', rock)).toBe(true)
    expect(api.put('cart', rock)).toBe(false)
  })
  for (let i = 0; i < 8; i++) advanceGame(c, () => {})
  advanceGame(c, (api) => expect(api.look('furnace').ready).toBe('iron-ingot'))
  expect(c.world.lost).toBe(0)
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
  advanceGame(c, (api) => api.buy(kind))
  for (const input of inputs) {
    c.world.machines[0].output = { kind: input }
    advanceGame(c, (api) => expect(api.put(kind, api.take('mine'))).toBe(true))
  }
  for (let i = 0; i < 20; i++) advanceGame(c, () => {})
  advanceGame(c, (api) => expect(api.take(kind)).toBe(product))
  advanceGame(c, (api) => expect(api.take(kind)).toBe(product))
})

test('an unfinished gear leaves the cutter free to draw copper wire', () => {
  const c = createCampaign()
  c.town.beat = 5
  c.economy.money = 26
  advanceGame(c, (api) => api.buy('cutter'))
  for (const item of ['plate', 'copper-ingot'] as const) {
    c.world.machines[0].output = { kind: item }
    advanceGame(c, (api) => api.put('cutter', api.take('mine')))
  }
  for (let i = 0; i < 8; i++) advanceGame(c, () => {})
  advanceGame(c, (api) => expect(api.look('cutter')).toMatchObject({ inside: ['plate'], ready: 'wire' }))
})
