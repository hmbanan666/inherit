import type { Campaign } from './model'
import { activeRequest, DAY, dueLabel, nextInstallment, REQUESTS } from './town'

export type BuildingId =
  | 'forge'
  | 'bakery'
  | 'lamp-street'
  | 'mill'
  | 'bridge'
  | 'bank'
  | 'town-hall'
  | 'riverside'
export type BuildingState = 'locked' | 'broken' | 'working'
export interface TownAsk {
  requestId: string
  title: string
  text: string
  items: Partial<Record<string, number>>
  filled: Partial<Record<string, number>>
  dueLabel: string
  late: boolean
}
export interface TownSnapshot {
  day: number
  clock: number
  phase: 'morning' | 'day' | 'evening' | 'night'
  buildings: { id: BuildingId; name: string; state: BuildingState; label?: string }[]
  people: {
    id: 'bram' | 'elsie' | 'tomas' | 'wen' | 'odile' | 'harrow' | 'ines' | 'pell'
    name: string
    role: string
    buildingId: BuildingId
    mood: 'happy' | 'waiting' | 'worried' | 'gone'
    ask?: TownAsk
  }[]
  debt: { owed: number; paid: number; next?: { amount: number; dueDay: number; late: boolean } }
  changes: { tick: number; buildingId: BuildingId; text: string }[]
}
const buildings: Record<BuildingId, string> = {
  forge: 'Bram’s forge',
  bakery: 'Bakery',
  'lamp-street': 'Lamp Street',
  mill: 'Water mill',
  bridge: 'Riverside bridge',
  bank: 'Kettlewick Bank',
  'town-hall': 'Town hall',
  riverside: 'Riverside',
}
type Person = TownSnapshot['people'][number]
const people: [Person['id'], string, string, BuildingId][] = [
  ['bram', 'Bram', 'Blacksmith', 'forge'],
  ['elsie', 'Elsie', 'Baker', 'bakery'],
  ['tomas', 'Tomas', 'Lamplighter', 'lamp-street'],
  ['wen', 'Old Wen', 'Miller', 'mill'],
  ['odile', 'Mayor Odile', 'Mayor', 'town-hall'],
  ['harrow', 'Mrs Harrow', 'Banker', 'bank'],
  ['ines', 'Ines', 'Ferrywoman', 'riverside'],
  ['pell', 'Pell', 'Tinker', 'riverside'],
]
export function townSnapshot(c: Campaign): TownSnapshot {
  const {
    town,
    world: { tick },
  } = c
  const clock = (tick % DAY) / DAY
  const next = nextInstallment(c)
  const owed = town.installments.slice(town.payments).reduce((a, b) => a + b, 0)
  const request = activeRequest(c)
  return {
    day: Math.floor(tick / DAY) + 1,
    clock,
    phase: clock < 0.25 ? 'morning' : clock < 0.6 ? 'day' : clock < 0.8 ? 'evening' : 'night',
    buildings: (Object.keys(buildings) as BuildingId[]).map((id) => ({
      id,
      name: buildings[id],
      state:
        id === 'bank' || id === 'town-hall' || town.changes.some((change) => change.buildingId === id)
          ? 'working'
          : id === 'riverside'
            ? 'locked'
            : 'broken',
      label: id === 'bank' && town.beat >= 2 ? (owed ? owed + ' coins owed' : 'Paid in full') : undefined,
    })),
    people: people
      .filter(([, , , b]) => b !== 'riverside' || town.beat >= 10)
      .map(([id, name, role, buildingId]) => {
        const ask =
          request?.who === id
            ? {
                requestId: request.id,
                title: request.title,
                text: request.text,
                items: { [request.item]: request.quantity },
                filled: { [request.item]: town.filled },
                dueLabel: dueLabel(c),
                late: tick > town.due,
              }
            : undefined
        const bank = id === 'harrow' && next && (town.beat === 2 || town.beat === 10)
        const order = c.economy.orders.find((o) => o.customer === id)
        const late = ask?.late || (id === 'harrow' && next?.late) || (order && tick > order.deadline!)
        const helped = REQUESTS.some((r) => r.who === id && r.beat < town.beat)
        return {
          id,
          name,
          role,
          buildingId,
          mood: late ? 'worried' : ask || bank ? 'waiting' : helped || town.beat > 10 ? 'happy' : 'waiting',
          ask: bank
            ? {
                requestId: 'installment-' + town.payments,
                title: 'The family tab',
                text: 'Your uncle borrowed 600 coins. Pay 100 by day 3, 200 by day 6 and 300 by day 10. Your regulars can cover it.',
                items: { coins: next.amount },
                filled: { coins: Math.min(c.economy.money, next.amount) },
                dueLabel: 'by day ' + next.dueDay,
                late: next.late,
              }
            : ask,
        }
      }),
    debt: { owed, paid: town.paid, next },
    changes: town.changes.map((change) => ({ ...change })),
  }
}
