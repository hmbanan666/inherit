import { expect, test } from 'vitest'
import { createWorld } from '../../packages/sim/src/v8/core/world'
import { kettlewick } from '../../packages/sim/src/v8/sites/kettlewick'
import { inspectMachine, machineList } from '../../packages/sim/src/v8/triggers'
import { migrateWorld } from '../../packages/sim/src/v8/core/world'
import { triggerUnlocked } from '../../packages/sim/src/v8/quests'
import { createSession } from '../../packages/sandbox/src/v8'
import { runnableExports } from '../../apps/web/app/lib/runGlyph'

test('the play mark finds a no-argument export and skips the rest', () => {
  const found = runnableExports('export function smeltOnce() {\n}\nexport function haul(drone) {\n}\nfunction local() {}\n')
  expect(found).toEqual([{ name: 'smeltOnce', line: 1 }])
})

test('the inspector names caps, a locked recipe, and dump', () => {
  const world = createWorld(kettlewick)
  const furnace = inspectMachine(world, kettlewick, 'furnace')
  expect(furnace?.lines.map(line => line.value)).toEqual(['0/6', '0/3', '0/6', '0/6'])
  expect(furnace?.recipes.find(recipe => recipe.id === 'steel')?.locked).toContain('Steel for the bridge')
  expect(furnace?.actions.find(action => action.id === 'dump')).toBeUndefined()
  expect(furnace?.actions.find(action => action.id === 'clear')?.api).toBe('furnace.clear()')
  const depot = inspectMachine(world, kettlewick, 'depot')
  expect(depot?.actions).toEqual([])
  const vein = inspectMachine(world, kettlewick, 'Vein A')
  expect(vein?.lines.find(line => line.label === 'Purity')?.value).toBe('Poor')
  expect(vein?.lines.find(line => line.label === 'Each mine')?.value).toBe('5 ticks for 1')
  expect(inspectMachine(world, kettlewick, 'Vein C')).toBeUndefined()
  const drone = inspectMachine(world, kettlewick, 'drone-1')
  expect(drone?.actions.map(action => action.api)).toEqual(['drone.mine(vein)', 'drone.unload(station)', 'drone.dump()'])
  expect(machineList(world).map(row => row.id)).toEqual(['furnace', 'depot', 'drone-1', 'Vein A', 'Vein B'])
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
    expect(triggerUnlocked(session.world, 'run')).toBe(false)
    session.world.questId = undefined
    session.world.cleared = ['bram']
    session.world.level = 2
    session.world.orders = []
    expect(session.accept('ines')).toBe(true)
    expect(triggerUnlocked(session.world, 'run')).toBe(true)
    expect(triggerUnlocked(session.world, 'events')).toBe(false)
    session.world.questId = 'odile'
    expect(triggerUnlocked(session.world, 'events')).toBe(true)
    expect(triggerUnlocked(session.world, 'tick')).toBe(false)
    session.world.questId = 'elsie'
    expect(triggerUnlocked(session.world, 'tick')).toBe(true)
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
    expect(migrateWorld(bare).automation).toEqual({ run: true, events: true, tick: true })
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
    expect(session.world.orders.find(order => order.id === 'bram')?.shipped).toBe(4)
    expect(session.world.furnace.output).toBe(4)
    session.world.level = 2
    session.world.questId = undefined
    session.world.cleared = ['bram']
    session.world.orders = []
    expect(session.accept('ines')).toBe(true)
    session.queue('smeltOnce', 'main.ts', 2)
    session.world.furnace.input = 2
    session.world.furnace.output = 0
    session.step(1)
    expect(session.world.console.some(line => line.text === 'smeltOnce ok' && line.line === 2)).toBe(true)
    expect(session.world.furnace.readyAt).not.toBeNull()
  } finally { session.dispose() }
})
