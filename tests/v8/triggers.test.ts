import { expect, test } from 'vitest'
import { createWorld } from '../../packages/sim/src/v8/core/world'
import { kettlewick } from '../../packages/sim/src/v8/sites/kettlewick'
import { inspectMachine, machineList, triggerDocs } from '../../packages/sim/src/v8/triggers'
import { migrateWorld } from '../../packages/sim/src/v8/core/world'
import { triggerUnlocked } from '../../packages/sim/src/v8/quests'
import { apiBook, declarations, factoryBricks } from '../../packages/sim/src/v8'
import { createSession } from '../../packages/sandbox/src/v8'
import { exportAtCursor, runnableExports } from '../../apps/web/app/lib/runGlyph'

test('the play mark finds a no-argument export and skips the rest', () => {
  const found = runnableExports('export function smeltOnce() {\n}\nexport function* bringOne() {\n}\nexport function haul(drone) {\n}\nfunction local() {}\n')
  expect(found).toEqual([{ name: 'smeltOnce', line: 1 }])
  const source = 'export function haul() {\n  return\n}\nexport function smeltOnce() {\n}\n'
  expect(exportAtCursor(source, 2)?.name).toBe('haul')
  expect(exportAtCursor(source, 4)?.name).toBe('smeltOnce')
  expect(exportAtCursor(source, 1)?.name).toBe('haul')
})

test('the inspector names caps, a locked recipe, and dump', () => {
  const world = createWorld(kettlewick)
  const furnace = inspectMachine(world, kettlewick, 'furnace')
  expect(furnace?.lines.map(line => line.value)).toEqual(['0/6', '0/3', '0/6', '0/6'])
  expect(furnace?.recipes.find(recipe => recipe.id === 'steel')?.locked).toContain('Steel for the bridge')
  expect(furnace?.actions.find(action => action.id === 'dump')).toBeUndefined()
  expect(furnace?.actions.find(action => action.id === 'clear')?.api).toBe('furnace.clear()')
  expect(furnace?.actions.find(action => action.id === 'smelt')).toMatchObject({ enabled: false, reason: 'Needs 2 ore' })
  expect(furnace?.actions.find(action => action.id === 'collect')).toMatchObject({ api: 'drone.pickup(furnace)', reason: 'Collect with drone-1', drone: 'drone-1' })
  expect(machineList(world).find(row => row.id === 'furnace')?.detail).toBe('0 ore · 0 ingots')
  world.furnace.coal = 1
  world.furnace.steel = 2
  expect(machineList(world).find(row => row.id === 'furnace')?.detail).toBe('0 ore · 1 coal · 0 ingots · 2 steel')
  const depot = inspectMachine(world, kettlewick, 'depot')
  expect(depot?.actions).toEqual([])
  const vein = inspectMachine(world, kettlewick, 'Vein A')
  expect(vein?.lines.find(line => line.label === 'Purity')?.value).toBe('Poor')
  expect(vein?.lines.find(line => line.label === 'Each mine')?.value).toBe('5 ticks for 1')
  expect(inspectMachine(world, kettlewick, 'Vein C')).toBeUndefined()
  const drone = inspectMachine(world, kettlewick, 'drone-1')
  expect(drone?.actions.map(action => action.api)).toEqual(['drone.mine(vein)', 'drone.unload(station)', 'drone.dump()'])
  expect(drone?.lines.find(line => line.label === 'Task')?.value).toBe('free')
  expect(drone?.progress).toBeUndefined()
  world.drones[0]!.cargo = 2
  world.drones[0]!.carrying = 'ore'
  expect(inspectMachine(world, kettlewick, 'drone-1')?.actions.find(action => action.id === 'unload')?.reason).toBe('Unload at furnace')
  world.drones[0]!.carrying = 'ingot'
  expect(inspectMachine(world, kettlewick, 'drone-1')?.actions.find(action => action.id === 'unload')?.reason).toBe('Unload at depot')
  world.drones[0]!.task = { kind: 'pickup', phase: 'fetch', since: 0 }
  const hauling = inspectMachine(world, kettlewick, 'drone-1')
  expect(hauling?.progress).toBeUndefined()
  expect(hauling?.lines.find(line => line.label === 'Task')?.value).toBe('Hauling')
  world.drones[0]!.task = { kind: 'mine', vein: 'A', since: 0 }
  world.drones[0]!.dig = { vein: 'A', ticks: 2 }
  const mining = inspectMachine(world, kettlewick, 'drone-1')
  expect(mining?.lines.find(line => line.label === 'Task')?.value).toBe('Mining')
  expect(mining?.progress?.label).toBe('Mining')
  expect(mining?.progress?.pct).toBe(40)
  expect(machineList(world).map(row => row.id)).toEqual(['furnace', 'depot', 'drone-1', 'Vein A', 'Vein B', 'Vein D'])
})

