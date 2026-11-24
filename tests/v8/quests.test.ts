import { expect, test } from 'vitest'
import { declarations, factoryBricks, inspectMachine, kettlewick, machineList, shop, uncleMain } from '../../packages/sim/src/v8'
import { createWorld, migrateWorld } from '../../packages/sim/src/v8/core/world'
import { acceptQuest, canTake, levelSpan, questHold, questList } from '../../packages/sim/src/v8/quests'
import { createSession } from '../../packages/sandbox/src/v8'

test('Elsie stays listed until Odile hands over drone-2, and an open Elsie save keeps the quest', () => {
  const world = createWorld(kettlewick)
  world.level = 3
  world.xp = 40
  world.cleared = ['bram', 'ines']
  const elsie = questList.find(quest => quest.id === 'elsie')!
  const odile = questList.find(quest => quest.id === 'odile')!
  const ines = questList.find(quest => quest.id === 'ines')!
  expect(questHold(world, elsie)).toBe("Finish Odile's bridge for drone-2")
  expect(canTake(world, elsie)).toBe(false)
  expect(canTake(world, odile)).toBe(true)
  expect(canTake(world, ines)).toBe(false)
  expect(acceptQuest(world, kettlewick, 'elsie')).toBe(false)
  expect(world.questId).toBeUndefined()
  expect(acceptQuest(world, kettlewick, 'odile')).toBe(true)

  world.questId = undefined
  world.cleared = ['bram', 'ines', 'odile']
  world.level = 4
  const saved = migrateWorld(structuredClone(world))
  expect(saved.drones.map(drone => drone.name)).toContain('drone-2')
  expect(questHold(saved, elsie)).toBeUndefined()
  expect(acceptQuest(saved, kettlewick, 'elsie')).toBe(true)

  const open = createWorld(kettlewick)
  open.questId = 'elsie'
  open.level = 3
  open.drones.push({
    name: 'drone-2', pos: { ...open.depot.pos }, cargo: 0, capacity: 3, carrying: null, source: '', dig: null, task: null,
  })
  migrateWorld(open)
  expect(open.questId).toBe('elsie')
  expect(open.drones.map(drone => drone.name)).toEqual(['drone-1'])
  expect(questHold(open, elsie)).toBe("Finish Odile's bridge for drone-2")
})

test('a new game shows only drone-1 until Odile is handed over', async () => {
  const fresh = createWorld(kettlewick)
  expect(fresh.drones.map(drone => drone.name)).toEqual(['drone-1'])
  expect(machineList(fresh).map(row => row.id)).toEqual(['furnace', 'depot', 'drone-1', 'Vein A', 'Vein B', 'Vein D'])
  expect(inspectMachine(fresh, kettlewick, 'drone-2')).toBeUndefined()
  const hidden = declarations(factoryBricks(kettlewick), new Set(), fresh.drones.map(drone => drone.name))
  expect(hidden).toContain('"drone-1"')
  expect(hidden).not.toContain('drone-2')

  const session = await createSession(kettlewick, kettlewick.files, undefined, { fresh: true })
  try {
    expect(session.world.drones.map(drone => drone.name)).toEqual(['drone-1'])
    expect(shop.some(item => item.id === 'drone')).toBe(false)
    session.world.level = 3
    session.world.xp = 40
    session.world.cleared = ['bram', 'ines']
    const bought = [...session.world.bought]
    expect(session.accept('odile')).toBe(true)
    expect(session.world.bought).toEqual(bought)
    expect(session.world.drones.map(drone => drone.name)).toEqual(['drone-1'])
    expect(machineList(session.world).some(row => row.id === 'drone-2')).toBe(false)
    session.world.loop = true
    await session.deploy({
      'main.ts': `import { drones, memory } from "inherit"
export function onTick() { memory.names = drones().map(drone => drone.name) }`,
    })
    session.step(1)
    expect(session.world.memory.names).toEqual(['drone-1'])
    const order = session.world.orders.find(item => item.id === 'odile')!
    order.shipped = 4
    session.world.furnace.coal = 1
    session.world.steelMade = 1
    expect(session.complete()).toBe(true)
    expect(session.world.drones.map(drone => drone.name)).toEqual(['drone-1', 'drone-2'])
    expect(session.world.drones[1]?.pos).toEqual(session.world.depot.pos)
    expect(machineList(session.world).some(row => row.id === 'drone-2')).toBe(true)
    expect(inspectMachine(session.world, kettlewick, 'drone-2')?.name).toBe('drone-2')
    session.step(1)
    expect(session.world.memory.names).toEqual(['drone-1', 'drone-2'])
    const shown = declarations(factoryBricks(kettlewick), new Set(), session.world.drones.map(drone => drone.name))
    expect(shown).toContain('"drone-1" | "drone-2"')
  } finally { session.dispose() }
})

