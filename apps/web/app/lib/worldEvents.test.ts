import { acceptQuest, buyUpgrade, completeQuest, createWorld, kettlewick, questList, shopFor, stallTicks, syncBench, syncLathe, type World } from '@inherit/sim/v8'
import { expect, test } from 'vitest'
import { questCard } from './questNote'
import { grantHint } from './questStep'
import { worldEvents } from './worldEvents'

const bram = questList[0]!
const ines = questList.find(quest => quest.id === 'ines')!
const odile = questList.find(quest => quest.id === 'odile')!

test('taking Bram announces his why once', () => {
  const world = createWorld(kettlewick)
  const prev = structuredClone(world)
  expect(acceptQuest(world, kettlewick, bram.id)).toBe(true)
  expect(worldEvents(prev, world, questList, shopFor(world))).toEqual([
    { kind: 'npc', who: bram.who, name: bram.from, text: bram.why, key: 'taken:bram' },
  ])
  expect(worldEvents(world, structuredClone(world), questList, shopFor(world))).toEqual([])
})

function handOver(world: World, quest: typeof bram) {
  expect(acceptQuest(world, kettlewick, quest.id)).toBe(true)
  if (quest.id === bram.id) world.codedBatch = true
  const order = world.orders.find(item => item.id === quest.id)!
  order.shipped = order.qty
  const prev = structuredClone(world)
  expect(completeQuest(world, kettlewick)).toBe(true)
  return prev
}

function changes(prev: World | undefined, next: World) {
  return worldEvents(prev, next, questList, shopFor(next))
}

test('loading a save with Bram cleared and restarting at a lower tick are silent', () => {
  const world = createWorld(kettlewick)
  handOver(world, bram)
  expect(world.cleared).toContain(bram.id)
  expect(changes(undefined, structuredClone(world))).toEqual([])
  expect(changes(world, structuredClone(world))).toEqual([])
  const prev = structuredClone(world)
  prev.tick = 10
  expect(acceptQuest(world, kettlewick, ines.id)).toBe(true)
  expect(changes(prev, world)).toEqual([])
})

test('taking Ines announces the code job once alongside her usual Take events', () => {
  const world = createWorld(kettlewick)
  handOver(world, bram)
  const prev = structuredClone(world)
  expect(acceptQuest(world, kettlewick, ines.id)).toBe(true)
  expect(changes(prev, world).filter(event => event.key === 'code:ines')).toEqual([
    { kind: 'event', icon: 'unlock', key: 'code:ines', text: 'Run is unlocked. This job is done in code.' },
  ])
  expect(changes(world, structuredClone(world))).toEqual([])
})

test('taking Odile announces her why and the call from her unlock signature', () => {
  const world = createWorld(kettlewick)
  handOver(world, bram)
  handOver(world, ines)
  const prev = structuredClone(world)
  expect(acceptQuest(world, kettlewick, odile.id)).toBe(true)
  expect(changes(prev, world)).toEqual([
    { kind: 'npc', who: odile.who, name: odile.from.replace(/^Mayor /, ''), text: odile.why, key: 'taken:odile' },
    { kind: 'event', icon: 'unlock', text: 'New: ' + odile.unlock!.signature.split(':')[0], key: 'unlocked:odile' },
  ])
})

test('handing over Odile announces pay, change, level, press and second drone in order', () => {
  const world = createWorld(kettlewick)
  handOver(world, bram)
  handOver(world, ines)
  const prev = handOver(world, odile)
  expect(world.credits - prev.credits).toBe(odile.pay)
  expect(world.xp - prev.xp).toBe(odile.xp)
  expect(world.level).toBeGreaterThan(prev.level)
  expect(changes(prev, world)).toEqual([
    { kind: 'event', icon: 'coins', text: `+${odile.pay} credits · +${odile.xp} XP`, key: 'handed:odile' },
    { kind: 'npc', who: odile.who, name: odile.from.replace(/^Mayor /, ''), text: odile.change, key: 'change:odile' },
    { kind: 'event', icon: 'level', text: 'Level ' + world.level, key: 'level:' + world.level },
    { kind: 'event', icon: 'machine', text: 'Press installed', key: 'machine:press' },
    { kind: 'event', icon: 'drone', text: odile.gift + ' joined the works', key: 'drone:drone-2' },
  ])
})