test('a fresh world stays on buttons until the quest that grants the trigger is taken', async () => {
  const session = await createSession(kettlewick, kettlewick.files, undefined, { fresh: true })
  try {
    expect(triggerUnlocked(session.world, 'run')).toBe(false)
    expect(triggerUnlocked(session.world, 'events')).toBe(false)
    expect(triggerUnlocked(session.world, 'tick')).toBe(false)
    session.world.furnace.input = 2
    session.press('smelt')
    session.step(1)
    expect(session.world.furnace.readyAt).toBe(session.world.tick + kettlewick.recipe.ticks)
    expect(session.world.manualRuns).toBe(1)
    session.accept()
    expect(session.world.questId).toBe('bram')
    expect(triggerUnlocked(session.world, 'run')).toBe(true)
    expect(triggerUnlocked(session.world, 'tick')).toBe(false)
    expect(session.world.loop).toBe(false)
    session.world.questId = undefined
    session.world.cleared = ['bram']
    session.world.level = 2
    session.world.orders = []
    expect(session.accept('ines')).toBe(true)
    expect(triggerUnlocked(session.world, 'tick')).toBe(true)
    expect(session.world.loop).toBe(true)
    expect(triggerUnlocked(session.world, 'events')).toBe(false)
    session.world.questId = 'odile'
    expect(triggerUnlocked(session.world, 'events')).toBe(false)
    session.world.questId = 'elsie'
    expect(triggerUnlocked(session.world, 'events')).toBe(true)
  } finally { session.dispose() }
})

test('an old save with no automation field keeps the tick loop', async () => {
  const saved = createWorld(kettlewick)
  const legacy = { ...saved, automation: undefined }
  const session = await createSession(kettlewick, {
    'main.ts': 'import { furnace } from "inherit"\nexport function onTick() { furnace.smelt() }',
  }, legacy as never)
  try {
    session.world.furnace.input = 4
    session.step(1)
    expect(session.world.furnace.readyAt).not.toBeNull()
    expect(migrateWorld(createWorld(kettlewick)).automation.tick).toBe(false)
    const bare = createWorld(kettlewick)
    delete (bare as { automation?: unknown }).automation
    expect(migrateWorld(bare).automation).toEqual({ run: true, events: true, tick: true, pinned: true })
    expect(migrateWorld(bare).loop).toBe(true)
  } finally { session.dispose() }
})

test('dump drops ore, clear keeps ingots, and a full furnace names the depot', async () => {
  const session = await createSession(kettlewick, kettlewick.files, undefined, { fresh: true })
  try {
    const drone = session.world.drones[0]!
    drone.cargo = 2
    drone.carrying = 'ore'
    session.press('dump', 'drone-1')
    session.step(1)
    expect(drone.cargo).toBe(0)
    session.world.furnace.input = 3
    session.world.furnace.coal = 1
    session.world.furnace.output = 2
    session.world.furnace.steel = 1
    session.press('clear')
    session.step(1)
    expect(session.world.furnace.input).toBe(0)
    expect(session.world.furnace.coal).toBe(0)
    expect(session.world.furnace.output).toBe(2)
    expect(session.world.furnace.steel).toBe(1)
    session.world.furnace.output = 6
    session.world.furnace.input = 2
    session.press('smelt')
    session.step(1)
    expect(session.world.console.some(line => line.text.includes('furnace output is full (6). Carry ingots to the depot.'))).toBe(true)
    expect(session.world.furnace.output).toBe(6)
  } finally { session.dispose() }
})

