import { expect, test } from 'vitest'
import { advanceGame, createCampaign, getSurface, loadSave, serializeSave } from './index'

test('the mixed rock can be rescued, even after reloading a jam', () => {
  let c = createCampaign()
  c.economy.money = 100
  c.town.beat = 4
  const f = c.world.machines[1]
  f.queue.push({ kind: 'iron-ore' })
  c.world.machines[0].output = { kind: 'copper-ore' }
  advanceGame(c, (api) => {
    expect(api.buy('furnace', 'copper')).toBe(true)
    expect(api.put('furnace', api.take('mine'))).toBe(true)
  })
  c = loadSave(serializeSave(c))
  advanceGame(c, (api) => {
    expect(api.look('furnace').status).toBe('jammed')
    expect(api.take('furnace')).toBe('copper-ore')
  })
  advanceGame(c, (api) => expect(api.put('copper', api.take('furnace'))).toBe(true))
  expect(c.world.lost).toBe(0)
  expect(c.world.machines[1].fault).toBeUndefined()
})
test('buy charges once per name and machine kinds unlock with the story', () => {
  const c = createCampaign()
  c.economy.money = 100
  advanceGame(c, (api) => expect(api.buy('press')).toBe(false))
  c.town.beat = 3
  advanceGame(c, (api) => {
    expect(api.buy('cutter')).toBe(false)
    expect(api.buy('press')).toBe(true)
    expect(api.buy('press')).toBe(true)
  })
  expect(c.economy.money).toBe(72)
})
test('Uncle leaves a comment and an unlocked multi-file project', () => {
  const c = createCampaign()
  expect(
    c.project.working['main.ts']
      .trim()
      .split('\n')
      .every((line) => line.startsWith('//')),
  ).toBe(true)
  expect(getSurface(c).multiFile).toBe(true)
})
