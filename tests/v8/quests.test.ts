import { expect, test } from 'vitest'
import { kettlewick, uncleMain } from '../../packages/sim/src/v8'
import { levelSpan } from '../../packages/sim/src/v8/quests'
import { createSession } from '../../packages/sandbox/src/v8'

test('level span uses the same steps as the quest chain', () => {
  expect(levelSpan(0)).toEqual({ level: 1, start: 0, next: 20 })
  expect(levelSpan(20)).toEqual({ level: 2, start: 20, next: 40 })
  expect(levelSpan(144)).toEqual({ level: 6, start: 115, next: 145 })
  expect(levelSpan(145)).toEqual({ level: 7, start: 145, next: null })
})

const haul = `import { drones, veins, furnace, depot, orders, ship, findPath } from "inherit"
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
  if (order && order.shipped >= 4) return
  const vein = veins().find(item => item.kind === "ore")
  if (!vein) return
  const home = drone.cargo >= drone.capacity
  const target = home ? furnace : vein
  if (!drone.isNear(target)) drone.moveAlong(findPath(drone.pos, target.pos))
  else if (home) drone.unload(furnace)
  else drone.mine(vein)
  if (furnace.output < 6 && furnace.input >= 2) furnace.smelt()
  for (const order of orders()) ship(order)
}`

const ingots = haul.replace('if (order && order.shipped >= 4) return', '')

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

const steel = `import { drones, veins, furnace, depot, orders, ship, findPath } from "inherit"
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
  for (const order of orders()) ship(order)
}`

const pair = `import { drones, veins, furnace, depot, orders, ship, findPath } from "inherit"
${bring}export function onTick() {
  const ore = veins().find(vein => vein.kind === "ore")
  const coal = veins().find(vein => vein.kind === "coal")
  for (const drone of drones()) {
    if (bringHome(drone)) continue
    const vein = drone.name === "drone-2" ? coal : ore
    if (!vein) continue
    if (drone.cargo > 0 && drone.carrying && drone.carrying !== vein.kind) {
      if (drone.isNear(furnace)) drone.unload(furnace)
      else drone.moveAlong(findPath(drone.pos, furnace.pos))
      continue
    }
    const home = drone.cargo >= drone.capacity
    const target = home ? furnace : vein
    if (!drone.isNear(target)) drone.moveAlong(findPath(drone.pos, target.pos))
    else if (home) drone.unload(furnace)
    else drone.mine(vein)
  }
  if (furnace.steel < 6 && furnace.input >= 2 && furnace.coal >= 1) furnace.alloy()
  for (const order of orders()) ship(order)
}`

const remembered = `import { drones, veins, furnace, depot, orders, ship, findPath, memory } from "inherit"
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
    else if (home) drone.unload(furnace)
    else drone.mine(vein)
  }
  if (furnace.steel < 6 && furnace.input >= 2 && furnace.coal >= 1) furnace.alloy()
  for (const order of orders()) ship(order)
}`

const richHaul = `import { drones, veins, furnace, depot, orders, ship, findPath, prospect, memory } from "inherit"
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
  for (const order of orders()) ship(order)
}`

const prospected = `import { drones, veins, furnace, depot, orders, ship, findPath, prospect, memory } from "inherit"
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
  for (const order of orders()) ship(order)
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
    expect(session.world.credits).toBe(300)
    expect(session.accept()).toBe(true)
    session.step(40)
    expect(open(session.world)).toBe(true)
    expect(session.world.credits).toBe(300)
    expect(session.complete()).toBe(false)

    await session.deploy({ 'main.ts': haul })
    await reach(session, 1200)
    expect(open(session.world)).toBe(false)
    expect(session.world.credits).toBe(300)
    expect(session.complete()).toBe(true)
    expect(session.world.credits).toBe(380)
    expect(session.world.questId).toBeUndefined()

    expect(session.accept()).toBe(true)
    expect(session.world.questId).toBe('ines')
    session.step(200)
    expect(session.world.checks.find(check => check.id === 'done')?.status).not.toBe('green')
    await session.deploy({ 'main.ts': ingots })
    await reach(session, session.world.tick + 6000)
    expect(open(session.world)).toBe(false)
    expect(session.complete()).toBe(true)
    expect(session.world.credits).toBe(470)

    expect(session.accept()).toBe(true)
    expect(session.world.questId).toBe('odile')
    session.step(80)
    expect(session.world.checks.find(check => check.id === 'done')?.status).not.toBe('green')
    expect(session.buy('alloy')).toBe(false)
    const held = session.world.credits
    session.world.credits = 10
    expect(session.buy('drone')).toBe(false)
    expect(session.world.credits).toBe(10)
    session.world.credits = held
    await session.deploy({ 'main.ts': steel })
    await reach(session, session.world.tick + 1500)
    expect(open(session.world)).toBe(false)
    expect(session.complete()).toBe(true)

    expect(session.accept()).toBe(true)
    session.step(180)
    expect(open(session.world)).toBe(true)
    expect(session.buy('drone')).toBe(true)
    await session.deploy({ 'main.ts': pair })
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
    await session.deploy({ 'main.ts': pair })
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
