import { expect, test } from 'vitest'
import {
  createCampaign,
  getSurface,
  purchaseMachine,
  purchaseBelt,
  sellBelt,
  research,
  purchasePlot,
  purchaseRoad,
  PRICES,
} from './index'

test('research licenses equipment and the shop charges the actual belt path once', () => {
  const c = createCampaign()
  c.economy.money = 100
  expect(getSurface(c).machines).not.toContain('assembler')
  expect(purchaseMachine(c, 'sorter', 'shed', 0, 1)).toBeUndefined()
  expect(research(c, 'quality')).toBe(false)
  const furnace = purchaseMachine(c, 'furnace', 'shed', 4, 3)!
  const before = c.economy.money
  const belt = purchaseBelt(c, furnace.id, 'cart')!
  expect(belt.paid).toBe(belt.path.length * 2)
  expect(c.economy.money).toBe(before - belt.paid)
  expect(sellBelt(c, furnace.id, 'cart')).toBe(true)
  expect(sellBelt(c, furnace.id, 'cart')).toBe(false)
  expect(c.economy.money).toBe(before)
})

test('land, mineral claims and the road have separate licenses and cash prices', () => {
  const c = createCampaign()
  c.economy.money = 100
  c.economy.researchPoints = 80
  expect(purchasePlot(c, 'shed', 'east-lot')).toBe(false)
  expect(research(c, 'survey')).toBe(true)
  expect(purchasePlot(c, 'shed', 'east-lot')).toBe(true)
  expect(c.economy.money).toBe(100 - PRICES.plots['east-lot'])
  expect(purchaseMachine(c, 'miner', 'shed', 9, 2)).toBeUndefined()
  expect(research(c, 'copper')).toBe(true)
  expect(purchaseMachine(c, 'miner', 'shed', 9, 2)).toBeTruthy()
  expect(purchaseMachine(c, 'furnace', 'shed', 10, 2)).toBeUndefined()
  expect(purchaseMachine(c, 'miner', 'yard', 4, 2)).toBeUndefined()
  for (const id of ['bins', 'fork', 'press', 'cutter', 'recipes', 'assembly', 'road'])
    expect(research(c, id)).toBe(true)
  expect(purchaseRoad(c)).toBe(false)
  c.economy.money = PRICES.road + PRICES.machines.miner
  expect(purchaseRoad(c)).toBe(true)
  expect(purchaseRoad(c)).toBe(false)
  expect(purchaseMachine(c, 'miner', 'yard', 4, 2)).toBeTruthy()
  expect(c.economy.money).toBe(0)
})
