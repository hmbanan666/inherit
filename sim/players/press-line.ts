import { depot, drones, furnace, press } from 'inherit'

// One cart. Steel goes furnace → press, a grate goes press → depot.
export function onTick() {
  if (!press.installed) return
  const drone = drones()[0]
  if (!drone) return
  const finished = press.count('grate') + press.count('plate') + press.count('blank')
  if (finished < 3) press.start('grate')
  if (!furnace.steel) furnace.start('alloy')
  if (drone.busy) return
  if (drone.cargo > 0) {
    const raw = drone.cargoKind === 'ore' || drone.cargoKind === 'coal'
    drone.unload(raw ? furnace : depot)
    return
  }
  if (press.count('grate') > 0) {
    drone.transfer('grate', press, depot, 1)
    return
  }
  const need = 2 - press.count('steel')
  if (need > 0 && furnace.steel > 0)
    drone.transfer('steel', furnace, press, Math.min(furnace.steel, need, drone.capacity))
}
