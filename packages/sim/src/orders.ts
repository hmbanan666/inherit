import type { MaterialId } from './campaign-api'
import type { Campaign, OrderState } from './model'

const sale: Record<MaterialId, number> = {
  'iron-ore': 1,
  'copper-ore': 1,
  coal: 1,
  'iron-ingot': 3,
  'copper-ingot': 3,
  part: 6,
  plate: 5,
  wire: 5,
  gear: 10,
  bracket: 12,
  motor: 30,
}
const customers = [
  ['Pip’s Repair Cart', 'My spare parts drawer is down to one button.'],
  ['Moss Ferry', 'The ferry rattles in B flat. Trying something new.'],
  ['Juniper Cycles', 'It was a tandem. Now it seats the entire band.'],
  ['Nora at Number Nine', 'The garden gate has eaten another hinge.'],
  ['Otis Bell', 'The town clock only strikes lunch. Please hurry.'],
  ['Finch Museum', 'We dropped the exhibit marked industrial strength.'],
]
function draw(c: Campaign, limit: number) {
  const n = (c.economy.orderSeed = (Math.imul(c.economy.orderSeed, 1664525) + 1013904223) >>> 0)
  return Math.floor((n / 0x100000000) * limit)
}
export function orderMaterials(c: Campaign): MaterialId[] {
  const materials: MaterialId[] = ['iron-ingot']
  const has = (id: string) => c.economy.research.includes(id)
  if (has('press')) materials.push('coal', 'part', 'plate')
  if (has('copper')) materials.push('copper-ingot')
  if (has('cutter')) materials.push('wire')
  if (has('cutter') && has('press')) materials.push('gear')
  if (has('assembly')) materials.push('bracket', 'motor')
  return materials
}
function ticket(
  c: Campaign,
  customer: string,
  line: string,
  material: MaterialId,
  qty: number,
  duration: number,
): OrderState {
  let id: string
  do {
    id = 'ticket-' + c.economy.nextOrder++
  } while (c.economy.orders.some((order) => order.id === id))
  return {
    id,
    customer,
    line,
    items: { [material]: qty },
    filled: {},
    status: 'open',
    duration,
    pay: 10 + qty * sale[material],
    reputation: 1,
  }
}
function generate(c: Campaign): OrderState {
  if (c.economy.nextOrder === 1)
    return ticket(
      c,
      'Hale Hardware',
      'Three ingots for a stool. We gave up on four legs.',
      'iron-ingot',
      3,
      480,
    )
  if (c.economy.nextOrder === 2)
    return ticket(
      c,
      'County Freight',
      'Two bookends. Both ends of the book keep escaping.',
      'iron-ingot',
      2,
      480,
    )
  const materials = orderMaterials(c)
  const material = materials[draw(c, materials.length)]
  const [customer, line] = customers[draw(c, customers.length)]
  const advanced = c.economy.research.includes('assembly')
  const duration = advanced ? 180 + draw(c, 200) : 440 + draw(c, 160)
  const qty = material === 'motor' ? 1 : 2 + draw(c, advanced ? 5 : 3)
  return ticket(c, customer, line, material, qty, duration)
}
export function openBoard(c: Campaign): OrderState[] {
  if (!c.progress.completedObjectives.includes('loading')) return []
  const orders = c.economy.orders
  const fresh: OrderState[] = []
  for (let i = orders.filter((o) => o.status === 'open').length; i < 3; i++) {
    const order = generate(c)
    fresh.push(order)
    orders.push(order)
  }
  // Old receipts can leave the noticeboard. Live requests must survive every refresh.
  while (orders.length > 48) {
    const index = orders.findIndex((o) => ['declined', 'done', 'failed'].includes(o.status))
    if (index < 0) break
    orders.splice(index, 1)
  }
  return fresh
}
export function acceptOrder(c: Campaign, id: string) {
  const order = c.economy.orders.find((o) => o.id === id)
  if (
    !order ||
    order.status !== 'open' ||
    c.economy.orders.filter((o) => o.status === 'accepted').length >= 3
  )
    return false
  order.status = 'accepted'
  order.deadline = c.world.tick + order.duration
  return true
}
export function declineOrder(c: Campaign, id: string) {
  const order = c.economy.orders.find((o) => o.id === id)
  if (order?.status !== 'open') return false
  order.status = 'declined'
  return true
}
export const MOTOR_CUSTOMER = 'Lark Island Tram'
export function offerMotorOrder(c: Campaign): OrderState | undefined {
  if (
    c.economy.orders.some(
      (o) => o.customer === MOTOR_CUSTOMER && ['open', 'accepted', 'done'].includes(o.status),
    )
  )
    return
  const order = ticket(
    c,
    MOTOR_CUSTOMER,
    'Three motors, please. The passengers have voted against pushing.',
    'motor',
    3,
    640,
  )
  order.pay = 180
  c.economy.orders.push(order)
  return order
}
export function settleOrders(c: Campaign): OrderState[] {
  const changed = new Set<OrderState>()
  for (const order of c.economy.orders) {
    if (order.status === 'accepted' && c.world.tick > order.deadline!) {
      order.status = 'failed'
      c.economy.reputation--
      changed.add(order)
    }
  }
  for (const event of c.world.lastEvents) {
    if (event.type !== 'delivered') continue
    const item = event.item
    c.economy.money += item.defect ? 1 : sale[item.kind]
    const order = c.economy.orders.find(
      (o) =>
        o.status === 'accepted' &&
        (o.quality !== 'good' || !item.defect) &&
        (o.filled[item.kind] ?? 0) < (o.items[item.kind] ?? 0),
    )
    if (!order) continue
    order.filled[item.kind] = (order.filled[item.kind] ?? 0) + 1
    changed.add(order)
    if (Object.entries(order.items).every(([kind, qty]) => (order.filled[kind as MaterialId] ?? 0) >= qty)) {
      order.status = 'done'
      c.economy.money += order.pay
      c.economy.reputation += order.reputation
      c.economy.researchPoints++
    }
  }
  return [...changed]
}
