import type { MaterialId } from './campaign-api'
import type { Campaign, OrderState } from './model'
import type { BuildingId, TownSnapshot } from './town-view'

export const DAY = 1200
type PersonId = TownSnapshot['people'][number]['id']
interface Request {
  beat: number
  who: PersonId
  id: string
  title: string
  text: string
  item: MaterialId
  quantity: number
  building: BuildingId
  change: string
  pay: number
}
export const REQUESTS: Request[] = [
  {
    beat: 1,
    who: 'bram',
    id: 'horseshoes',
    title: 'Horseshoes for the mail horse',
    text: 'The mail horse threw a shoe. Send three iron ingots to my forge and the post can ride tonight.',
    item: 'iron-ingot',
    quantity: 3,
    building: 'forge',
    change: 'The forge lights up. The mail horse trots past with four good shoes.',
    pay: 50,
  },
  {
    beat: 3,
    who: 'elsie',
    id: 'oven-grate',
    title: 'A grate for the bread oven',
    text: 'My last loaf fell through the grate. Bram has a press for 28 coins. Stamp four iron ingots into plates for me?',
    item: 'plate',
    quantity: 4,
    building: 'bakery',
    change: 'Smoke curls from the bakery. Elsie opens her bread stall.',
    pay: 76,
  },
  {
    beat: 5,
    who: 'tomas',
    id: 'lamp-wire',
    title: 'Light for Lamp Street',
    text: 'Folks have been feeling their way home. Draw five coils of wire from copper ingots with a cutter.',
    item: 'wire',
    quantity: 5,
    building: 'lamp-street',
    change: 'Lamp Street glows when evening falls.',
    pay: 75,
  },
  {
    beat: 7,
    who: 'wen',
    id: 'wheel-teeth',
    title: 'Teeth for the water wheel',
    text: 'My wheel has fewer teeth than I do. Can your cutter make three gears? Two plates buy one good gear.',
    item: 'gear',
    quantity: 3,
    building: 'mill',
    change: 'The mill wheel turns. Fresh flour rolls down to the bakery.',
    pay: 95,
  },
  {
    beat: 9,
    who: 'odile',
    id: 'bridge-brackets',
    title: 'The bridge to Riverside',
    text: 'Six brackets will hold the span. Fit a plate and a wire together in an assembler. Take my filing cabinet for your helpers.',
    item: 'bracket',
    quantity: 6,
    building: 'bridge',
    change: 'The bridge stands. Kettlewick can cross the river again.',
    pay: 120,
  },
]

