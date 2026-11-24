import { expect, test } from 'vitest'
import { humanTime } from '../../sim/human'
import {
  apiCallsIn, apiCatalog, changedLines, conceptsIn, countWords, estimateHuman, humanWarnings, isNewLogic, stripComments,
  waitingStretches,
} from '../../sim/humanEstimate'
import type { Event, Run } from '../../sim/playthrough'
import { players, type Stage } from '../../sim/policy'

const catalog = apiCatalog()

function state(tick: number) {
  return { tick, credits: 0, xp: 0, level: 1 }
}

function sample(stages: { id: string; from?: Stage; to: Stage; start: number; end: number }[], extra: Event[] = []): Run {
  const events: Event[] = [...extra]
  const quests = stages.map(item => {
    events.push({ ...state(item.start), quest: item.id, kind: 'start', detail: item.id, eligible: [] })
    if (item.from)
      events.push({ ...state(item.start), quest: item.id, kind: 'code change', from: item.from, to: item.to, detail: 'edit' })
    events.push({ ...state(item.end), quest: item.id, kind: 'finish', detail: item.id })
    return { id: item.id, start: state(item.start), finish: state(item.end), stage: item.to, waits: 0 }
  })
  return { events, quests, probes: [], cleared: stages.map(item => item.id) }
}

test('line diffs count inserted and deleted non-blank lines', () => {
  expect(changedLines({ a: 'one\ntwo\n' }, { a: 'one\n' })).toBe(1)
  expect(changedLines({}, { a: 'one\n\ntwo\n' })).toBe(2)
  expect(changedLines({ a: 'one\n\n' }, { a: 'one\n' })).toBe(0)
  expect(changedLines({ a: 'a\nb\nc\n' }, { a: 'a\nc\nd\n' })).toBe(2)
  expect(changedLines({ a: 'keep\n' }, { b: 'keep\n' })).toBe(2)
})

test('word count uses letters and numbers', () => {
  expect(countWords('Bring Bram 1 ingot.')).toBe(4)
  expect(countWords('')).toBe(0)
  expect(countWords("don't stop")).toBe(2)
})

test('comments do not introduce API calls or concepts', () => {
  expect(stripComments('cart.transfer(1) // cart.mine(vein)\n/* press.start("grate") */')).toBe('cart.transfer(1)  \n ')
  expect(apiCallsIn('// cart.transfer(1)\n', catalog)).toEqual([])
  expect(apiCallsIn('mine(cart, "ore")', catalog)).toEqual([])
  expect(apiCallsIn('cart.mine(vein)', catalog)).toEqual(['drone.mine'])
  expect(apiCallsIn('cart.transfer("steel", furnace, press, 1)', catalog)).toEqual(['drone.transfer'])
  expect(apiCallsIn('on("drone.idle", haul)', catalog)).toContain('on')
  expect(conceptsIn('// cart.transfer(1)\npress.start("plate")')).toEqual([])
  expect(conceptsIn('export function onTick() {}')).toEqual(['function', 'loop'])
  expect(conceptsIn('furnace.alloy()')).toEqual(['multiple-inputs'])
  expect(conceptsIn('press.start("hinge")')).toEqual(['multiple-inputs'])
  expect(conceptsIn('cart.transfer("steel", furnace, press, 1)')).toEqual(['routing'])
})

test('an API call and a concept are charged once', () => {
  const run = sample([
    { id: 'bram', from: 'manual', to: 'run', start: 0, end: 10 },
    { id: 'ines', from: 'run', to: 'survey', start: 10, end: 20 },
    { id: 'odile', from: 'survey', to: 'steel-loop', start: 20, end: 40 },
  ])
  const average = estimateHuman(run).profiles.find(profile => profile.id === 'average')!
  const [bram, ines, odile] = average.quests
  expect(bram.apis).toContain('furnace.smelt')
  expect(bram.concepts).not.toContain('function')
  expect(ines.apis).not.toContain('furnace.smelt')
  expect(ines.apis).toContain('drone.mine')
  expect(ines.concepts).toContain('loop')
  expect(odile.apis).not.toContain('drone.mine')
  expect(odile.concepts).toContain('multiple-inputs')
  expect(ines.concepts).not.toContain('multiple-inputs')
  expect(bram.lines).toBeGreaterThan(0)
  expect(odile.lines).toBeGreaterThan(bram.lines)
  expect(ines.decisions).toBe(1)
  expect(bram.decisions).toBe(0)
})

test('profiles keep the same bot time and scale the overhead', () => {
  const estimate = estimateHuman(sample([
    { id: 'bram', from: 'manual', to: 'run', start: 0, end: 32 },
  ]))
  const byId = Object.fromEntries(estimate.profiles.map(profile => [profile.id, profile]))
  expect(estimate.profiles.map(profile => profile.id)).toEqual([...humanTime.profileOrder])
  expect(byId.fast.totals.bot).toBe(byId.average.totals.bot)
  expect(byId.newbie.totals.bot).toBe(byId.average.totals.bot)
  expect(byId.fast.totals.total).toBeLessThan(byId.average.totals.total)
  expect(byId.newbie.totals.total).toBeGreaterThan(byId.average.totals.total)
  const quest = byId.average.quests[0]
  expect(quest.total).toBeCloseTo(quest.bot + quest.reading + quest.writing + quest.debugging + quest.shop, 5)
  expect(quest.cumulative).toBe(quest.total)
  expect(byId.average.totals.total).toBe(byId.average.quests.at(-1)?.cumulative)
  expect(estimateHuman(sample([
    { id: 'bram', from: 'manual', to: 'run', start: 0, end: 32 },
  ]))).toEqual(estimate)
})

