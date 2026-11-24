import { brick, type Brick } from '../core/bricks'
import type { Site, World } from '../core/world'
import { freeAt, kitLines, port, type Item } from './stock'

export interface OrderLine {
  item: Item
  qty: number
  shipped: number
}

export interface Order {
  id: string
  at: number
  item: Item
  qty: number
  lines?: OrderLine[]
  pay: number
  from: string
  who: 'bram' | 'ines' | 'odile' | 'elsie' | 'tomas' | 'pell' | 'wen' | 'harrow'
  role: string
  title: string
  text: string
  building: 'forge' | 'bridge' | 'bakery' | 'mill' | 'riverside' | 'lamp-street' | 'town-hall'
  change: string
  shipped: number
  /** Older saves may still say overdue, late, or expired. A quest order is open until the depot fills it. */
  status: 'open' | 'overdue' | 'on time' | 'late' | 'expired' | 'ready'
}

function canTake(order: Order) { return order.status === 'open' || order.status === 'overdue' }

function creditKit(world: World) {
  const manifest = world.manifest
  if (!manifest) return
  for (const line of kitLines[manifest.active]) {
    const sitting = Math.min(line.qty, freeAt(world, 'depot', line.item))
    const prior = manifest.staged[line.item] ?? 0
    if (sitting > prior) manifest.staged[line.item] = sitting
  }
}

/** The open quest's goods move from the depot onto the order. This is the only delivery. */
export function takeFromDepot(world: World, site: Site) {
  if (!site.questList || !world.questId) return
  const order = world.orders.find(item => item.id === world.questId && canTake(item))
  if (!order) return
  if (order.item === 'ore') return
  if (order.lines?.length) {
    let shipped = 0
    let full = true
    for (const line of order.lines) {
      const take = Math.min(line.qty - line.shipped, freeAt(world, 'depot', line.item))
      if (take > 0) {
        port(world, 'depot')?.take(line.item, take)
        line.shipped += take
      }
      shipped += line.shipped
      if (line.shipped < line.qty) full = false
    }
    order.shipped = shipped
    if (full) order.status = 'ready'
    return
  }
  if (world.questId === 'crew') {
    creditKit(world)
    const crate = world.manifest.active
    if (freeAt(world, 'depot', crate) < 1) return
    port(world, 'depot')?.take(crate, 1)
    if (crate === 'winch') {
      world.manifest.winch = true
      world.manifest.active = 'lamp'
      world.manifest.staged = {}
      order.shipped = Math.max(order.shipped, 1)
      return
    }
    world.manifest.lamp = true
    order.shipped = order.qty
    order.status = 'ready'
    return
  }
  const stock = freeAt(world, 'depot', order.item)
  const amount = Math.min(order.qty - order.shipped, stock)
  if (amount <= 0) return
  port(world, 'depot')?.take(order.item, amount)
  order.shipped += amount
  if (order.shipped >= order.qty) order.status = 'ready'
}

export function orderBricks(site: Site): Brick[] {
  return [
    brick('credits', 'function credits(): number', 'Read the balance.', 'credits()', site.costs.read,
      ({ world }) => world.credits),
    brick('orders', 'function orders(): Order[]', 'Read the open quest order.', 'orders()[0]', site.costs.read,
      ({ world }) => world.orders.filter(canTake)),
  ]
}