test('handing over Ines announces the granted Loop hint after the level', () => {
  const world = createWorld(kettlewick)
  handOver(world, bram)
  const prev = handOver(world, ines)
  expect(ines.trigger).toBe('tick')
  expect(changes(prev, world).slice(-2)).toEqual([
    { kind: 'event', icon: 'level', key: 'level:' + world.level, text: 'Level ' + world.level },
    { kind: 'event', icon: 'unlock', key: 'trigger:ines', text: grantHint(ines.trigger) },
  ])
})

function checkChanges(prev: World, next: World) {
  return worldEvents(prev, next, questList, shopFor(next), {
    prev: questCard(prev, bram)!.tests, next: questCard(next, bram)!.tests,
  })
}

test('a passing check is announced once and the last passing check announces ready', () => {
  const world = createWorld(kettlewick)
  expect(acceptQuest(world, kettlewick, bram.id)).toBe(true)
  const prev = structuredClone(world)
  world.furnace.input = 1
  expect(checkChanges(prev, world)).toEqual([
    { kind: 'event', icon: 'check', key: 'passed:bram:ore', text: bram.tests[0]!.text },
  ])
  expect(checkChanges(world, structuredClone(world))).toEqual([])

  const partial = structuredClone(world)
  world.codedBatch = true
  world.orders[0]!.shipped = bram.qty
  const rows = questCard(world, bram)!.tests
  expect(checkChanges(partial, world)).toEqual([
    { kind: 'event', icon: 'check', key: 'passed:bram:ingot', text: bram.tests[1]!.text },
    { kind: 'event', icon: 'check', key: 'passed:bram:done', text: rows[2]!.text },
    { kind: 'event', icon: 'ready', key: 'ready:bram', text: 'Ready to hand over to ' + bram.from },
  ])
  expect(checkChanges(world, structuredClone(world))).toEqual([])
})

test('a newly failed check announces the reason from its quest card', () => {
  const world = createWorld(kettlewick)
  expect(acceptQuest(world, kettlewick, bram.id)).toBe(true)
  const prev = structuredClone(world)
  world.tick += stallTicks
  const rows = questCard(world, bram)!.tests
  expect(rows[0]!.reason).toBeTruthy()
  expect(checkChanges(prev, world)).toEqual(rows.map(row => ({
    kind: 'npc', who: bram.who, name: bram.from, text: row.reason, key: `stuck:bram:${row.id}:${row.reason}`,
  })))
  expect(checkChanges(world, structuredClone(world))).toEqual([])
})

test('buying the cart announces its catalog name once', () => {
  const world = createWorld(kettlewick)
  const cart = shopFor(world).find(item => item.id === 'cart')!
  world.credits = cart.price
  const prev = structuredClone(world)
  expect(buyUpgrade(world, cart.id)).toBe(true)
  expect(changes(prev, world)).toEqual([
    { kind: 'event', icon: 'coins', text: 'Bought ' + cart.name, key: 'bought:cart' },
  ])
  expect(changes(world, structuredClone(world))).toEqual([])
})

test('each hand-over keeps its own reward when two clears are observed together', () => {
  const world = createWorld(kettlewick)
  const prev = structuredClone(world)
  handOver(world, bram)
  handOver(world, ines)
  const rewards = changes(prev, world).filter(event => event.key.startsWith('handed:'))
  expect(rewards.map(event => event.text)).toEqual([
    `+${bram.pay} credits · +${bram.xp} XP`,
    `+${ines.pay} credits · +${ines.xp} XP`,
  ])
})

test('new machines are announced once, including when the saved machine field was missing', () => {
  const world = createWorld(kettlewick)
  handOver(world, bram)
  handOver(world, ines)
  handOver(world, odile)
  const spare = shopFor(world).find(item => item.id === 'spare')!
  world.credits = spare.price
  const prev = structuredClone(world)
  Reflect.deleteProperty(prev, 'bench')
  world.cleared.push('harrow', 'tomas')
  syncLathe(world)
  syncBench(world)
  expect(buyUpgrade(world, spare.id)).toBe(true)
  const installed = changes(prev, world).filter(event => event.kind === 'event' && event.icon === 'machine')
  expect(installed.map(event => event.text)).toEqual(['Lathe installed', 'Assembly table installed', 'Spare press installed'])
  expect(changes(world, structuredClone(world))).toEqual([])
})