test('an old save keeps drone-2 only after Odile or a bought drone', () => {
  const stray = createWorld(kettlewick)
  stray.drones.push({
    name: 'drone-2', pos: { ...stray.depot.pos }, cargo: 0, capacity: 3, carrying: null, source: '', dig: null, task: null,
  })
  stray.signals.drones['drone-2'] = { cargo: 0, capacity: 3, idle: true }
  migrateWorld(stray)
  expect(stray.drones.map(drone => drone.name)).toEqual(['drone-1'])
  expect(stray.signals.drones['drone-2']).toBeUndefined()

  const bought = createWorld(kettlewick)
  bought.bought = ['drone']
  migrateWorld(bought)
  expect(bought.drones.map(drone => drone.name)).toEqual(['drone-1', 'drone-2'])
  migrateWorld(bought)
  expect(bought.drones.filter(drone => drone.name === 'drone-2')).toHaveLength(1)
})

test('level span uses the same steps as the quest chain', () => {
  expect(levelSpan(0)).toEqual({ level: 1, start: 0, next: 10 })
  expect(levelSpan(10)).toEqual({ level: 2, start: 10, next: 20 })
  expect(levelSpan(139)).toEqual({ level: 5, start: 85, next: 140 })
  expect(levelSpan(170)).toEqual({ level: 7, start: 170, next: null })
})

const haul = `import { drones, veins, furnace, depot, orders, findPath } from "inherit"
function bringHome(drone) {
  const kind = drone.cargoKind
  if (kind === "ingot" || kind === "steel") {
    if (drone.isNear(depot)) drone.unload(depot)
    else drone.moveAlong(findPath(drone.pos, depot.pos))
    return true
  }
  if (!kind && (furnace.output > 0 || furnace.steel > 0)) {
    if (drone.isNear(furnace)) drone.pickup(furnace)
    else drone.moveAlong(findPath(drone.pos, furnace.pos))
    return true
  }
  return false
}
export function onTick() {
  const drone = drones()[0]
  if (bringHome(drone)) return
  const order = orders()[0]
  if (order && order.shipped >= 2) return
  const vein = veins().find(item => item.kind === "ore")
  if (!vein) return
  const home = drone.cargo >= drone.capacity
  const target = home ? furnace : vein
  if (!drone.isNear(target)) drone.moveAlong(findPath(drone.pos, target.pos))
  else if (home) drone.unload(furnace)
  else drone.mine(vein)
  if (furnace.output < 6 && furnace.input >= 2) furnace.smelt()
}`

const ingots = haul.replace('if (order && order.shipped >= 2) return', '')

const survey = `import { drones, veins, depot } from "inherit"
export function onTick() {
  const cart = drones()[0]
  if (!cart || cart.busy) return
  if (cart.cargo) { cart.unload(depot); return }
  const vein = veins().find(item => item.name === "D")
  if (vein) cart.mine(vein)
}`

const grates = `import { drones, veins, furnace, press, depot } from "inherit"
export function onTick() {
  if (!press.installed) return
  if (press.count("grate") < 2) press.start("grate")
  if (!furnace.steel) furnace.start("alloy")
  const [feeder, hauler] = drones()
  const ore = veins().find(vein => vein.kind === "ore")
  const coal = veins().find(vein => vein.kind === "coal")
  for (const [cart, role] of [[feeder, "steel"], [hauler, "grate"]]) {
    if (!cart || cart.busy) continue
    if (cart.cargo) {
      const raw = cart.cargoKind === "ore" || cart.cargoKind === "coal"
      cart.unload(raw ? furnace : depot)
      continue
    }
    if (role === "grate" && press.count("grate") > 0) {
      cart.transfer("grate", press, depot, 1)
      continue
    }
    if (role === "steel" && furnace.steel > 0 && press.count("steel") < 2) {
      cart.transfer("steel", furnace, press, Math.min(furnace.steel, 2, cart.capacity))
      continue
    }
    const vein = role === "steel" && furnace.coal < 1 ? coal : ore
    if (!vein) continue
    cart.mine(vein)
  }
}`

const bring = `function bringHome(drone) {
  const kind = drone.cargoKind
  if (kind === "ingot" || kind === "steel") {
    if (drone.isNear(depot)) drone.unload(depot)
    else drone.moveAlong(findPath(drone.pos, depot.pos))
    return true
  }
  if (!kind && (furnace.output > 0 || furnace.steel > 0)) {
    if (drone.isNear(furnace)) drone.pickup(furnace)
    else drone.moveAlong(findPath(drone.pos, furnace.pos))
    return true
  }
  return false
}
`