test('a machine unlocked before Take belongs to the first quest', () => {
  const run = sample(
    [{ id: 'bram', from: 'manual', to: 'run', start: 0, end: 10 }],
    [{ ...state(0), kind: 'unlock', detail: 'Machine · furnace' }],
  )
  const bram = estimateHuman(run).profiles.find(profile => profile.id === 'average')!.quests[0]
  expect(bram.machines).toBe(1)
  expect(bram.shop).toBeGreaterThan(0)
})

test('a literal swap or a short token edit is not new code', () => {
  const dies = "export function onTick() {\n  tick('dies')\n}\n"
  const gears = "export function onTick() {\n  tick('gears')\n}\n"
  const renamed = "export function onTick() {\n  step('dies')\n}\n"
  expect(isNewLogic({ 'main.ts': dies }, { 'main.ts': gears }, catalog)).toBe(false)
  expect(isNewLogic({ 'main.ts': 'const qty = 2\n' }, { 'main.ts': 'const qty = 8\n' }, catalog)).toBe(false)
  expect(isNewLogic({ 'main.ts': dies }, { 'main.ts': renamed }, catalog)).toBe(false)
  const added = "export function onTick() {\n  orders()\n}\n"
  expect(isNewLogic({ 'main.ts': 'export function onTick() {\n}\n' }, { 'main.ts': added }, catalog)).toBe(true)
  const branched = "export function onTick() {\n  if (ready) return\n}\n"
  expect(isNewLogic({ 'main.ts': 'export function onTick() {\n}\n' }, { 'main.ts': branched }, catalog)).toBe(true)
  expect(humanWarnings([{ id: 'tomas', total: 1, logic: false }], []).map(warning => warning.id)).toEqual(['human/code/tomas'])
  expect(humanWarnings([{ id: 'bram', total: 1 }], []).some(warning => warning.id.startsWith('human/code/'))).toBe(false)
})

test('each fabrication quest adds its own step', () => {
  expect(players.dies['lib/gears.ts']).toBeUndefined()
  expect(players.dies['lib/dies.ts']).not.toContain('lathe.start')
  expect(players.gears['lib/dies.ts']).toBe(players.dies['lib/dies.ts'])
  expect(players.gears['lib/gears.ts']).toContain('lathe.start')
  expect(players.hinges['lib/hinges.ts']).toContain('bench.start')
  expect(players.shutters['lib/shutters.ts']).toContain('cargoKind')
  expect(players.kits['lib/kits.ts']).toContain('manifest()')
  expect(isNewLogic(players.dies, players.gears, catalog)).toBe(true)
  const run = sample([
    { id: 'harrow', from: 'grates', to: 'dies', start: 0, end: 10 },
    { id: 'tomas', from: 'dies', to: 'gears', start: 10, end: 20 },
  ])
  const quests = estimateHuman(run).profiles.find(profile => profile.id === 'average')!.quests
  expect(quests[0]?.logic).toBe(true)
  expect(quests[1]?.logic).toBe(true)
  expect(quests[1]?.apis).toContain('lathe.start')
  expect(quests[1]?.apis).not.toContain('press.start')
  expect(quests[0]?.lines).toBeGreaterThan(quests[1]?.lines ?? 0)
})

test('the quest cap and the wait cap are warnings', () => {
  expect(humanWarnings([{ id: 'bram', total: humanTime.maxQuestMinutes }], [])).toEqual([])
  expect(humanWarnings([{ id: 'bram', total: humanTime.maxQuestMinutes + 0.01 }], []).map(warning => warning.id))
    .toEqual(['human/quest/bram'])
  const atCap = sample([{ id: 'bram', from: 'manual', to: 'run', start: 0, end: 1800 }])
  const over = sample([{ id: 'bram', from: 'manual', to: 'run', start: 0, end: 1801 }])
  expect(estimateHuman(atCap).warnings.some(warning => warning.id.startsWith('human/wait/'))).toBe(false)
  const warned = estimateHuman(over)
  expect(warned.warnings.map(warning => warning.id)).toContain('human/wait/bram')
  const spanned = sample([
    { id: 'bram', from: 'manual', to: 'run', start: 0, end: 900 },
    { id: 'ines', to: 'run', start: 900, end: 1801 },
  ])
  expect(waitingStretches(spanned).map(wait => wait.quest)).toEqual(['bram+ines'])
  expect(estimateHuman(spanned).warnings.map(warning => warning.id)).toContain('human/wait/bram+ines')
})