test('ingots count at the depot, and a run prints the function name', async () => {
  const session = await createSession(kettlewick, {
    'main.ts': `import { furnace } from "inherit"
export function smeltOnce() { furnace.smelt() }
export function onTick() { furnace.smelt() }`,
  })
  try {
    session.accept()
    session.world.furnace.output = 4
    session.world.depot.ingots = 4
    session.step(1)
    expect(session.world.orders.find(order => order.id === 'bram')?.shipped).toBe(2)
    expect(session.world.depot.ingots).toBe(2)
    expect(session.world.furnace.output).toBe(4)
    session.world.level = 2
    session.world.questId = undefined
    session.world.cleared = ['bram']
    session.world.orders = []
    expect(session.accept('ines')).toBe(true)
    session.world.loop = false
    session.queue('smeltOnce', 'main.ts', 2)
    session.world.furnace.input = 2
    session.world.furnace.output = 0
    session.step(1)
    expect(session.world.console.some(line => line.text === 'smeltOnce ok' && line.line === 2)).toBe(true)
    expect(session.world.furnace.readyAt).not.toBeNull()
  } finally { session.dispose() }
})

test('a generator runs to its first yield and does not continue', async () => {
  const session = await createSession(kettlewick, {
    'main.ts': `import { memory } from "inherit"
export function* bringOne() {
  memory.n = 1
  yield
  memory.n = 2
}`,
  }, undefined, { fresh: true })
  try {
    session.accept()
    session.queue('bringOne', 'main.ts', 2)
    session.step(3)
    expect(session.world.memory.n).toBe(1)
    expect(session.world.script).toBeNull()
    expect(session.world.pace.mode).toBe('idle')
    expect(session.world.console.some(line => line.text === 'bringOne ok')).toBe(true)
  } finally { session.dispose() }
})

test('return false finishes the call, and the next ticks do not call it again', async () => {
  const session = await createSession(kettlewick, {
    'main.ts': `import { memory } from "inherit"
export function keep() {
  memory.n = (memory.n ?? 0) + 1
  return false
}`,
  }, undefined, { fresh: true })
  try {
    session.accept()
    session.queue('keep', 'main.ts', 2)
    session.step(3)
    expect(session.world.memory.n).toBe(1)
    expect(session.world.script).toBeNull()
    expect(session.world.console.some(line => line.text === 'keep ok')).toBe(true)
  } finally { session.dispose() }
})

test('one Mine press fills the cart, and the same vein does not reset the dig', async () => {
  const session = await createSession(kettlewick, kettlewick.files, undefined, { fresh: true })
  try {
    const drone = session.world.drones[0]!
    session.press('mine', 'drone-1')
    session.step(25)
    expect(drone.cargo).toBe(drone.capacity)
    expect(drone.task).toBeNull()
    expect(session.world.manualRuns).toBe(1)
    drone.pos = { x: 6, y: 1 }
    drone.cargo = 0
    drone.carrying = null
    session.press('mine', 'drone-1', 'A')
    session.step(2)
    expect(drone.dig).toEqual({ vein: 'A', ticks: 2 })
    session.press('mine', 'drone-1', 'A')
    session.step(1)
    expect(drone.dig).toEqual({ vein: 'A', ticks: 3 })
    expect(session.world.manualRuns).toBe(2)
    session.press('mine', 'drone-1', 'D')
    session.step(1)
    expect(drone.task).toMatchObject({ kind: 'mine', vein: 'D' })
    expect(drone.dig).toBeNull()
  } finally { session.dispose() }
})

