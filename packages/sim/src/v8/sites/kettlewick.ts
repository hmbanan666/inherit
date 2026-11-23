import type { Site } from '../core/world'

const depot = { x: 1, y: 1 }

export const kettlewick: Site = {
  id: 'kettlewick',
  seed: 1,
  grid: { width: 16, height: 6 },
  depot: { pos: depot, ore: 0 },
  drones: ['drone-1', 'drone-2', 'drone-3'].map(name => ({
    name, pos: { ...depot }, cargo: 0, capacity: 3,
  })),
  veins: [
    { name: 'A', pos: { x: 6, y: 2 }, left: 800 },
    { name: 'B', pos: { x: 14, y: 2 }, left: 1200 },
  ],
  furnace: { pos: { x: 2, y: 1 }, input: 0, output: 0 },
  recipe: { ore: 2, ingots: 1, ticks: 4, fuel: 1 },
  rentPerTick: 0.5,
  credits: 300,
  tickMs: 500,
  speeds: [1, 2, 4],
  cpuLimit: 30,
  costs: { read: 0, action: 1, findPath: 3 },
  orePerMine: 1,
  files: {
    'main.ts': `// Kettlewick Works. It works. Don't touch it. - Uncle Ambrose
import { drones, veins, depot, findPath } from "inherit"

export function onTick() {
  for (const drone of drones()) {
    let best = veins()[0]
    for (const vein of veins()) {
      if (findPath(drone.pos, vein.pos).length < findPath(drone.pos, best.pos).length) best = vein
    }
    const target = drone.cargo < drone.capacity ? best : depot
    const path = findPath(drone.pos, target.pos)
    if (!drone.isNear(target)) drone.moveAlong(path)
    else if (target === best) drone.mine(best)
    else drone.unload(depot)
  }
}`,
  },
}
