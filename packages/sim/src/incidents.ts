import { RECIPES } from './catalog'
import type { MaterialId } from './campaign-api'
import type { CampaignWorld, Incident, OrderState } from './model'

/** Trace the stopped parcel through the current recipes and belts to reachable docks. */
export function affectedOrders(world: CampaignWorld, incident: Incident, orders: OrderState[]): string[] {
  if (!orders.length) return []
  const source = world.machines.find((m) => m.id === incident.machineId)
  if (!source) return []
  let start = source.id
  let material: MaterialId | undefined = source.output?.kind ?? source.queue[0]?.kind
  if (source.deposit)
    material = source.deposit === 'coal' ? 'coal' : source.deposit === 'iron' ? 'iron-ore' : 'copper-ore'
  if (source.kind === 'truck') {
    const trip = world.trips.find((t) => t.truckId === source.id)
    const receipt = world.receipts.find((r) => r.key === incident.key)
    start = trip?.to ?? receipt?.to ?? start
    const arrival = world.lastEvents.find((e) => e.type === 'itemArrived' && e.machineId === start)
    material = trip?.cargo?.kind ?? (arrival?.type === 'itemArrived' ? arrival.item.kind : undefined)
  }
  if (!material) return []
  const pending: [string, MaterialId][] = [[start, material]]
  const visited = new Map<string, Set<MaterialId>>()
  const ships = new Set<MaterialId>()
  while (pending.length) {
    const [id, input] = pending.pop()!
    const seen = visited.get(id) ?? new Set<MaterialId>()
    if (seen.has(input)) continue
    seen.add(input)
    visited.set(id, seen)
    const machine = world.machines.find((m) => m.id === id)!
    let output = input
    if (machine.kind === 'dock') ships.add(input)
    if (machine.recipe && machine.id !== source.id) {
      const recipe = RECIPES[machine.recipe]
      if (!recipe.inputs[input] && !recipe.defectiveInput) continue
      output = recipe.output
    }
    for (const belt of world.belts) if (belt.from === id) pending.push([belt.to, output])
  }
  return orders
    .filter((order) => [...ships].some((kind) => (order.items[kind] ?? 0) > (order.filled[kind] ?? 0)))
    .map((o) => o.id)
}
