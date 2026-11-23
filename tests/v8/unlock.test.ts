import { expect, test } from 'vitest'
import { createWorld } from '../../packages/sim/src/v8/core/world'
import { declarations } from '../../packages/sim/src/v8/core/bricks'
import { factoryBricks, kettlewick } from '../../packages/sim/src/v8'
import { functionUnlocked, shop } from '../../packages/sim/src/v8/quests'
import { createSession } from '../../packages/sandbox/src/v8'

const steelNote = 'smelt() makes ingots. Steel comes from furnace.alloy().'

test('taking the quest unlocks the function, and a previous purchase still counts', () => {
  const world = createWorld(kettlewick)
  expect(shop.some(item => item.id === 'alloy' || item.id === 'prospect')).toBe(false)
  expect(functionUnlocked(world, 'furnace.alloy')).toBe(false)
  expect(functionUnlocked(world, 'prospect')).toBe(false)
  const credits = world.credits
  world.bought = ['alloy', 'prospect']
  expect(functionUnlocked(world, 'furnace.alloy')).toBe(true)
  expect(functionUnlocked(world, 'prospect')).toBe(true)
  expect(world.credits).toBe(credits)
  world.bought = []
  world.questId = 'odile'
  expect(functionUnlocked(world, 'furnace.alloy')).toBe(true)
  world.questId = 'elsie'
  world.cleared = ['bram', 'odile']
  expect(functionUnlocked(world, 'furnace.alloy')).toBe(true)
  expect(functionUnlocked(world, 'prospect')).toBe(false)
  world.questId = 'harrow'
  expect(functionUnlocked(world, 'prospect')).toBe(true)
  world.questId = undefined
  world.cleared = ['harrow']
  expect(functionUnlocked(world, 'prospect')).toBe(true)
})

test('the editor types gain alloy when Odile is open, marked new', () => {
  const world = createWorld(kettlewick)
  const bricks = factoryBricks(kettlewick)
  const before = declarations(bricks.filter(brick => functionUnlocked(world, brick.name)))
  expect(before).not.toContain('alloy(): void')
  world.questId = 'odile'
  const fresh = new Set(bricks.filter(brick => brick.name === 'furnace.alloy').map(brick => brick.name))
  const after = declarations(bricks.filter(brick => functionUnlocked(world, brick.name)), fresh)
  expect(after).toContain('alloy(): void')
  expect(after).toContain('new. Alloy 2 ore and 1 coal into 1 steel.')
})

test('alloy and prospect name the quest that grants them, and smelt notes steel once', async () => {
  const session = await createSession(kettlewick, kettlewick.files)
  try {
    const credits = session.world.credits
    expect(session.buy('alloy')).toBe(false)
    expect(session.buy('prospect')).toBe(false)
    expect(session.world.credits).toBe(credits)

    session.world.questId = 'bram'
    await session.deploy({ 'main.ts': 'import { furnace } from "inherit"\nexport function onTick() { furnace.smelt() }' })
    session.world.furnace.input = 4
    session.step(2)
    expect(session.world.console.some(line => line.text === steelNote)).toBe(false)

    session.world.questId = 'odile'
    session.step(2)
    const note = session.world.console.find(line => line.text === steelNote)
    expect(note?.count).toBe(2)
    expect(note?.level).toBe('info')

    session.world.questId = undefined
    session.world.cleared = []
    session.world.bought = []
    await session.deploy({ 'main.ts': 'import { furnace } from "inherit"\nexport function onTick() { furnace.alloy() }' })
    session.step(1)
    expect(session.world.messages.some(message => message.text.includes('furnace.alloy() unlocks with the quest Steel for the bridge (level 2).'))).toBe(true)

    await session.deploy({ 'main.ts': 'import { prospect } from "inherit"\nexport function onTick() { prospect() }' })
    session.step(1)
    expect(session.world.messages.some(message => message.text.includes('prospect() unlocks with the quest Iron from the hill (level 4).'))).toBe(true)
  } finally { session.dispose() }
})

test('taking the 60 ingot quest unlocks prospect and reveals the rich vein', async () => {
  const session = await createSession(kettlewick, kettlewick.files)
  try {
    session.world.level = 4
    session.world.cleared = ['bram', 'ines', 'odile', 'elsie']
    expect(session.accept()).toBe(true)
    expect(session.world.questId).toBe('harrow')
    expect(session.world.orders.find(order => order.id === 'harrow')?.qty).toBe(60)
    expect(functionUnlocked(session.world, 'prospect')).toBe(true)
    expect(session.world.credits).toBe(kettlewick.credits)
    await session.deploy({ 'main.ts': `import { prospect, memory } from "inherit"
      export function onTick() {
        if (!memory.opened) { prospect(); memory.opened = true }
      }` })
    session.step(1)
    const vein = session.world.veins.find(item => item.name === 'C')
    expect(vein?.hidden).toBe(false)
    expect(vein?.purity).toBe('rich')
    expect(vein?.yield).toBe(2)
    expect(session.world.messages.some(message => message.text.includes('not unlocked'))).toBe(false)
  } finally { session.dispose() }
})
