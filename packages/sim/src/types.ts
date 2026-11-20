export type Item = 'ore' | 'coal' | 'ingot' | 'part'
export type Kind = 'mine' | 'coal' | 'furnace' | 'splitter' | 'assembler' | 'dispatch'
export interface Station { id: string; kind: Kind; x: number; y: number }
export interface Link { from: string; to: string }
export interface Layout { stations: Station[]; links: Link[] }
export interface Level {
  title: string
  brief: string
  customer: string
  order: number
  product: 'part' | 'ingot'
  concept: string
  layout: Layout
  additions: Station[]
  starter: string
  hints: [string, string, string]
  minRate?: number
  maxIdle?: number
  dockInterval: number
  lossless?: boolean
}
export type Status = 'idle' | 'working' | 'starved' | 'blocked' | 'ready'
export interface Machine extends Station {
  queue: Item[]
  remaining: number
  output?: Item
  status: Status
  activeTicks: number
  processed: number
}
export interface Cargo { kind: Item; position: number }
export interface Belt extends Link { items: Cargo[] }
export interface World {
  level: Level
  tick: number
  machines: Machine[]
  belts: Belt[]
  shipped: number
  lost: number
  deliveries: number[]
}
export interface Factory {
  readonly tick: number
  /** Extract one unit into the mine's outbound belt. */
  dig(id: string): boolean
  /** Start a batch if the furnace or assembler has its ingredients. */
  work(id: string): boolean
  /** Move the first queued item onto a connected target's belt. */
  route(id: string, target: string): boolean
  /** Can the next belt accept an item right now? */
  space(id: string, target?: string): boolean
  /** Number of queued inputs, optionally filtered by material. */
  stock(id: string, item?: Item): number
}
