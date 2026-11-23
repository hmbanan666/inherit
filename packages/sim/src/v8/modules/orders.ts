import { brick, type Brick } from '../core/bricks'
import type { Site, World } from '../core/world'

export interface ScheduledOrder {
  id: string
  at: number
  /** Open only after the order with this id, in the same round, has been paid. */
  after?: string
  item: 'ingot' | 'steel'
  qty: number
  due: number
  pay: number
  from: string
  who: 'bram' | 'ines' | 'odile' | 'elsie' | 'tomas' | 'pell' | 'wen' | 'harrow'
  role: string
  title: string
  text: string
  building: 'forge' | 'bridge' | 'bakery' | 'mill' | 'riverside' | 'lamp-street' | 'town-hall'
  change: string
}
export interface Order extends ScheduledOrder {
  shipped: number
  status: 'open' | 'overdue' | 'on time' | 'late' | 'expired' | 'ready'
}
function canShip(order: Order) { return order.status === 'open' || order.status === 'overdue' }
function roundId(world: World, id: string) {
  return world.orderRoundAt ? id + '-' + world.orderRoundAt : id
}

export function updateOrders(world: World, site: Site) {
  if (site.questList) return
  if (site.repeatOrders && world.orders.length === site.orderSchedule.length && !world.orders.some(canShip)) {
    world.orderRoundAt = world.tick
    world.orders = []
    world.ledger.waste = 0
  }
  for (const scheduled of site.orderSchedule) {
    const id = roundId(world, scheduled.id)
    if (world.orders.some(order => order.id === id)) continue
    if (scheduled.after) {
      const prev = world.orders.find(order => order.id === roundId(world, scheduled.after!))
      if (!prev || (prev.status !== 'on time' && prev.status !== 'late')) continue
    } else if (world.orderRoundAt + scheduled.at !== world.tick) continue
    world.orders.push({
      ...scheduled, at: world.tick, due: world.orderRoundAt + scheduled.due, shipped: 0, status: 'open', id,
    })
  }
  for (const order of world.orders) {
    if (!canShip(order) || order.due >= world.tick) continue
    if (order.status === 'open') order.pay *= site.latePayFraction
    order.status = world.tick <= order.due + site.graceTicks ? 'overdue' : 'expired'
  }
}

/** Villagers take the open quest's goods from the depot. */
export function takeFromDepot(world: World, site: Site) {
  if (!site.questList || !world.questId) return
  const order = world.orders.find(item => item.id === world.questId && (item.status === 'open' || item.status === 'overdue'))
  if (!order) return
  const stock = order.item === 'steel' ? world.depot.steel : world.depot.ingots
  const amount = Math.min(order.qty - order.shipped, stock)
  if (amount <= 0) return
  if (order.item === 'steel') world.depot.steel -= amount
  else world.depot.ingots -= amount
  order.shipped += amount
  if (order.shipped >= order.qty) order.status = 'ready'
}

export function orderBricks(site: Site): Brick[] {
  return [
    brick('credits', 'function credits(): number', 'Read the balance.', 'credits()', site.costs.read,
      ({ world }) => world.credits),
    brick('orders', 'function orders(): Order[]', 'Read orders still accepting shipments.', 'orders()[0]', site.costs.read,
      ({ world }) => world.orders.filter(canShip)),
    brick('ship', 'function ship(order: Order, qty?: number): void', 'Send the order its own item. A quest pays when you complete it.',
      'for (const order of orders()) ship(order)', site.costs.action, ({ world }, ref, qty) => {
        const order = world.orders.find(o => o.id === (ref as Partial<Order> | null)?.id)
        const open = world.orders.filter(canShip).map(item => `${item.id} ${item.item} ${item.shipped}/${item.qty}`).join(', ') || 'none'
        if (!order || !canShip(order)) throw new Error(`No open order matches that id. Open orders: ${open}.`)
        if (qty !== undefined && (typeof qty !== 'number' || !Number.isSafeInteger(qty) || qty < 0))
          throw new Error(`ship qty ${String(qty)} is not a whole nonnegative number. ${order.id} wants ${order.item}. furnace ${order.item === 'steel' ? 'steel ' + world.furnace.steel : 'output ' + world.furnace.output}.`)
        const remaining = order.qty - order.shipped
        const fromDepot = !!site.questList
        const stock = order.item === 'steel'
          ? (fromDepot ? world.depot.steel : world.furnace.steel)
          : (fromDepot ? world.depot.ingots : world.furnace.output)
        const amount = Math.min(qty ?? remaining, remaining, stock)
        if (order.item === 'steel') {
          if (fromDepot) world.depot.steel -= amount
          else world.furnace.steel -= amount
        } else if (fromDepot) world.depot.ingots -= amount
        else world.furnace.output -= amount
        order.shipped += amount
        if (order.shipped !== order.qty) return
        if (site.questList) {
          order.status = 'ready'
          return
        }
        const onTime = world.tick <= order.due
        order.status = onTime ? 'on time' : 'late'
        const payout = Math.max(0, order.pay - world.ledger.waste)
        world.ledger.waste = 0
        world.ledger.income += payout
        world.credits += payout
        if (!world.growth.includes(order.change)) world.growth.push(order.change)
      }),
  ]
}
