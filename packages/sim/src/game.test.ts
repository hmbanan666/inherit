import { expect, test } from 'vitest'
import { advanceGame, createCampaign, getSurface, loadSave, serializeSave } from './index'

test('wrong ore jams the iron furnace until the controller dumps the bin', () => {
  const c = createCampaign()
  c.town.beat = 4
  const furnace = c.world.machines[1]
  furnace.queue = [{ kind: 'copper-ore' }]
  advanceGame(c, (ctx) => {
    expect(ctx.work('furnace')).toBe(false)
  })
  expect(furnace.fault).toBe('jammed')
  const restored = loadSave(serializeSave(c))
  advanceGame(restored, (ctx) => {
    expect(ctx.inspect!('furnace')?.status).toBe('jammed')
    expect(ctx.clear!('furnace')).toBe(true)
    expect(ctx.clear!('furnace')).toBe(false)
  })
  expect(restored.world.lost).toBe(1)
  expect(restored.world.machines[1].queue).toEqual([])
})
test.each([false, true])('a broken furnace cools on schedule, paid repair %s', (repair) => {
  const c = createCampaign(47)
  c.town.beat = 7
  const furnace = c.world.machines[1]
  while (c.world.tick < 400 && furnace.fault !== 'broken')
    advanceGame(c, (ctx) => {
      furnace.queue = [{ kind: 'iron-ore' }]
      ctx.connect!('furnace', 'cart')
      ctx.work('furnace')
    })
  expect(furnace.fault).toBe('broken')
  const money = c.economy.money,
    brokenAt = c.world.tick
  advanceGame(c, (ctx) => {
    if (repair) {
      expect(ctx.repair!('furnace')).toBe(true)
      expect(ctx.repair!('furnace')).toBe(false)
    }
  })
  while (furnace.fault === 'broken' && c.world.tick <= brokenAt + 240) advanceGame(c, () => {})
  expect(c.world.tick - brokenAt).toBe(repair ? 13 : 240)
  expect(c.economy.money).toBe(money - (repair ? 5 : 0))
})
test('story opens the filing cabinet and the event handlers', () => {
  const c = createCampaign()
  expect(getSurface(c)).toMatchObject({ multiFile: false, events: [] })
  expect(getSurface(c).methods).not.toContain('dispatch')
  c.town.beat = 9
  expect(getSurface(c)).toMatchObject({ multiFile: true, events: ['onItemArrived', 'onMachineIdle'] })
})

test('Uncle leaves only a comment for the first shift', () => {
  const c = createCampaign()
  const lines = c.project.working['main.ts'].trim().split('\n')
  expect(lines.every(line => line.startsWith('//'))).toBe(true)
  expect(lines.join(' ')).toContain('Uncle')
  expect(c.project.deployed).toEqual(c.project.working)
})
