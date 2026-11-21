import type { CampaignMachine, CampaignWorld } from './model'
import { arrive, emit, hasRoom, openIncident, produce } from './transport'

export function dispatch(
  world: CampaignWorld,
  findMachine: (id: string) => CampaignMachine | undefined,
  truckId: string,
  from: string,
  to: string,
  key: string,
): boolean {
  const truck = findMachine(truckId),
    source = findMachine(from),
    dest = findMachine(to)
  if (
    !key ||
    key.length > 128 ||
    truck?.kind !== 'truck' ||
    source?.kind !== 'depot' ||
    dest?.kind !== 'depot' ||
    truck.siteId !== source.siteId ||
    source.siteId === dest.siteId ||
    !world.sites.find((s) => s.id === source.siteId)?.roads.includes(dest.siteId)
  )
    return false
  const receipt = world.receipts.find((r) => r.key === key)
  if (receipt && (receipt.truckId !== truckId || receipt.from !== from || receipt.to !== to)) return false
  if (receipt?.acknowledged) return true
  if (world.trips.some((t) => t.truckId === truckId || t.key === key)) return false
  const base = { truckId, from, to, key, tick: world.tick }
  if (receipt) {
    world.trips.push({ ...base, due: world.tick + 1, outcome: 'ok' })
  } else {
    const cargo = source.queue.shift()
    if (!cargo) return false
    const outcome = world.tripScript.shift() ?? 'ok'
    world.trips.push({ ...base, cargo, due: world.tick + 4, outcome })
    if (outcome === 'breakdown') openIncident(world, truckId, outcome, key)
  }
  return true
}
export function advanceTrips(world: CampaignWorld, findMachine: (id: string) => CampaignMachine | undefined) {
  world.trips = world.trips.filter((trip) => {
    const { truckId, from, to, key, outcome, cargo } = trip
    const truck = findMachine(truckId)!
    truck.status = 'working'
    if (world.tick < trip.due) return true
    if (outcome === 'breakdown') {
      // The origin reserved this slot. Put the same parcel first for a retry.
      const source = findMachine(from)!
      source.queue.unshift(cargo!)
      emit(world, { type: 'itemArrived', machineId: from, item: { ...cargo! }, tick: world.tick })
    } else if (cargo) {
      const dest = findMachine(to)!
      if (!hasRoom(world, dest, cargo)) {
        truck.status = 'blocked'
        return true
      }
      arrive(world, dest, cargo)
      world.receipts.push({ key, truckId, from, to, tick: world.tick, acknowledged: outcome === 'ok' })
      produce(world, truck)
    } else {
      world.receipts.find((r) => r.key === key)!.acknowledged = true
    }
    if (outcome === 'lostAck') openIncident(world, truckId, outcome, key)
    else {
      const incident = world.incidents.find(
        (i) =>
          i.machineId === truckId &&
          i.key === key &&
          i.endTick === undefined &&
          i.cause === (outcome === 'breakdown' ? 'breakdown' : 'lostAck'),
      )
      if (incident) incident.endTick = world.tick
    }
    emit(world, { type: 'truckReturned', tick: world.tick, machineId: truckId, key, outcome })
    return false
  })
}