export interface TownState {
  beat: number
  entered: number
  due: number
  filled: number
  installments: number[]
  payments: number
  paid: number
  interest: boolean[]
  nextOrders: Partial<Record<PersonId, number>>
  competition: string[]
  changes: TownSnapshot['changes']
}
export function newTown(): TownState {
  return {
    beat: 1,
    entered: 0,
    due: DAY * 0.6,
    filled: 0,
    installments: [100, 200, 300],
    payments: 0,
    paid: 0,
    interest: [false, false, false],
    nextOrders: {},
    competition: [],
    changes: [],
  }
}
export const activeRequest = (c: Campaign) => REQUESTS.find((r) => r.beat === c.town.beat)
export function dueLabel(c: Campaign) {
  if (c.town.beat === 1) return 'by evening'
  if (c.town.beat === 3) return 'by morning · day ' + (1 + Math.floor(c.town.due / DAY))
  return 'by day ' + Math.ceil(c.town.due / DAY)
}
export function letter(c: Campaign, id: string, from: string, title: string, body: string) {
  if (!c.progress.messages.some((m) => m.id === id))
    c.progress.messages.push({ kind: 'email', id, from, title, body, tick: c.world.tick, unread: true })
}
function change(c: Campaign, buildingId: BuildingId, text: string) {
  c.town.changes.push({ buildingId, text, tick: c.world.tick })
}
function enter(c: Campaign, beat: number) {
  const t = c.town
  t.beat = beat
  t.entered = c.world.tick
  t.filled = 0
  const morning = (Math.floor(c.world.tick / DAY) + 1) * DAY
  t.due = beat === 3 ? morning : beat === 7 ? 7 * DAY : beat === 9 ? 10 * DAY : morning + DAY
  switch (beat) {
    case 2:
      change(c, 'bank', 'Mrs Harrow hangs the family tab in the bank window.')
      letter(
        c,
        'tab',
        'Mrs Harrow',
        'Your uncle’s tab',
        '600 coins. Pay 100 by day 3, 200 by day 6, and 300 by day 10. Bram pays for regular deliveries.',
      )
      break
    case 4:
      letter(
        c,
        'vein',
        'Bram',
        'A mixed vein',
        'Copper in the iron! Peek at the splitter’s first rock and route each ore to its own furnace.',
      )
      break
    case 6:
      letter(
        c,
        'heat',
        'Bram',
        'Hot under the collar',
        'Old furnaces overheat on long runs. Repair a broken one for 5 coins or let it cool for a minute.',
      )
      break
    case 8:
      letter(
        c,
        'competition',
        'Elsie',
        'One press, two regulars',
        'Wen needs gears and I need plates. Read ctx.orders() and route plates to whoever is due first.',
      )
      const breadOrder = c.economy.orders.find((o) => o.customer === 'elsie')
      if (breadOrder) {
        breadOrder.items.plate = 8
        breadOrder.pay = 32
      }
      t.nextOrders.elsie = t.nextOrders.wen = c.world.tick
      break
    case 10:
      change(c, 'riverside', 'Riverside opens. Ines ties up her ferry and Pell wheels his tools across.')
      break
    case 11:
      change(c, 'bank', 'The shed is yours.')
      letter(
        c,
        'slow',
        'Pell',
        'A note from Riverside',
        'Your controller is getting slow. Come see me across the bridge sometime.',
      )
      break
  }
}
const dueDays = [3, 6, 10]
export function nextInstallment(c: Campaign) {
  const t = c.town
  if (t.beat < 2 || t.payments >= 3) return
  const dueDay = dueDays[t.payments]
  return { amount: t.installments[t.payments], dueDay, late: c.world.tick > dueDay * DAY }
}
export function payInstallment(c: Campaign) {
  const next = nextInstallment(c)
  if (!next || c.economy.money < next.amount) return false
  c.economy.money -= next.amount
  c.town.paid += next.amount
  c.town.payments++
  if (c.town.beat === 2) enter(c, 3)
  if (c.town.beat === 10 && c.town.payments === 3) enter(c, 11)
  return true
}
function offerOrders(c: Campaign) {
  for (const r of REQUESTS) {
    if (
      r.beat >= c.town.beat ||
      c.world.tick < (c.town.nextOrders[r.who] ?? 0) ||
      c.economy.orders.some((o) => o.customer === r.who)
    )
      continue
    const quantity = r.who === 'elsie' && c.town.beat >= 8 ? 8 : r.quantity
    const duration = r.who === 'wen' ? 450 : 700
    c.economy.orders.push({
      id: 'order-' + c.economy.nextOrder++,
      customer: r.who,
      items: { [r.item]: quantity },
      filled: {},
      status: 'accepted',
      pay: quantity * 4,
      reputation: 1,
      line: r.title,
      duration,
      deadline: c.world.tick + duration,
    })
  }
}
function fillOrder(c: Campaign, item: MaterialId, o: OrderState) {
  o.filled[item] = (o.filled[item] ?? 0) + 1
  if (o.filled[item] !== o.items[item]) return
  c.economy.money += c.world.tick > o.deadline! ? Math.ceil(o.pay / 2) : o.pay
  c.economy.reputation++
  c.economy.orders.splice(c.economy.orders.indexOf(o), 1)
  c.town.nextOrders[o.customer as PersonId] = c.world.tick + DAY / 3
  if (c.town.beat === 8 && !c.town.competition.includes(o.customer)) c.town.competition.push(o.customer)
}
export function settleTown(c: Campaign) {
  const t = c.town,
    tick = c.world.tick
  for (const e of c.world.lastEvents) {
    if (e.type !== 'delivered') continue
    const r = activeRequest(c)
    if (r && r.item === e.item.kind) {
      if (++t.filled === r.quantity) {
        change(c, r.building, r.change)
        c.economy.money += tick > t.due ? Math.ceil(r.pay / 2) : r.pay
        enter(c, r.beat + 1)
      }
    } else {
      const order = c.economy.orders.find((o) => o.items[e.item.kind])
      if (order) fillOrder(c, e.item.kind, order)
    }
  }
  if (t.beat === 4 && c.world.extracted['copper-ore']) enter(c, 5)
  if (t.beat === 6 && (c.world.machines.some((m) => m.fault === 'broken') || tick - t.entered >= 240))
    enter(c, 7)
  if (t.beat === 8 && ['elsie', 'wen'].every((who) => t.competition.includes(who))) enter(c, 9)
  if (t.beat === 10 && t.payments === 3) enter(c, 11)
  if (t.beat >= 2) {
    for (let i = t.payments; i < dueDays.length; i++) {
      if (tick <= dueDays[i] * DAY || t.interest[i]) continue
      t.interest[i] = true
      const interest = t.installments[i] / 10
      t.installments[i] += interest
      letter(
        c,
        'interest-' + i,
        'Mrs Harrow',
        'A little interest',
        'The day ' + dueDays[i] + ' payment picked up ' + interest + ' coins in interest. Pay when you can.',
      )
    }
  }
  offerOrders(c)
}
