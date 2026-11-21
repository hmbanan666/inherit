import { expect, test } from 'vitest'
import { advanceGame, createCampaign, jumpToStep, primitiveTick, getSurface, loadSave, serializeSave } from './index'

test('the mixed rock can be rescued, even after reloading a jam', () => {
  let c = createCampaign()
  c.economy.money = 100
  c.town.beat = 4
  const f = c.world.machines[1]
  f.queue.push({ kind: 'iron-ore' })
  c.world.machines[0].output = { kind: 'copper-ore' }
  advanceGame(c, (api) => {
    expect(api.buy('furnace', 'copper')).toBe(true)
    api.take('mine')
    expect(api.put('furnace')).toBe(true)
  })
  c = loadSave(serializeSave(c))
  advanceGame(c, (api) => {
    expect(api.look('furnace').status).toBe('jammed')
    expect(api.take('furnace')).toBe('copper-ore')
  })
  advanceGame(c, (api) => {
    api.take('furnace')
    expect(api.put('copper')).toBe(true)
  })
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
test('Uncle supplies the import and the only player file is main.ts', () => {
  const c = createCampaign()
  expect(Object.keys(c.project.working)).toEqual(['main.ts'])
  expect(c.project.working['main.ts'].trim().split('\n')).toEqual([
    "// Uncle's workshop. His arm can take from a place and put into a place.",
    'import { take, put } from "inherit"',
  ])
  expect(getSurface(c).multiFile).toBe(false)
})

test('optional machines leave enough money and free names for the chapter', () => {
  const c = jumpToStep(createCampaign(), 'elsie-press')
  const run = primitiveTick(c, 'deploy')
  expect(run.api.buy('press', 'copper')).toBe(false)
  expect(run.api.buy('press', 'extra')).toBe(true)
  expect(run.api.buy('press', 'another')).toBe(false)
  expect(run.api.buy('press')).toBe(true)
  expect(c.economy.money).toBe(8)
})
