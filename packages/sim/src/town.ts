import { PRICES } from './prices'
import type { ChapterMachine } from './research'
import { updateBankStep } from './lesson-flow'
import type { MaterialId } from './campaign-api'
import type { Campaign } from './model'
import type { BuildingId, TownSnapshot } from './town-view'

export const DAY = 1200
export const INSTALLMENTS: readonly number[] = [100, 200, 300]
export const TAB_LETTER =
  'Your uncle borrowed 600 coins. Pay when you’re ready. You can start with 100 coins and keep the rest for the factory. Bram wants three more ingots for his forge. He’ll pay 12 coins for the order.'
export const COMPETITION_LETTER =
  'Wen needs gears and I need plates. Read look("cart").wanted to see which delivery we still need.'
type PersonId = TownSnapshot['people'][number]['id']
interface Request {
  beat: number
  who: PersonId
  id: string
  title: string
  text: string
  item: MaterialId
  check: string
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
    check: 'Ingots reach Bram’s cart',
    title: 'Horseshoes for the mail horse',
    text: 'The mail horse threw a shoe. Send three iron ingots to my forge and the post can ride again.',
    item: 'iron-ingot',
    quantity: 3,
    building: 'forge',
    change: 'The forge lights up. The mail horse trots past with four good shoes.',
    pay: 64,
  },
  {
    beat: 3,
    who: 'elsie',
    id: 'oven-grate',
    check: 'Plates reach Elsie for the oven grate',
    title: 'A grate for the bread oven',
    text: 'My last loaf fell through the grate. Bram has a press for 28 coins. Stamp four iron ingots into plates for me?',
    item: 'plate',
    quantity: 4,
    building: 'bakery',
    change: 'Smoke curls from the bakery. Elsie opens her bread stall.',
    pay: 125,
  },
  {
    beat: 5,
    who: 'tomas',
    id: 'lamp-wire',
    check: 'Coils of wire reach Tomas for the lamps',
    title: 'Light for Lamp Street',
    text: 'Folks have been feeling their way home. Draw five coils of wire from copper ingots with a cutter.',
    item: 'wire',
    quantity: 5,
    building: 'lamp-street',
    change: 'Lamp Street glows when evening falls.',
    pay: 125,
  },
  {
    beat: 7,
    who: 'wen',
    id: 'wheel-teeth',
    check: 'Gears reach Wen for the water wheel',
    title: 'Teeth for the water wheel',
    text: 'My wheel has fewer teeth than I do. Can your cutter make three gears? Two plates buy one good gear.',
    item: 'gear',
    quantity: 3,
    building: 'mill',
    change: 'The mill wheel turns. Fresh flour rolls down to the bakery.',
    pay: 205,
  },
  {
    beat: 9,
    who: 'odile',
    id: 'bridge-brackets',
    check: 'Brackets reach the bridge crew',
    title: 'The bridge to Riverside',
    text: 'Six brackets will hold the span. Fit a plate and a wire together in an assembler. Bring the helpers you wrote for the mill.',
    item: 'bracket',
    quantity: 6,
    building: 'bridge',
    change: 'The bridge stands. Kettlewick can cross the river again.',
    pay: 210,
  },
]

