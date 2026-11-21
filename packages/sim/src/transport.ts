import type { FactoryEvent, MaterialItem } from './campaign-api'
import { MACHINES } from './catalog'
import type { CampaignBelt, CampaignMachine, CampaignWorld, Incident } from './model'

export function emit(world: CampaignWorld, event: FactoryEvent) {
  world.lastEvents.push(event)
}
export function produce(world: CampaignWorld, machine: CampaignMachine) {
  machine.stats.processed++
  machine.recentProduction.push(world.tick)
  machine.status = 'working'
}
export function hasRoom(world: CampaignWorld, machine: CampaignMachine, item: MaterialItem) {
  const reserved =
    machine.kind === 'depot'
      ? world.trips.filter((t) => t.from === machine.id && t.outcome === 'breakdown').length
      : 0
  const spec = MACHINES[machine.kind]
  // A processor has a separate input bin for each material in a recipe.
  const used = spec.defaultRecipe
    ? machine.queue.filter((q) => q.kind === item.kind).length
    : machine.queue.length
  return used + reserved < spec.bin
}
export function arrive(world: CampaignWorld, machine: CampaignMachine, item: MaterialItem) {
  machine.queue.push(item)
  emit(world, { type: 'itemArrived', tick: world.tick, machineId: machine.id, item: { ...item } })
}
export function feed(b: CampaignBelt | undefined, item: MaterialItem) {
  if (!b || b.items.some((i) => i.position === 0)) return false
  b.items.push({ ...item, id: ++b.sequence, position: 0 })
  return true
}
export function moveBelts(world: CampaignWorld, machines: Map<string, CampaignMachine>) {
  const incoming = new Map<string, CampaignBelt[]>()
  for (const belt of world.belts) {
    const belts = incoming.get(belt.to)
    if (belts) belts.push(belt)
    else incoming.set(belt.to, [belt])
  }
  for (const [id, belts] of incoming) {
    const dest = machines.get(id)!
    // Resume after the last successful arrival when several belts compete for one slot.
    const first = belts.findIndex((b) => b.from === dest.lastInput) + 1
    for (let i = 0; i < belts.length; i++) {
      const belt = belts[(first + i) % belts.length]
      let ahead = belt.path.length
      belt.items = belt.items.filter((parcel) => {
        if (parcel.position === belt.path.length - 1 && hasRoom(world, dest, parcel)) {
          const item: MaterialItem = { kind: parcel.kind }
          if (parcel.defect) item.defect = true
          arrive(world, dest, item)
          dest.lastInput = belt.from
          return false
        }
        parcel.position = Math.min(parcel.position + 1, ahead - 1)
        ahead = parcel.position
        return true
      })
    }
  }
}
export function openIncident(
  world: CampaignWorld,
  machineId: string,
  cause: Incident['cause'],
  key?: string,
) {
  const open = world.incidents.find(
    (i) => i.machineId === machineId && i.cause === cause && i.key === key && i.endTick === undefined,
  )
  if (open) return open
  const entry: Incident = {
    id: world.nextIncidentId++,
    machineId,
    cause,
    startTick: world.tick,
    affectedOrders: [],
  }
  if (key !== undefined) entry.key = key
  if (world.incidents.length >= 128) {
    const oldestClosed = world.incidents.findIndex((incident) => incident.endTick !== undefined)
    if (oldestClosed !== -1) world.incidents.splice(oldestClosed, 1)
  }
  world.incidents.push(entry)
  return entry
}
