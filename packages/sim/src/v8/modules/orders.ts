import { brick, type Brick } from '../core/bricks'
import type { Site, World } from '../core/world'

export interface ScheduledOrder {
  id: string
  at: number
  item: 'ingot'
  qty: number
  due: number
  pay: number
  from: string
}
export interface Order extends ScheduledOrder {
  shipped: number
  status: 'open' | 'overdue' | 'on time' | 'late' | 'expired'
}
function canShip(order: Order) { return order.status === 'open' || order.status === 'overdue' }

export function updateOrders(world: World, site: Site) {
  if (site.repeatOrders && world.orders.length === site.orderSchedule.length && !world.orders.some(canShip)) {
    world.orderRoundAt = world.tick
    world.orders = []
    world.ledger.waste = 0
  }
  for (const scheduled of site.orderSchedule) {
    const at = world.orderRoundAt + scheduled.at
    if (at === world.tick) world.orders.push({
      ...scheduled, at, due: world.orderRoundAt + scheduled.due, shipped: 0, status: 'open',
      id: world.orderRoundAt ? scheduled.id + '-' + world.orderRoundAt : scheduled.id,
    })
  }
  for (const order of world.orders) {
    if (!canShip(order) || order.due >= world.tick) continue
    if (order.status === 'open') order.pay *= site.latePayFraction
    order.status = world.tick <= order.due + site.graceTicks ? 'overdue' : 'expired'
  }
}

export function orderBricks(site: Site): Brick[] {
  return [
    brick('credits', 'function credits(): number', 'Read the balance.', 'credits()', site.costs.read,
      ({ world }) => world.credits),
    brick('orders', 'function orders(): Order[]', 'Read orders still accepting shipments.', 'orders()[0]', site.costs.read,
      ({ world }) => world.orders.filter(canShip)),
    brick('ship', 'function ship(order: Order, qty?: number): void', 'Send available ingots. A completed order pays once.',
      'for (const order of orders()) ship(order)', site.costs.action, ({ world }, ref, qty) => {
        const order = world.orders.find(o => o.id === (ref as Partial<Order> | null)?.id)
        if (!order || !canShip(order)) throw new Error('Choose an open order from orders().')
        if (qty !== undefined && (typeof qty !== 'number' || !Number.isSafeInteger(qty) || qty < 0))
          throw new Error('Ship a whole, nonnegative number of ingots.')
        const remaining = order.qty - order.shipped
        const amount = Math.min(qty ?? remaining, remaining, world.furnace.output)
        world.furnace.output -= amount
        order.shipped += amount
        if (order.shipped !== order.qty) return
        const onTime = world.tick <= order.due
        order.status = onTime ? 'on time' : 'late'
        const payout = Math.max(0, order.pay - world.ledger.waste)
        world.ledger.waste = 0
        world.ledger.income += payout
        world.credits += payout
      }),
  ]
}
