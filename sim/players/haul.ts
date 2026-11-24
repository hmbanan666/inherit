import { depot, furnace, veins, type Drone } from 'inherit'

// A task walks to its destination and finishes on its own.
export function unload(drone: Drone) {
  const room = drone.cargoKind === 'coal'
    ? furnace.coalMax - furnace.coal
    : furnace.inputMax - furnace.input
  const raw = drone.cargoKind === 'ore' || drone.cargoKind === 'coal'
  drone.unload(raw && room > 0 ? furnace : depot)
}

export function mine(drone: Drone, kind: 'ore' | 'coal') {
  const deposits = veins().filter(vein => vein.kind === kind)
  deposits.sort((left, right) => left.ticksPerUnit / left.yield - right.ticksPerUnit / right.yield)
  if (deposits[0]) drone.mine(deposits[0])
}
