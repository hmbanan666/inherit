import type { World } from './core/world'
import type { QuestDef, QuestTest } from './quests'

export type CheckState = 'pending' | 'passing' | 'failed'

export interface CheckReading {
  id: string
  text: string
  state: CheckState
  reason?: string
}

/** The sim tick is 0.5s, so this is about 10s after the last deploy or Take. */
export const stallTicks = 20

const shipped = (world: World, id: string) => world.orders.find(order => order.id === id)?.shipped ?? 0

export function noteCheckReset(world: World) {
  world.checkSince = world.tick
  world.checkMoved = {}
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function rememberPositions(world: World) {
  const book = (world.checkMoved ??= {})
  for (const drone of world.drones) {
    const id = `pos:${drone.name}`
    const key = `${drone.pos.x},${drone.pos.y}`
    const row = book[id]
    if (!row || row.key !== key) book[id] = { key, at: world.tick }
  }
}

/** A full cart that has stayed on or beside a vein for the stall window. */
function fullStillAtVein(world: World, kind?: 'ore' | 'coal') {
  let best: { name: string; cargo: number; capacity: number; vein: string; dist: number } | undefined
  for (const drone of world.drones) {
    if (drone.capacity < 1 || drone.cargo < drone.capacity) continue
    const here = `${drone.pos.x},${drone.pos.y}`
    const row = world.checkMoved?.[`pos:${drone.name}`]
    if (!row || row.key !== here || world.tick - row.at < stallTicks) continue
    for (const vein of world.veins) {
      if (vein.hidden || (kind && vein.kind !== kind)) continue
      const dist = distance(drone.pos, vein.pos)
      if (dist > 1) continue
      if (!best || dist < best.dist) best = { name: drone.name, cargo: drone.cargo, capacity: drone.capacity, vein: vein.name, dist }
    }
  }
  if (!best) return
  return `${best.name} is full (${best.cargo}/${best.capacity}) at Vein ${best.vein} and not moving`
}

function miningFact(world: World) {
  for (const drone of world.drones) {
    const dig = drone.dig
    if (!dig || dig.ticks < 1) continue
    const vein = world.veins.find(item => item.name === dig.vein)
    if (!vein) continue
    return `${drone.name} mining Vein ${vein.name} (${vein.purity}): ${dig.ticks}/${vein.ticksPerUnit} ticks`
  }
}

/** The first fact that explains why this one check is not passing. */
function blockingFact(world: World, quest: QuestDef, id: string) {
  const furnace = world.furnace
  if (id === 'ore') return fullStillAtVein(world) ?? miningFact(world) ?? (furnace.input >= (furnace.oreMax ?? 6) ? 'furnace full' : 'furnace input 0')
  if (id === 'ingot' || id === 'smelt') {
    if (!world.codedBatch) return 'smeltOnce has not started a batch'
    if (furnace.input >= (furnace.oreMax ?? 6) && furnace.output === 0 && world.ingotsMade === 0) return 'furnace full'
    if (furnace.output === 0 && world.ingotsMade === 0) return 'furnace output 0'
    return `ingots made ${world.ingotsMade}`
  }
  if (id === 'vein') return `vein D ore at the depot ${shipped(world, quest.id)}/${quest.qty}`
  if (id === 'haul') {
    const waiting = world.drones.filter(drone => !world.hauled?.[drone.name]).map(drone => drone.name)
    return waiting.length ? `${waiting.join(' and ')} has not hauled steel or a grate` : 'both carts hauled'
  }
  if (id === 'coal') return fullStillAtVein(world, 'coal') ?? miningFact(world) ?? (furnace.coal >= (furnace.coalMax ?? 3) ? 'furnace full' : 'furnace coal 0')
  if (id === 'steel' || id === 'both') {
    if (furnace.coal >= (furnace.coalMax ?? 3) && furnace.steel === 0 && world.steelMade === world.steelMark) return 'furnace full'
    if (furnace.input >= (furnace.oreMax ?? 6) && furnace.steel === 0 && world.steelMade === world.steelMark) return 'furnace full'
    if (furnace.coal === 0) return 'furnace coal 0'
    if (furnace.input < 2) return `furnace input ${furnace.input}`
    return 'furnace steel 0'
  }
  if (id === 'hands') return `shipped ${shipped(world, quest.id)}/${quest.qty}`
  if (id === 'plate' || id === 'blank') return `${id} shipped ${world.orders.find(order => order.id === quest.id)?.lines?.find(line => line.item === id)?.shipped ?? 0}`
  if (id === 'winch' || id === 'lamp') return world.manifest?.[id] ? `${id} crate received` : `${id} crate waiting at the depot`
  if (id === 'done') {
    if (quest.lines?.length) {
      const parts = quest.lines.map(line => {
        const got = world.orders.find(order => order.id === quest.id)?.lines?.find(item => item.item === line.item)?.shipped ?? 0
        return `${got}/${line.qty} ${line.item}`
      })
      return parts.join(', ')
    }
    if (quest.item === 'ore') return `vein D ore unloaded ${shipped(world, quest.id)}/${quest.qty}`
    if (quest.item === 'grate') return `${world.depot.bin?.qty.grate ?? 0} grate at the depot; carry grates to the depot`
    if (quest.item !== 'ingot' && quest.item !== 'steel') {
      const at = world.depot.bin?.qty[quest.item] ?? 0
      return `${at} ${quest.item} at the depot; carry them to the depot`
    }
    const held = quest.item === 'steel' ? world.furnace.steel : world.furnace.output
    const at = quest.item === 'steel' ? world.depot.steel : world.depot.ingots
    const noun = quest.item === 'ingot' ? (held === 1 ? 'ingot' : 'ingots') : 'steel'
    return `${held} ${noun} in the furnace, ${at} at the depot; carry them to the depot`
  }
  if (id === 'drone') {
    const drone = world.drones.find(item => item.name === 'drone-2')
    if (!drone) return `drones ${world.drones.length}`
    if (drone.pos.x === world.depot.pos.x && drone.pos.y === world.depot.pos.y) return 'drone-2 is at the depot'
    return `drone-2 pos ${drone.pos.x},${drone.pos.y}`
  }
  if (id === 'memory') {
    const calls = world.pathWindow.reduce((sum, count) => sum + count, 0)
    return `path calls ${calls}`
  }
  return 'furnace input 0'
}

function motionKey(world: World, quest: QuestDef, id: string) {
  const drones = world.drones.map(drone => `${drone.name}:${drone.pos.x},${drone.pos.y}:${drone.cargo}`).join(';')
  const furnace = world.furnace
  if (id === 'ingot' || id === 'smelt' || id === 'steel')
    return `${furnace.input}|${furnace.output}|${furnace.steel}|${furnace.readyAt}|${world.ingotsMade}|${world.steelMade}|${world.codedBatch ? 1 : 0}`
  if (id === 'vein' || id === 'haul')
    return `${shipped(world, quest.id)}|${Object.keys(world.hauled ?? {}).sort().join(',')}`
  if (id === 'done' || id === 'hands') return `${shipped(world, quest.id)}|${world.depot.ingots}|${world.depot.steel}|${furnace.output}|${furnace.steel}|${world.manualRuns}|${drones}`
  if (id === 'memory') return world.pathWindow.join(',')
  return `${drones}|${furnace.input}|${furnace.coal}|${furnace.output}`
}

function motionAt(world: World, quest: QuestDef, id: string) {
  if (world.checkSince === undefined) world.checkSince = world.tick
  const book = (world.checkMoved ??= {})
  const key = motionKey(world, quest, id)
  const row = book[id]
  if (!row) book[id] = { key, at: world.checkSince }
  else if (row.key !== key) book[id] = { key, at: world.tick }
  return book[id]!.at
}

function stalled(world: World, quest: QuestDef, id: string) {
  const since = Math.max(world.checkSince ?? world.tick, motionAt(world, quest, id))
  return world.tick - since >= stallTicks
}

function progress(world: World, quest: QuestDef, test: QuestTest) {
  if (test.id === 'done') return `${shipped(world, quest.id)}/${quest.qty}`
  if (test.id === 'memory') return `${Math.min(world.pathWindow.length, 8)}/8`
}

export function readChecks(world: World, quest: QuestDef): CheckReading[] {
  rememberPositions(world)
  for (const test of quest.tests) motionAt(world, quest, test.id)
  let blocker: { label: string; stuck: boolean } | undefined
  return quest.tests.map(test => {
    const count = progress(world, quest, test)
    const text = count ? `${test.text} ${count}` : test.text
    if (test.pass(world)) return { id: test.id, text, state: 'passing' as const }
    if (!blocker) {
      const stuck = stalled(world, quest, test.id)
      blocker = { label: test.text, stuck }
      const fact = blockingFact(world, quest, test.id)
      const live = fact.includes(' mining Vein ')
      return { id: test.id, text, state: stuck ? 'failed' as const : 'pending' as const, reason: stuck || live ? fact : undefined }
    }
    return {
      id: test.id,
      text,
      state: blocker.stuck ? 'failed' as const : 'pending' as const,
      reason: blocker.stuck ? `waits on: ${blocker.label}` : undefined,
    }
  })
}

export function inspectAt(world: Pick<World, 'drones' | 'veins' | 'furnace' | 'depot' | 'press'>, x: number, y: number): { id: string; fields: string[]; dump?: string } | undefined {
  const drone = world.drones.find(item => item.pos.x === x && item.pos.y === y)
  if (drone) return {
    id: drone.name,
    fields: [`pos ${drone.pos.x},${drone.pos.y}`, `cargo ${drone.cargo}/${drone.capacity}`, `cargoKind ${drone.carrying ?? 'null'}`],
    dump: drone.name,
  }
  const vein = world.veins.find(item => !item.hidden && item.pos.x === x && item.pos.y === y)
  if (vein) return {
    id: `Vein ${vein.name}`,
    fields: [`pos ${vein.pos.x},${vein.pos.y}`, `purity ${vein.purity}`, `${vein.ticksPerUnit} ticks per unit`, `${vein.yield} per action`],
  }
  if (world.furnace.pos.x === x && world.furnace.pos.y === y) return {
    id: 'furnace',
    fields: [`pos ${world.furnace.pos.x},${world.furnace.pos.y}`, `input ${world.furnace.input}/${world.furnace.oreMax ?? 6}`, `coal ${world.furnace.coal}/${world.furnace.coalMax ?? 3}`],
  }
  if (world.press && world.press.pos.x === x && world.press.pos.y === y) return {
    id: 'press',
    fields: [`pos ${world.press.pos.x},${world.press.pos.y}`, `recipe ${world.press.recipe ?? 'idle'}`],
  }
  if (world.depot.pos.x === x && world.depot.pos.y === y) return {
    id: 'depot',
    fields: [`pos ${world.depot.pos.x},${world.depot.pos.y}`, `ore ${world.depot.ore}`, `coal ${world.depot.coal ?? 0}`],
  }
}
