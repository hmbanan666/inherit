import type { World } from './core/world'
import type { QuestDef, QuestTest } from './quests'

export type CheckState = 'pending' | 'passing' | 'failed'

export interface CheckReading {
  id: string
  text: string
  state: CheckState
  reason?: string
}

const shipped = (world: World, id: string) => world.orders.find(order => order.id === id)?.shipped ?? 0

function fullAtVein(world: World) {
  for (const drone of world.drones) {
    if (drone.capacity < 1 || drone.cargo < drone.capacity) continue
    const vein = world.veins.find(item => !item.hidden && item.pos.x === drone.pos.x && item.pos.y === drone.pos.y)
    if (vein) return `${drone.name} is full at Vein ${vein.name}`
  }
}

/** A fact from the world. It names a field. It does not say what to do. */
function reasonFor(world: World, quest: QuestDef, id: string) {
  const stuck = fullAtVein(world)
  const furnace = world.furnace
  if (id === 'ore' || id === 'ingot' || (id === 'done' && quest.item === 'ingot')) {
    if (stuck) return stuck
    if (furnace.input === 0 && furnace.output === 0 && world.ingotsMade === 0) return 'furnace input 0'
    return
  }
  if (id === 'coal' || id === 'steel' || id === 'both' || (id === 'done' && quest.item === 'steel')) {
    if (stuck && (id === 'coal' || id === 'both')) return stuck
    if (furnace.coal === 0 && world.steelMade === world.steelMark) return 'furnace coal 0'
    if (furnace.input === 0) return 'furnace input 0'
    if (id === 'both' && furnace.input < 2) return `furnace input ${furnace.input}`
    return
  }
  if (id === 'drone') {
    const drone = world.drones.find(item => item.name === 'drone-2')
    if (drone && drone.pos.x === world.depot.pos.x && drone.pos.y === world.depot.pos.y) return 'drone-2 is at the depot'
    return
  }
  if (id === 'other') {
    const vein = world.veins.find(item => item.name === 'A')
    if (vein && vein.left === 0 && world.oreAfterDry === 0) return 'ore after dry 0'
    return
  }
  if (id === 'smelt' && world.ingotsMade === 0) return 'ingots made 0'
  if (id === 'memory' && world.pathWindow.length >= 8) {
    const calls = world.pathWindow.reduce((sum, count) => sum + count, 0)
    if (calls > 4) return `path calls ${calls}`
  }
}

function progress(world: World, quest: QuestDef, test: QuestTest) {
  if (test.id === 'done') return `${shipped(world, quest.id)}/${quest.qty}`
  if (test.id === 'memory') return `${Math.min(world.pathWindow.length, 8)}/8`
}

export function readChecks(world: World, quest: QuestDef): CheckReading[] {
  return quest.tests.map(test => {
    const passing = test.pass(world)
    const count = progress(world, quest, test)
    const reason = passing ? undefined : reasonFor(world, quest, test.id)
    return {
      id: test.id,
      text: count ? `${test.text} ${count}` : test.text,
      state: passing ? 'passing' : reason ? 'failed' : 'pending',
      reason,
    }
  })
}

export function inspectAt(world: Pick<World, 'drones' | 'veins' | 'furnace' | 'depot'>, x: number, y: number) {
  const drone = world.drones.find(item => item.pos.x === x && item.pos.y === y)
  if (drone) return {
    id: drone.name,
    fields: [`pos ${drone.pos.x},${drone.pos.y}`, `cargo ${drone.cargo}/${drone.capacity}`],
  }
  const vein = world.veins.find(item => !item.hidden && item.pos.x === x && item.pos.y === y)
  if (vein) return {
    id: `Vein ${vein.name}`,
    fields: [`pos ${vein.pos.x},${vein.pos.y}`, `ore left ${vein.left}`],
  }
  if (world.furnace.pos.x === x && world.furnace.pos.y === y) return {
    id: 'furnace',
    fields: [`pos ${world.furnace.pos.x},${world.furnace.pos.y}`, `input ${world.furnace.input}`],
  }
  if (world.depot.pos.x === x && world.depot.pos.y === y) return {
    id: 'depot',
    fields: [`pos ${world.depot.pos.x},${world.depot.pos.y}`, `ore ${world.depot.ore}`],
  }
}