const steel = `import { drones, veins, furnace, depot, findPath } from "inherit"
${bring}export function onTick() {
  const drone = drones()[0]
  if (bringHome(drone)) return
  const ore = veins().find(vein => vein.kind === "ore")
  const coal = veins().find(vein => vein.kind === "coal")
  const fetchingCoal = drone.carrying === "coal" || (furnace.coal < 1 && furnace.input >= 2 && drone.cargo === 0)
  const vein = fetchingCoal ? coal : ore
  if (!vein) return
  const home = drone.cargo >= (fetchingCoal ? 1 : drone.capacity)
  const target = home ? furnace : vein
  if (!drone.isNear(target)) drone.moveAlong(findPath(drone.pos, target.pos))
  else if (home) drone.unload(furnace)
  else drone.mine(vein)
  if (furnace.steel < 6 && furnace.input >= 2 && furnace.coal >= 1) furnace.alloy()
}`

const everyPath = `import { drones, furnace, findPath } from "inherit"
export function onTick() {
  for (const drone of drones()) drone.moveAlong(findPath(drone.pos, furnace.pos))
}`

const remembered = `import { drones, veins, furnace, depot, findPath, memory } from "inherit"
function walk(drone, target) {
  const key = drone.name + ">" + target.pos.x + "," + target.pos.y
  let path = memory[key]
  const onPath = path && path.some(cell => cell.x === drone.pos.x && cell.y === drone.pos.y)
  const startsHere = path && Math.abs(path[0].x - drone.pos.x) + Math.abs(path[0].y - drone.pos.y) === 1
  if (!onPath && !startsHere) path = memory[key] = findPath(drone.pos, target.pos)
  drone.moveAlong(path)
}
function carry(drone) {
  const kind = drone.cargoKind
  if (kind === "ingot" || kind === "steel") {
    if (drone.isNear(depot)) drone.unload(depot)
    else walk(drone, depot)
    return true
  }
  if (!kind && (furnace.output > 0 || furnace.steel > 0)) {
    if (drone.isNear(furnace)) drone.pickup(furnace)
    else walk(drone, furnace)
    return true
  }
  return false
}
export function onTick() {
  const ore = veins().find(vein => vein.kind === "ore")
  const coal = veins().find(vein => vein.kind === "coal")
  for (const drone of drones()) {
    if (carry(drone)) continue
    const vein = drone.name === "drone-2" ? coal : ore
    if (!vein) continue
    if (drone.cargo > 0 && drone.carrying && drone.carrying !== vein.kind) {
      if (!drone.isNear(furnace)) walk(drone, furnace)
      else drone.unload(furnace)
      continue
    }
    const home = drone.cargo >= drone.capacity
    const target = home ? furnace : vein
    if (!drone.isNear(target)) walk(drone, target)
    else if (home) {
      const room = vein.kind === "coal" ? furnace.coalMax - furnace.coal : furnace.inputMax - furnace.input
      if (room > 0) drone.unload(furnace)
    } else drone.mine(vein)
  }
  if (furnace.steel < 6 && furnace.input >= 2 && furnace.coal >= 1) furnace.alloy()
}`

const richHaul = `import { drones, veins, furnace, depot, findPath, prospect, memory } from "inherit"
${bring}export function onTick() {
  if (!memory.opened) { prospect(); memory.opened = true }
  const vein = veins().find(item => item.name === "C") || veins().find(item => item.kind === "ore")
  const drone = drones()[0]
  if (bringHome(drone)) return
  if (!vein) return
  const home = drone.cargo >= drone.capacity
  const target = home ? furnace : vein
  if (!drone.isNear(target)) drone.moveAlong(findPath(drone.pos, target.pos))
  else if (home) drone.unload(furnace)
  else drone.mine(vein)
  if (furnace.output < 6 && furnace.input >= 2) furnace.smelt()
}`

const prospected = `import { drones, veins, furnace, depot, findPath, prospect, memory } from "inherit"
${bring}export function onTick() {
  if (!memory.opened) { prospect(); memory.opened = true }
  const vein = veins().find(item => item.kind === "ore")
  const drone = drones()[0]
  if (bringHome(drone)) return
  if (!vein) return
  const home = drone.cargo >= drone.capacity
  const target = home ? furnace : vein
  if (!drone.isNear(target)) drone.moveAlong(findPath(drone.pos, target.pos))
  else if (home) drone.unload(furnace)
  else drone.mine(vein)
  if (furnace.output < 6 && furnace.input >= 2) furnace.smelt()
}`

