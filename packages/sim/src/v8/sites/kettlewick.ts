import type { Site } from '../core/world'

const depot = { x: 1, y: 1 }

export const kettlewick: Site = {
  id: 'kettlewick',
  seed: 1,
  grid: { width: 16, height: 6 },
  depot: { pos: depot, ore: 0 },
  drones: [{ name: 'drone-1', pos: { ...depot }, cargo: 0, capacity: 3 }],
  veins: [
    { name: 'A', pos: { x: 6, y: 2 }, left: 800 },
    { name: 'B', pos: { x: 14, y: 2 }, left: 1200 },
  ],
  furnace: { pos: { x: 2, y: 1 }, input: 0, output: 0 },
  recipe: { ore: 2, ingots: 1, ticks: 4, fuel: 1 },
  orderSchedule: [
    { id: 'hale', at: 0, from: 'Mayor Hale', item: 'ingot', qty: 20, due: 210, pay: 180 },
    { id: 'smithy', at: 1, from: 'Smithy', item: 'ingot', qty: 10, due: 300, pay: 100 },
  ],
  graceTicks: 160,
  latePayFraction: 0.5,
  rentPerTick: 0.5,
  loanAdvance: 60,
  bankruptcyTicks: 50,
  credits: 300,
  tickMs: 500,
  speeds: [1, 2, 4],
  cpuLimit: 30,
  costs: { read: 0, action: 1, findPath: 3 },
  orePerMine: 1,
  files: {
    'main.ts': `// Kettlewick Works. It works. Don't touch it. - Uncle Ambrose
import { drones, veins, furnace, orders, ship, findPath } from "inherit"

export function onTick() {
  const drone = drones()[0]
  const vein = veins()[0]
  const target = drone.cargo < drone.capacity ? vein : furnace
  if (!drone.isNear(target)) drone.moveAlong(findPath(drone.pos, target.pos))
  else if (target === furnace) drone.unload(furnace)
  else drone.mine(vein)
  furnace.smelt()                      // every tick, even when empty
  for (const o of orders()) ship(o)    // first come, first served
}`,
  },
}