test('Collect sends the drone, and the goods are not at the depot until it unloads', async () => {
  const session = await createSession(kettlewick, kettlewick.files, undefined, { fresh: true })
  try {
    session.world.furnace.output = 2
    session.press('collect')
    expect(session.world.furnace.output).toBe(2)
    expect(session.world.depot.ingots).toBe(0)
    session.step(1)
    expect(session.world.furnace.output).toBe(0)
    expect(session.world.drones[0]).toMatchObject({ cargo: 2, carrying: 'ingot' })
    expect(session.world.depot.ingots).toBe(0)
    expect(session.world.manualRuns).toBe(1)
    session.step(1)
    expect(session.world.depot.ingots).toBe(2)
    expect(session.world.drones[0]!.cargo).toBe(0)
  } finally { session.dispose() }
})

test('Loop calls onTick, and Stop holds it', async () => {
  const session = await createSession(kettlewick, {
    'main.ts': `import { memory } from "inherit"
export function onTick() { memory.n = (memory.n ?? 0) + 1 }`,
  }, undefined, { fresh: true })
  try {
    session.world.level = 2
    session.world.cleared = ['bram']
    expect(session.accept('ines')).toBe(true)
    session.step(2)
    expect(session.world.memory.n).toBe(2)
    expect(session.world.pace).toEqual({ mode: 'tick', name: 'onTick' })
    expect(session.world.manualRuns).toBe(0)
    session.stop()
    session.step(2)
    expect(session.world.memory.n).toBe(2)
    expect(session.world.holding).toBe(true)
    session.setLoop(true, 'onTick')
    expect(session.world.manualRuns).toBe(0)
    expect(session.world.console.some(line => line.text === 'Loop stopped: onTick')).toBe(true)
    expect(session.world.console.some(line => line.text === 'Loop started: onTick')).toBe(true)
    session.step(1)
    expect(session.world.memory.n).toBe(3)
  } finally { session.dispose() }
})

test('an Odile save keeps on(), and a save that already had the tick loop keeps Loop on', () => {
  const mid = createWorld(kettlewick)
  delete (mid as { loop?: boolean }).loop
  mid.automation = { run: true, events: false, tick: false }
  mid.questId = 'odile'
  migrateWorld(mid)
  expect(mid.automation).toMatchObject({ run: true, events: true, tick: false, pinned: true })
  expect(mid.loop).toBe(false)
  expect(triggerUnlocked(mid, 'events')).toBe(true)
  expect(triggerUnlocked(mid, 'tick')).toBe(true)
  const later = createWorld(kettlewick)
  delete (later as { loop?: boolean }).loop
  later.automation = { run: true, events: true, tick: true }
  later.questId = 'elsie'
  migrateWorld(later)
  expect(later.loop).toBe(true)
  expect(later.automation.pinned).toBe(true)
})

test('the book and the hover share one example, and a locked call names its quest', () => {
  const world = createWorld(kettlewick)
  const bricks = factoryBricks(kettlewick)
  const furnace = apiBook(bricks, world).find(section => section.id === 'furnace')
  const alloy = furnace?.entries.find(entry => entry.id === 'furnace.alloy')
  const smelt = furnace?.entries.find(entry => entry.id === 'furnace.smelt')
  expect(alloy?.locked).toBe('Steel for the bridge')
  expect(alloy?.example.startsWith('//')).toBe(true)
  expect(smelt?.locked).toBeUndefined()
  expect(smelt?.example.startsWith('//')).toBe(true)
  const events = apiBook(bricks, world).find(section => section.id === 'events')
  expect(events?.entries.find(entry => entry.id === 'tick')?.locked).toBe('Ingots for the storehouse')
  const types = declarations(bricks)
  expect(types).toContain(smelt?.example.split('\n')[0])
  expect(types).toContain('drone.idle')
  world.questId = 'odile'
  const open = apiBook(bricks, world).find(section => section.id === 'furnace')
  expect(open?.entries.find(entry => entry.id === 'furnace.alloy')).toMatchObject({ locked: undefined, fresh: true })
})

