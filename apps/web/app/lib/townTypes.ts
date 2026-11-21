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

export type Townsperson = TownSnapshot['people'][number]
