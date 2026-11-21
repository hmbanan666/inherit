import type { MaterialId } from './campaign-api'
import type { Campaign, OrderState } from './model'
import type { BuildingId, TownSnapshot } from './town-view'

export const DAY = 1200
export const INSTALLMENTS: readonly number[] = [100, 200, 300]
export const TAB_LETTER =
  'Your uncle borrowed 600 coins. Pay when you’re ready. You can start with 100 coins and keep the rest for the factory. Bram pays for regular ingots.'
export const COMPETITION_LETTER =
  'Wen needs gears and I need plates. Check who still has an order in ctx.orders(). Send plates to my cart or to his gear cutter.'
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
    text: 'The mail horse threw a shoe. Send three iron ingots to my forge and the post can ride again.',
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
  filled: number
  payments: number
  paid: number
  nextOrders: Partial<Record<PersonId, number>>
  competition: string[]
  changes: TownSnapshot['changes']
}
export function newTown(): TownState {
  return {
    beat: 1,
    entered: 0,
    filled: 0,
    payments: 0,
    paid: 0,
    nextOrders: {},
    competition: [],
    changes: [],
  }
}
export const activeRequest = (c: Campaign) => REQUESTS.find((r) => r.beat === c.town.beat)
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
  switch (beat) {
    case 2:
      change(c, 'bank', 'Mrs Harrow hangs the family tab in the bank window.')
      letter(c, 'tab', 'Mrs Harrow', 'Your uncle’s tab', TAB_LETTER)
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
      letter(c, 'competition', 'Elsie', 'One press, two regulars', COMPETITION_LETTER)
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
// The bank introduction can be acknowledged before making a payment.
export function acknowledgeTab(c: Campaign) {
  if (c.town.beat === 2) enter(c, 3)
}
export function debtRemaining(c: Campaign) {
  return INSTALLMENTS.slice(c.town.payments).reduce((sum, amount) => sum + amount, 0)
}
export function nextInstallment(c: Campaign) {
  const t = c.town
  if (t.beat < 2 || t.payments >= INSTALLMENTS.length) return
  return { amount: INSTALLMENTS[t.payments] }
}
export function payInstallment(c: Campaign, inFull = false) {
  const next = nextInstallment(c)
  if (!next) return false
  const amount = inFull ? debtRemaining(c) : next.amount
  if (c.economy.money < amount) return false
  c.economy.money -= amount
  c.town.paid += amount
  c.town.payments = inFull ? INSTALLMENTS.length : c.town.payments + 1
  acknowledgeTab(c)
  if (c.town.beat === 10 && c.town.payments === INSTALLMENTS.length) enter(c, 11)
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
    c.economy.orders.push({
      id: 'order-' + c.economy.nextOrder++,
      customer: r.who,
      items: { [r.item]: quantity },
      filled: {},
      status: 'accepted',
      pay: quantity * 4,
      reputation: 1,
      line: r.title,
    })
  }
}
function fillOrder(c: Campaign, item: MaterialId, o: OrderState) {
  o.filled[item] = (o.filled[item] ?? 0) + 1
  if (o.filled[item] !== o.items[item]) return
  c.economy.money += o.pay
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
        c.economy.money += r.pay
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
  if (t.beat === 10 && t.payments === INSTALLMENTS.length) enter(c, 11)
  offerOrders(c)
}
