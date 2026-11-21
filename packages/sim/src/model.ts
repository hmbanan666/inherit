import type { FactoryEvent, MachineView, MaterialId, MaterialItem, TruckOutcome } from './campaign-api'
export interface Tile {
  x: number
  y: number
}
export interface Plot extends Tile {
  id: string
  width: number
  height: number
  status: 'owned' | 'sale' | 'locked'
  price: number
}
export interface Site {
  id: string
  name: string
  plots: Plot[]
  deposits: (Tile & { kind: 'iron' | 'copper' | 'coal' })[]
  roads: string[]
}
export interface CampaignMachine extends MachineView {
  lastInput?: string
  paid: number
  builtAt: number
  recentProduction: number[]
  batchDefect?: true
  batchTicks?: number
}
export interface CampaignBelt {
  siteId: string
  from: string
  to: string
  path: Tile[]
  paid: number
  sequence: number
  items: (MaterialItem & { id: number; position: number })[]
}
export interface TripReceipt {
  key: string
  truckId: string
  from: string
  to: string
  tick: number
  acknowledged: boolean
}
export interface TruckTrip extends Omit<TripReceipt, 'acknowledged'> {
  due: number
  outcome: TruckOutcome
  cargo?: MaterialItem
}
export interface Incident {
  id: number
  machineId: string
  cause: 'breakdown' | 'lostAck' | 'blocked'
  startTick: number
  endTick?: number
  affectedOrders: string[]
  key?: string
}
export interface CampaignWorld {
  tick: number
  seed: number
  nextMachineId: number
  nextIncidentId: number
  sites: Site[]
  machines: CampaignMachine[]
  belts: CampaignBelt[]
  lost: number
  delivered: Partial<Record<MaterialId, number>>
  extracted: Partial<Record<MaterialId, number>>
  dockInterval: number
  defectsEnabled: boolean
  trips: TruckTrip[]
  receipts: TripReceipt[]
  tripScript: TruckOutcome[]
  events: FactoryEvent[]
  lastEvents: FactoryEvent[]
  incidents: Incident[]
}
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
export interface JsonObject {
  [key: string]: JsonValue
}
export type ProjectFiles = Record<string, string>
export interface ProjectRevision {
  id: number
  tick: number
  name: string
  files: ProjectFiles
}
export interface PlayerProject {
  working: ProjectFiles
  deployed: ProjectFiles
  history: ProjectRevision[]
  snapshots: ProjectRevision[]
  nextRevision: number
}
export interface OrderState {
  id: string
  customer: string
  items: Partial<Record<MaterialId, number>>
  quality?: 'good'
  status: 'open' | 'accepted' | 'done' | 'failed'
  deadline?: number
  pay: number
  reputation: number
}
export interface Economy {
  money: number
  reputation: number
  research: string[]
  orders: OrderState[]
}
export interface QuestRun {
  id: string
  startTick: number
  shipped: number
  lost: number
  coal: number
  furnaceActive: Record<string, number>
}
export interface Campaign {
  version: 2
  world: CampaignWorld
  economy: Economy
  progress: { completedQuests: string[]; activeQuest?: QuestRun }
  project: PlayerProject
  memory: JsonObject
}
export type SaveGame = Campaign
