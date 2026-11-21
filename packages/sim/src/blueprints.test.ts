import { expect, test } from 'vitest'
import { createCampaign, advanceGame } from './index'

test('named machines charge once, respect story unlocks and report failed purchases', () => {
  const c = createCampaign()
  advanceGame(c, (ctx) => {
    expect(ctx.build!('press')).toBeUndefined()
    expect(ctx.lastError!()).toContain('locked')
    expect(ctx.build!('furnace', { name: 'oven', x: 0, y: 0 })).toBe('oven')
    expect(ctx.build!('furnace', { name: 'oven' })).toBe('oven')
    expect(c.economy.money).toBe(76)
    expect(ctx.build!('furnace', { name: 'another', x: 0, y: 0 })).toBeUndefined()
    expect(ctx.connect!('mine', 'oven')).toBe(true)
    expect(ctx.connect!('mine', 'oven')).toBe(true)
    expect(ctx.connect!('mine', 'missing')).toBe(false)
    expect(c.world.belts.map((b) => b.to)).toEqual(['oven'])
    c.economy.money = 0
    expect(ctx.build!('furnace', { name: 'another' })).toBeUndefined()
    expect(ctx.lastError!()).toMatch(/coins/)
    expect(ctx.build!('furnace', { name: 'oven' })).toBe('oven')
  })
})
