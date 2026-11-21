import type { Campaign } from './model'
import { activeRequest, DAY, debtRemaining, machineReserve, nextInstallment, REQUESTS, TAB_LETTER } from './town'

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
    mood: 'happy' | 'waiting' | 'gone'
    ask?: TownAsk
  }[]
  debt: { owed: number; paid: number; reserve?: number; next?: { amount: number } }
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
export type Townsperson = TownSnapshot['people'][number]
const people: [Townsperson['id'], string, string, BuildingId][] = [
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
  const reserve = next ? machineReserve(c) : 0
  const owed = debtRemaining(c)
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
          request?.who === id && town.filled < request.quantity
            ? {
                requestId: request.id,
                title: request.title,
                text: request.text,
                items: { [request.item]: request.quantity },
                filled: { [request.item]: town.filled },
              }
            : undefined
        const bank = id === 'harrow' && next && (town.beat === 2 || town.beat === 10)
        const hasOrder = c.economy.orders.some((o) => o.customer === id)
        const helped =
          town.beat > 10 || (id === 'harrow' && !owed) || REQUESTS.some((r) => r.who === id && town.changes.some(change => change.buildingId === r.building))
        return {
          id,
          name,
          role,
          buildingId,
          mood: helped && !ask && !bank && !hasOrder ? 'happy' : 'waiting',
          ask: bank
            ? {
                requestId: 'installment-' + town.payments,
                title: 'The family tab',
                text:
                  town.beat === 2
                    ? TAB_LETTER
                    : 'The bridge stands. Settle the remaining installments and the shed is yours.',
                items: { coins: next.amount },
                filled: { coins: Math.min(c.economy.money, next.amount) },
              }
            : ask,
        }
      }),
    debt: { owed, paid: town.paid, ...(reserve ? { reserve } : {}), next },
    changes: town.changes.map((change) => ({ ...change })),
  }
}
