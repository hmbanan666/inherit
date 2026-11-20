import type { Item } from './api'
export type { Item, Factory } from './api'
export type Kind = 'mine' | 'coal' | 'furnace' | 'splitter' | 'assembler' | 'dispatch'
export interface Station {
  id: string
  kind: Kind
  x: number
  y: number
}
export interface Link {
  from: string
  to: string
}
export interface Layout {
  stations: Station[]
  links: Link[]
}
export interface Level {
  title: string
  note: string
  buildTiles?: [number, number][]
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
export interface Cargo {
  id: number
  kind: Item
  position: number
}
export interface Belt extends Link {
  sequence: number
  items: Cargo[]
}
export interface World {
  level: Level
  tick: number
  machines: Machine[]
  belts: Belt[]
  shipped: number
  lost: number
  deliveries: number[]
}