export interface TownState {
  beat: number
  entered: number
  filled: number
  payments: number
  paid: number
  wired: boolean
  solved: string[]
  waiting: Partial<Record<MaterialId, number>>
  offered: string[]
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
    wired: false,
    solved: [],
    waiting: {},
    offered: [],
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
export function enterBeat(c: Campaign, beat: number) {
  const t = c.town
  t.beat = beat
  t.wired = false
  t.entered = c.world.tick
  t.filled = 0
  switch (beat) {
    case 2:
      c.world.machines.find(m => m.id === 'furnace')!.batchTicks = 4
      change(c, 'bank', 'Mrs Harrow hangs the family tab in the bank window.')
      break
    case 4:
      letter(
        c,
        'vein',
        'Bram',
        'A mixed vein',
        'Copper in the iron! Look at the mine and send each rock to its own furnace.',
      )
      break
    case 6:
      letter(
        c,
        'heat',
        'Bram',
        'Hot under the collar',
        'Old furnaces overheat on long runs. Check each furnace and repair the one that stopped.',
      )
      break
    case 8:
      letter(c, 'competition', 'Elsie', 'One press, two regulars', COMPETITION_LETTER)
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
  if (c.economy.money - amount < machineReserve(c)) return false
  c.economy.money -= amount
  c.town.paid += amount
  c.town.payments = inFull ? INSTALLMENTS.length : c.town.payments + 1
  c.lesson = updateBankStep(c)
  return true
}
const jobs: [number, PersonId, MaterialId, number, number][] = [
  [2, 'bram', 'iron-ingot', 3, 12],
  [4, 'elsie', 'plate', 4, 16],
  [6, 'tomas', 'wire', 3, 12],
  [8, 'elsie', 'plate', 4, 24],
  [8, 'wen', 'gear', 3, 24],
]

// The story pays for these purchases in stages. Extra machines are affordable
// only when each remaining request can still be supplied and the tab can be paid.
const purchases: { beat: number; kind: ChapterMachine; name: string }[] = [
  { beat: 3, kind: 'press', name: 'press' },
  { beat: 4, kind: 'furnace', name: 'copper' },
  { beat: 5, kind: 'cutter', name: 'cutter' },
  { beat: 7, kind: 'cutter', name: 'gears' },
  { beat: 9, kind: 'assembler', name: 'assembler' },
]
function chapterReserve(c: Campaign, includeDebt = true, newPlace?: string) {
  let needed = includeDebt ? debtRemaining(c) : 0
  for (let beat = 9; beat >= c.town.beat; beat--) {
    const request = REQUESTS.find(r => r.beat === beat)
    let income = request && !c.town.changes.some(row => row.buildingId === request.building) ? request.pay : 0
    // Both regulars must be supplied to finish the competing-orders lesson.
    if (beat === 8) {
      for (const [chapterBeat, who, , , pay] of jobs)
        if (chapterBeat === beat && !c.town.competition.includes(who)) income += pay
    }
    needed = Math.max(0, needed - income)
    for (const purchase of purchases)
      if (purchase.beat === beat && purchase.name !== newPlace && !c.world.machines.some(m => m.id === purchase.name))
        needed += PRICES.machines[purchase.kind]
  }
  return needed
}
export const machineReserve = (c: Campaign) => chapterReserve(c, false)

export function purchaseProblem(c: Campaign, kind: ChapterMachine, name: string) {
  if (c.town.beat > 10 || c.world.machines.some(m => m.id === name)) return
  const stock = purchases.find(m => m.name === name)
  if (stock && stock.kind !== kind) return 'The label "' + name + '" belongs to a ' + stock.kind + '. Choose another name.'
  if (stock && stock.beat <= c.town.beat) return
  const reserve = chapterReserve(c, true, name)
  if (c.economy.money - PRICES.machines[kind] < reserve)
    return 'Keep ' + reserve + ' coins for the town’s remaining work and the family tab.'
}

function offerOrders(c: Campaign) {
  for (const [beat, customer, item, qty, pay] of jobs) {
    const id = 'order-' + beat + '-' + customer
    if (beat > c.town.beat || c.town.offered.includes(id)) continue
    c.town.offered.push(id)
    c.economy.orders.push({
      id,
      customer,
      items: { [item]: qty },
      filled: {},
      status: 'accepted',
      pay,
      reputation: 1,
      line: REQUESTS.find((r) => r.who === customer)!.title,
    })
  }
}

export function wanted(c: Campaign): MaterialId[] {
  const request = activeRequest(c)
  return [
    ...new Set([
      ...(request && c.town.filled < request.quantity ? [request.item] : []),
      ...c.economy.orders.flatMap((o) => Object.keys(o.items) as MaterialId[]),
    ]),
  ]
}

export function settleTown(c: Campaign, clockRan: boolean) {
  const t = c.town
  if (c.lesson.released.some(r => r.kind === 'section' && r.id === 'orders')) offerOrders(c)
  function allocate(item: MaterialId, needed: number) {
    const available = t.waiting[item] ?? 0
    const n = Math.min(available, needed)
    if (n === available) delete t.waiting[item]
    else t.waiting[item] = available - n
    return n
  }
  const request = activeRequest(c)
  if (request && t.wired) {
    const remaining = request.quantity - t.filled
    const clockLoad = (c.world.hops ?? []).filter(h => h.to === 'cart' && h.item === request.item).length
    const needed = request.beat === 1 ? Math.min(remaining, clockRan ? clockLoad : 0) : remaining
    t.filled += allocate(request.item, needed)
    if (t.filled === request.quantity && !t.changes.some(row => row.buildingId === request.building)) {
      change(c, request.building, request.change)
      c.economy.money += request.pay
    }
  }
  for (const o of [...c.economy.orders]) {
    const item = Object.keys(o.items)[0] as MaterialId
    const filled = o.filled[item] ?? 0
    o.filled[item] = filled + allocate(item, o.items[item]! - filled)
    if (o.filled[item] !== o.items[item]) continue
    c.economy.money += o.pay
    c.economy.reputation++
    c.economy.orders.splice(c.economy.orders.indexOf(o), 1)
    if (o.id.startsWith('order-8-')) t.competition.push(o.customer)
  }
}
