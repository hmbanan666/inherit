import { acceptQuest, createWorld, kettlewick, migrateWorld, questList } from '@inherit/sim/v8'
import { questCard } from './questNote'
import { expect, test } from 'vitest'
import { emptyToasts, expireToasts, pushToasts } from './toasts'
import { questLog, questObjectives, questTabNotice, welcomeToast, xpProgress, xpRing } from './shellBar'

test('the account keeps the level bar labels and width at each part of the curve', () => {
  expect(xpProgress(0)).toEqual({ level: 1, fraction: 0, width: '0%', label: 'XP 0/10', title: 'Level 1. 0 / 10 XP.' })
  expect(xpProgress(32)).toEqual({ level: 3, fraction: 0.6, width: '60%', label: 'XP 12/20', title: 'Level 3. 12 / 20 XP.' })
  expect(xpProgress(140)).toEqual({ level: 6, fraction: 0, width: '0%', label: 'XP 0/30', title: 'Level 6. 0 / 30 XP.' })
  expect(xpProgress(180)).toEqual({ level: 7, fraction: 1, width: '100%', label: 'XP 180', title: 'Level 7. 180 XP.' })
})

test('the ring offsets a full circumference at zero and none at full XP', () => {
  const ring = xpRing(0.25, 10)
  expect(ring.circumference).toBeCloseTo(62.83185)
  expect(ring.dashArray).toBe(ring.circumference)
  expect(ring.dashOffset).toBeCloseTo(47.12389)
  for (const empty of [-1, 0]) expect(xpRing(empty, 10).dashOffset).toBeCloseTo(62.83185)
  for (const full of [1, 2]) expect(xpRing(full, 10).dashOffset).toBe(0)
})

test('the first visit names the available villager and gives the player seven seconds once', () => {
  const welcome = welcomeToast({ cleared: [] }, 'Talk to Ines')!
  expect(welcome).toEqual({ key: 'welcome', kind: 'event', icon: 'talk', text: 'Talk to Ines. Click the gold ! next to the house.' })
  const seen = new Set<string>()
  const list = pushToasts(emptyToasts(), [welcome], 0, seen)
  expect(expireToasts(list, 6999).visible).toHaveLength(1)
  const expired = expireToasts(list, 7000)
  expect(expired.visible).toHaveLength(0)
  expect(pushToasts(expired, [welcome], 7100, seen).visible).toHaveLength(0)
})

test('an open quest, a past hand-over or the end of the chain needs no welcome', () => {
  expect(welcomeToast({ questId: 'bram', cleared: [] }, 'Talk to Bram')).toBeUndefined()
  expect(welcomeToast({ cleared: ['bram'] }, 'Talk to Ines')).toBeUndefined()
  expect(welcomeToast({ cleared: [] }, 'More is coming.')).toBeUndefined()
})

function take(id: string) {
  const world = createWorld(kettlewick)
  const index = questList.findIndex(quest => quest.id === id)
  const quest = questList[index]!
  world.cleared = questList.slice(0, index).map(previous => previous.id)
  world.level = quest.needLevel
  expect(acceptQuest(world, kettlewick, id)).toBe(true)
  return { quest, world, order: world.orders[0]! }
}

test('the Quest tab announces a ready hand-over only from another tab', () => {
  expect(questTabNotice('quest', true)).toBeUndefined()
  for (const side of ['tests', 'console'] as const) {
    expect(questTabNotice(side, false)).toBeUndefined()
    expect(questTabNotice(side, true)).toBe('Quest, ready to hand over')
  }
})

test('a single delivery shows its goods and clamps both ends of the count', () => {
  const { quest, world, order } = take('bram')
  order.shipped = -1
  expect(questObjectives(questCard(world, quest)!)).toEqual([
    { id: 'ingot', text: 'Deliver ingot', count: '0/1', done: false },
  ])
  order.shipped = 3
  expect(questObjectives(questCard(world, quest)!)).toEqual([
    { id: 'ingot', text: 'Deliver ingot', count: '1/1', done: true },
  ])
})

test('Harrow’s plate and blank have separate checkboxes without giver or test text', () => {
  const { quest, world, order } = take('harrow')
  order.lines![0]!.shipped = 1
  const card = questCard(world, quest)!
  const objectives = questObjectives(card)
  expect(objectives).toEqual([
    { id: 'plate', text: 'Deliver plate', count: '1/1', done: true },
    { id: 'blank', text: 'Deliver blank', count: '0/1', done: false },
  ])
  for (const row of objectives) {
    expect(row.text).not.toContain(quest.from)
    for (const check of card.tests) expect(row.text).not.toContain(check.text)
  }
})

test('resuming an old contract shows the saved goods, goal and title in the log', () => {
  const { quest, world, order } = take('harrow')
  Object.assign(order, { item: 'ingot', qty: 60, shipped: 12, text: 'Bring Harrow 60 ingots.', title: 'The saved shipment' })
  delete order.lines
  const card = questCard(migrateWorld(structuredClone(world)), quest)!
  const objectives = [{ id: 'ingot', text: 'Deliver ingots', count: '12/60', done: false }]
  expect(questObjectives(card)).toEqual(objectives)
  expect(questLog(quest, card)).toMatchObject([{ title: order.title, goal: order.text, objectives }])
})

test('the log has no entry for a preview and one expanded entry for the open quest', () => {
  const { quest, world } = take('odile')
  expect(questLog(undefined, undefined)).toEqual([])
  expect(questLog(undefined, questCard(createWorld(kettlewick), quest))).toEqual([])
  const card = questCard(world, quest)!
  expect(questLog(quest, card)).toEqual([{
    id: quest.id, who: quest.who, name: 'Odile', role: quest.role, title: card.title, quote: quest.quote,
    goal: card.goal, objectives: questObjectives(card), ready: false, expanded: true,
  }])
})
