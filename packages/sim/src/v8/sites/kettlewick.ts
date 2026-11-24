import type { Site } from '../core/world'
import { questList } from '../quests'

const depot = { x: 1, y: 1 }

export const kettlewick: Site = {
  id: 'kettlewick',
  seed: 1,
  grid: { width: 16, height: 6 },
  depot: { pos: depot, ore: 0, coal: 0, ingots: 0, steel: 0 },
  drones: [{ name: 'drone-1', pos: { ...depot }, cargo: 0, capacity: 3, carrying: null, source: '' }],
  veins: [
    { name: 'A', pos: { x: 6, y: 2 }, kind: 'ore', purity: 'poor', ticksPerUnit: 5, yield: 1 },
    { name: 'B', pos: { x: 14, y: 2 }, kind: 'coal', purity: 'poor', ticksPerUnit: 5, yield: 1 },
    { name: 'D', pos: { x: 8, y: 3 }, kind: 'ore', purity: 'normal', ticksPerUnit: 2, yield: 1 },
    { name: 'C', pos: { x: 10, y: 4 }, kind: 'ore', purity: 'rich', ticksPerUnit: 1, yield: 2, hidden: true },
  ],
  furnace: { pos: { x: 2, y: 1 }, input: 0, output: 0, oreMax: 6, coalMax: 3 },
  recipe: { ore: 2, ingots: 1, ticks: 4 },
  questList,
  credits: 300,
  tickMs: 500,
  cpuLimit: 30,
  costs: { read: 0, action: 1, findPath: 3 },
  orePerMine: 1,
  files: {
    'main.ts': `import { furnace } from "inherit"

export function smeltOnce() {
  // The furnace can smelt when it holds 2 ore.
}
`,
  },
}

/** Uncle's loop. Old saves still run it. A fresh world does not. */
export const uncleMain = `// Kettlewick Works. It works. Don't touch it. - Uncle Ambrose
import { drones, veins, furnace, findPath } from "inherit"

export function onTick() {
  const drone = drones()[0]
  const vein = veins()[0]
  const home = false
  const target = home ? furnace : vein
  if (!drone.isNear(target)) drone.moveAlong(findPath(drone.pos, target.pos))
  else if (home) drone.unload(furnace)
  else drone.mine(vein)
  if (furnace.input >= 2) furnace.smelt()
}
`
