import { expect, test } from 'vitest'
import { advanceGame, createCampaign, getSurface, loadSave, serializeSave } from './index'

test('the workshop opens as Code and grows when the player changes the factory and town', () => {
  const c = createCampaign()
  const surface = () => getSurface(c)
  expect(surface()).toMatchObject({ sections: ['code'], showMoney: false })
  c.progress.signals.printedTick = true
  expect(surface().sections).toEqual(['code'])
  advanceGame(c, ctx => ctx.dig('mine'))
  expect(surface()).toMatchObject({ sections: ['code', 'factory'], showMoney: false })
  for (let i = 0; i < 100 && c.town.beat === 1; i++) advanceGame(c, ctx => {
    ctx.connect('mine', 'furnace')
    ctx.connect('furnace', 'cart')
    ctx.dig('mine')
    ctx.work('furnace')
  })
  expect(c.town.beat).toBe(2)
  expect(surface()).toMatchObject({ sections: ['code', 'factory', 'town', 'inbox', 'orders'], showMoney: true })
  c.economy.orders = []
  c.town.nextOrders.bram = c.world.tick + 400
  const old = JSON.parse(serializeSave(c))
  delete old.seenSections
  const restored = loadSave(old)
  expect(getSurface(restored).sections).toEqual(['code', 'factory', 'town', 'inbox', 'orders'])
  expect(restored.seenSections).toEqual(['code'])
  restored.seenSections.push('town')
  expect(loadSave(serializeSave(restored)).seenSections).toEqual(['code', 'town'])
})

test('Town, Inbox and Orders each need their own story event', () => {
  const c = createCampaign()
  c.town.beat = 2
  expect(getSurface(c).sections).toEqual(['code', 'factory'])
  c.town.changes.push({ buildingId: 'forge', text: 'The forge lights up.', tick: 10 })
  expect(getSurface(c).sections).toEqual(['code', 'factory', 'town'])
  c.progress.messages.push({ ...c.progress.messages[0], id: 'tab', from: 'Mrs Harrow' })
  expect(getSurface(c).sections).toEqual(['code', 'factory', 'town', 'inbox'])
})
