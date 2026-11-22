import type { Call, Colour, Files, Row } from '@inherit/sim/pack'
import type { PackSave } from '@inherit/sim/save'
export type PackCommand = { kind: 'open'; id: string; stored: string | null; lesson?: string } |
  { kind: 'run'; files: Files } | { kind: 'continue'|'tick' } | {kind:'action';panel:string;row:string}
export interface PackFrame {
  save: PackSave<unknown>
  mode: 'run' | 'deploy'
  clockMs?: number
  goal: string
  edit: { file: string; line: number }
  hints: readonly string[]
  labels: string[]
  checks: Colour[]
  solved?: {reaction: string; did: string; idea: string}
  index: number
  total: number
  declarations: string
  panels: {id: string; label: string; placement: 'panel' | 'nav'; rows: Row[]}[]
  logs: string[]
  start?: unknown
  moments: {world: unknown; call: Call; checks: Colour[]}[]
  error: string
}
