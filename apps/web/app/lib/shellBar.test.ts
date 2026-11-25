import { acceptQuest, createWorld, kettlewick, migrateWorld, questList } from '@inherit/sim/v8'
import { expect, test } from 'vitest'
import { questCard } from './questNote'
import { questNextStep } from './questStep'
import { journalRequests } from './village'
import { emptyToasts, expireToasts, pushToasts } from './toasts'
import { hintParts, isCodeJob, questGoal, questLog, questObjectives, questTabNotice, welcomeToast, xpProgress, xpRing } from './shellBar'

test.each([
  [0, 1, '0 / 10 XP', 0],
  [10, 2, '10 / 20 XP', 0],
  [15, 2, '15 / 20 XP', 0.5],
  [25, 3, '25 / 40 XP', 0.25],
] as const)('the account shows total XP at %i and fills the ring within the level', (xp, level, label, fraction) => {
  expect(xpProgress(xp)).toEqual({ level, fraction, width: `${fraction * 100}%`, label, title: `Level ${level} · ${label}` })
})

test.each([170, 180])('the final level keeps a full ring at %i XP', xp => {
  expect(xpProgress(xp)).toEqual({ level: 7, fraction: 1, width: '100%', label: 'Max level', title: `Level 7 · Max level · ${xp} XP` })
})

test('Ines is the code job and the tracker explains both unload routes', () => {
  const { quest } = take('ines')
  expect(questList.filter(q => isCodeJob(q.id)).map(q => q.id)).toEqual(['ines'])
  expect(questGoal(quest, quest)).toEqual({
    goal: 'Write code to mine vein D and unload 3 ore at the depot.',
    hint: 'The Unload button only goes to the furnace. Use drone.unload(depot) in your code.',
  })
})

test('hint fragments keep prose and punctuation around calls and exported names', () => {
  expect(hintParts('Run smeltOnce, then drone.unload(depot).')).toEqual([
    { text: 'Run ', code: false }, { text: 'smeltOnce', code: true }, { text: ', then ', code: false },
    { text: 'drone.unload(depot)', code: true }, { text: '.', code: false },
  ])
  expect(hintParts('Plain words')).toEqual([{ text: 'Plain words', code: false }])
})

test('the ring offsets a full circumference at zero and none at full XP', () => {
  const ring = xpRing(0.25, 10)
  expect(ring.circumference).toBeCloseTo(62.83185)
  expect(ring.dashArray).toBe(ring.circumference)
  expect(ring.dashOffset).toBeCloseTo(47.12389)
  for (const empty of [-1, 0]) expect(xpRing(empty, 10).dashOffset).toBeCloseTo(62.83185)
  for (const full of [1, 2]) expect(xpRing(full, 10).dashOffset).toBe(0)
})

test('a fresh Kettlewick game points to the first villager in the quest chain', () => {
  const world = createWorld(kettlewick)
  const [available] = journalRequests(world, questList)
  const step = questNextStep({
    available, ready: false, shipped: 0, loop: false, furnace: world.furnace, made: { ingots: 0, steel: 0 },
  })
  expect(welcomeToast(world, step)?.text).toBe('Talk to Bram. Click the gold ! next to the house.')
})

test('the welcome follows the given step and gives the player seven seconds once', () => {
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
    goal: 'Smelt 2 steel and bring it to Odile.', hint: undefined, objectives: questObjectives(card), ready: false, expanded: true,
  }])
})

test('every Quest tab goal is plain words, and code words only reach the hint', () => {
  const code = /[a-z][A-Z]|[()]/
  expect(questList.length).toBeGreaterThanOrEqual(9)
  for (const quest of questList) {
    const { goal, hint } = questGoal(quest, quest)
    expect(goal, quest.id).not.toMatch(code)
    expect(goal.endsWith('.'), quest.id).toBe(true)
    if (code.test(quest.goal)) expect(hint, quest.id).toMatch(code)
  }
  const { quest, world } = take('bram')
  expect(questLog(quest, questCard(world, quest)!)[0]).toMatchObject({
    goal: 'Smelt an ingot and bring it to Bram.', hint: 'The batch has to be started by smeltOnce in your code.',
  })
})