function open(world: { checks: { status: string }[] }) {
  return world.checks.some(check => check.status !== 'green')
}

async function reach(session: Awaited<ReturnType<typeof createSession>>, limit: number) {
  while (open(session.world) && session.world.tick < limit) session.step(20)
  if (open(session.world)) session.step(limit - session.world.tick)
}

test('each quest pays on completion and the previous program does not pass the next one', async () => {
  const session = await createSession(kettlewick, kettlewick.files)
  try {
    session.step(20)
    expect(session.world.credits).toBe(kettlewick.credits)
    expect(session.accept()).toBe(true)
    session.step(40)
    expect(open(session.world)).toBe(true)
    expect(session.world.credits).toBe(kettlewick.credits)
    expect(session.complete()).toBe(false)

    await session.deploy({ 'main.ts': haul })
    await reach(session, 1200)
    expect(open(session.world)).toBe(false)
    expect(session.world.credits).toBe(kettlewick.credits)
    expect(session.complete()).toBe(true)
    expect(session.world.credits).toBe(kettlewick.credits + 40)
    expect(session.world.questId).toBeUndefined()

    expect(session.accept()).toBe(true)
    expect(session.world.questId).toBe('ines')
    session.step(200)
    expect(session.world.checks.find(check => check.id === 'done')?.status).not.toBe('green')
    await session.deploy({ 'main.ts': survey })
    await reach(session, session.world.tick + 6000)
    expect(open(session.world)).toBe(false)
    expect(session.complete()).toBe(true)
    expect(session.world.credits).toBe(kettlewick.credits + 40 + 60)

    expect(session.accept()).toBe(true)
    expect(session.world.questId).toBe('odile')
    session.step(80)
    expect(session.world.checks.find(check => check.id === 'done')?.status).not.toBe('green')
    expect(session.buy('alloy')).toBe(false)
    expect(session.buy('drone')).toBe(false)
    expect(session.world.drones).toHaveLength(1)
    const held = session.world.credits
    session.world.credits = 10
    expect(session.buy('hopper')).toBe(false)
    expect(session.world.credits).toBe(10)
    session.world.credits = held
    await session.deploy({ 'main.ts': steel })
    await reach(session, session.world.tick + 1500)
    expect(open(session.world)).toBe(false)
    expect(session.complete()).toBe(true)
    expect(session.world.drones.map(drone => drone.name)).toEqual(['drone-1', 'drone-2'])
    expect(session.buy('drone')).toBe(false)

    expect(session.accept()).toBe(true)
    session.step(180)
    expect(open(session.world)).toBe(true)
    await session.deploy({ 'main.ts': grates })
    await reach(session, session.world.tick + 2000)
    expect(open(session.world)).toBe(false)
    expect(session.complete()).toBe(true)

    expect(session.accept()).toBe(true)
    expect(session.world.questId).toBe('harrow')
    session.step(40)
    expect(session.world.checks.find(check => check.id === 'done')?.status).not.toBe('green')
    await session.deploy({ 'main.ts': richHaul })
    await reach(session, session.world.tick + 5000)
    expect(open(session.world)).toBe(false)
    expect(session.complete()).toBe(true)

    expect(session.accept()).toBe(true)
    expect(session.world.questId).toBe('tomas')
    await session.deploy({ 'main.ts': steel })
    session.step(40)
    expect(session.world.checks.find(check => check.id === 'done')?.status).not.toBe('green')
    await session.deploy({ 'main.ts': richHaul })
    await reach(session, session.world.tick + 1200)
    expect(open(session.world)).toBe(false)
    expect(session.complete()).toBe(true)

    expect(session.accept()).toBe(true)
    await session.deploy({ 'main.ts': steel })
    session.step(60)
    expect(session.world.checks.find(check => check.id === 'done')?.status).not.toBe('green')
    await session.deploy({ 'main.ts': prospected })
    await reach(session, session.world.tick + 800)
    expect(open(session.world)).toBe(false)
    expect(session.complete()).toBe(true)

    expect(session.accept()).toBe(true)
    await session.deploy({ 'main.ts': everyPath })
    session.step(30)
    expect(session.world.checks.find(check => check.id === 'memory')?.status).not.toBe('green')
    await session.deploy({ 'main.ts': remembered })
    await reach(session, session.world.tick + 1500)
    expect(open(session.world)).toBe(false)
    expect(session.complete()).toBe(true)
    expect(session.world.status).toBe('More is coming.')
    expect(session.world.credits).toBeGreaterThanOrEqual(0)
  } finally { session.dispose() }
})