const idleExample = triggerDocs.find(item => item.id === 'events')!.example

test('the documented on() example registers at module scope, and a second copy does not double-fire', async () => {
  const locked = await createSession(kettlewick, kettlewick.files, undefined, { fresh: true })
  try {
    await expect(locked.deploy({ 'main.ts': idleExample })).rejects.toThrow(/on\(\) is locked/)
  } finally { locked.dispose() }
  const session = await createSession(kettlewick, { 'main.ts': idleExample })
  try {
    session.world.signals.drones['drone-1'] = { cargo: 0, capacity: 3, idle: false }
    session.step(1)
    expect(session.world.memory.hauls).toBe(1)
    session.step(1)
    expect(session.world.memory.hauls).toBe(1)
    session.world.signals.drones['drone-1'] = { cargo: 0, capacity: 3, idle: false }
    session.step(1)
    expect(session.world.memory.hauls).toBe(2)
    await session.deploy({ 'main.ts': idleExample })
    session.world.signals.drones['drone-1'] = { cargo: 0, capacity: 3, idle: false }
    session.step(1)
    expect(session.world.memory.hauls).toBe(3)
  } finally { session.dispose() }
})

test('onTick can register the same listener every tick', async () => {
  const session = await createSession(kettlewick, {
    'main.ts': `import { on, memory } from "inherit"
function haul() { memory.hauls = (memory.hauls ?? 0) + 1 }
export function onTick() { on("drone.idle", haul) }`,
  })
  try {
    session.world.signals.drones['drone-1'] = { cargo: 0, capacity: 3, idle: false }
    session.step(1)
    expect(session.world.memory.hauls).toBe(1)
    session.world.signals.drones['drone-1'] = { cargo: 0, capacity: 3, idle: false }
    session.step(1)
    expect(session.world.memory.hauls).toBe(2)
  } finally { session.dispose() }
})

test('sixty ingots open Harrow hand over after a Run, and a finished save is repaired', async () => {
  const session = await createSession(kettlewick, {
    'main.ts': `export function smeltOnce() {}`,
  })
  try {
    session.world.credits = 140
    session.world.questId = 'harrow'
    session.world.orders = [{
      id: 'harrow', at: 1, item: 'ingot', qty: 60, pay: 80, from: 'Harrow', who: 'harrow',
      role: 'Prospector', title: 'A richer vein', text: 'Sixty.', building: 'mill',
      change: 'The mill turns.', shipped: 60, status: 'open',
    }]
    session.queue('smeltOnce', 'main.ts', 1)
    expect(session.world.manualRuns).toBe(1)
    session.step(1)
    expect(session.world.manualRuns).toBe(1)
    expect(session.complete()).toBe(true)
    expect(session.world.credits).toBe(220)
  } finally { session.dispose() }
  const saved = createWorld(kettlewick)
  saved.credits = 140
  saved.questId = 'harrow'
  saved.manualRuns = 3
  saved.orders = [{
    id: 'harrow', at: 1, item: 'ingot', qty: 60, pay: 80, from: 'Harrow', who: 'harrow',
    role: 'Prospector', title: 'A richer vein', text: 'Sixty.', building: 'mill',
    change: 'The mill turns.', shipped: 60, status: 'open',
  }]
  migrateWorld(saved)
  expect(saved.manualRuns).toBe(0)
  expect(saved.credits).toBe(140)
  saved.manualRuns = 3
  saved.orders[0]!.shipped = 59
  migrateWorld(saved)
  expect(saved.manualRuns).toBe(3)
  expect(saved.credits).toBe(140)
  const collecting = createWorld(kettlewick)
  collecting.collectAt = 8
  collecting.collectSpan = 4
  collecting.furnace.output = 2
  migrateWorld(collecting)
  expect(collecting.collectAt).toBeNull()
  expect(collecting.furnace.output).toBe(2)
  expect(collecting.drones[0]?.task).toMatchObject({ kind: 'pickup', phase: 'fetch' })
})
