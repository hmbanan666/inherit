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
  repeatOrders: true,
  orderSchedule: [
    {
      id: 'bram', at: 0, from: 'Bram', who: 'bram', role: 'Blacksmith', building: 'forge',
      title: 'Horseshoes for the mail horse',
      text: 'The mail horse threw a shoe. I need 4 ingots for horseshoes, and the post can ride tonight.',
      change: 'The forge is lit. The mail horse has shoes.',
      item: 'ingot', qty: 4, due: 2400, pay: 80,
    },
    {
      id: 'odile', at: 0, after: 'bram', from: 'Mayor Odile', who: 'odile', role: 'Mayor', building: 'bridge',
      title: 'Metal for the bridge',
      text: 'The footbridge is out. I need 8 ingots to span the river.',
      change: 'The bridge stands. Kettlewick can cross the river again.',
      item: 'ingot', qty: 8, due: 2400, pay: 160,
    },
  ],
  graceTicks: 160,
  latePayFraction: 0.5,
  credits: 300,
  tickMs: 500,
  cpuLimit: 30,
  costs: { read: 0, action: 1, findPath: 3 },
  orePerMine: 1,
  files: {
    'main.ts': `// Kettlewick Works. It works. Don't touch it. - Uncle Ambrose
import { drones, veins, furnace, orders, ship, findPath } from "inherit"

export function onTick() {
  const drone = drones()[0]
  const vein = veins()[0]
  const home = false // change to: drone.cargo >= drone.capacity
  const target = home ? furnace : vein
  if (!drone.isNear(target)) drone.moveAlong(findPath(drone.pos, target.pos))
  else if (home) drone.unload(furnace)
  else drone.mine(vein)
  if (furnace.input >= 2) furnace.smelt()
  for (const order of orders()) ship(order)
}`,
  },
}
