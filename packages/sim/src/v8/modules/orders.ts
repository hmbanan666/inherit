import { brick, type Brick } from '../core/bricks'
import type { Site, World } from '../core/world'
import { freeAt, port } from './stock'

export interface Order {
  id: string
  at: number
  item: 'ingot' | 'steel' | 'ore' | 'grate'
  qty: number
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

/** The open quest's goods move from the depot onto the order. This is the only delivery. */
export function takeFromDepot(world: World, site: Site) {
  if (!site.questList || !world.questId) return
  const order = world.orders.find(item => item.id === world.questId && canTake(item))
  if (!order) return
  if (order.item === 'ore') return
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
