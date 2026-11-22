export type MaterialId =
  | 'iron-ore'
  | 'copper-ore'
  | 'coal'
  | 'iron-ingot'
  | 'copper-ingot'
  | 'plate'
  | 'gear'
  | 'wire'
  | 'bracket'
  | 'motor'
  | 'part'
export type MachineKind =
  | 'miner'
  | 'furnace'
  | 'press'
  | 'cutter'
  | 'assembler'
  | 'splitter'
  | 'merger'
  | 'storage'
  | 'sorter'
  | 'scrap'
  | 'dock'
  | 'depot'
  | 'truck'
export type RecipeId = Exclude<MaterialId, 'iron-ore' | 'copper-ore' | 'coal'> | 'recycle'
export interface Recipe {
  machine: MachineKind
  inputs: Partial<Record<MaterialId, number>>
  output: MaterialId
  ticks: number
  /** Accept one defective material of any kind in place of named inputs. */
  defectiveInput?: true
}
export interface MaterialItem {
  kind: MaterialId
  defect?: true
}
export interface MachineStats {
  processed: number
  activeTicks: number
  idleTicks: number
  blockedTicks: number
  /** Units processed in the last simulated minute, normalized for younger machines. */
  rate: number
}
export interface MachineView {
  id: string
  kind: MachineKind
  siteId: string
  x: number
  y: number
  status: 'idle' | 'working' | 'starved' | 'blocked' | 'ready' | 'broken' | 'jammed'
  deposit?: 'iron' | 'copper' | 'coal'
  recipe?: RecipeId
  remaining: number
  queue: MaterialItem[]
  output?: MaterialItem
  stats: MachineStats
}
export type TruckOutcome = 'ok' | 'breakdown' | 'lostAck'
export type FactoryEvent =
  | { type: 'itemArrived'; tick: number; machineId: string; item: MaterialItem }
  | { type: 'delivered'; tick: number; machineId: string; item: MaterialItem }
  | { type: 'machineIdle'; tick: number; machineId: string }
  | { type: 'truckReturned'; tick: number; machineId: string; key: string; outcome: TruckOutcome }

export interface BuildOptions {
  name?: string
  x?: number
  y?: number
  recipe?: RecipeId
  deposit?: NonNullable<MachineView['deposit']>
}
export interface OrderView {
  readonly id: string
  readonly who: string
  readonly items: Readonly<Partial<Record<MaterialId, number>>>
  readonly filled: Readonly<Partial<Record<MaterialId, number>>>
}
export interface BlueprintAPI {
  build(kind: MachineKind, opts?: BuildOptions): string | undefined
  connect(from: string, to: string): boolean
  orders(): OrderView[]
  clear(id: string): boolean
  repair(id: string): boolean
  dismantle(id: string): boolean
  lastError(): string | undefined
}
export interface Factory {
  readonly tick: number
  dig(id: string, mode?: 'wait-for-space'): boolean
  route(id: string, target: string): boolean
  space(id: string, target?: string): boolean
  work(id: string, recipe?: RecipeId): boolean
  stock(id: string, item?: MaterialId | 'ore' | 'ingot'): number
  machines(kind?: MachineKind): string[]
  inspect(id: string): MachineView | undefined
  recipe(id: RecipeId): Recipe | undefined
  recipes(id: string): RecipeId[]
  peek(id: string): MaterialItem | undefined
  dispatch(truckId: string, fromDepot: string, toDepot: string, key: string): boolean
}
