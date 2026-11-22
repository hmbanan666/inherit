import type { Call, Colour, Files, Lesson, Row, Task, Theory } from '@inherit/sim/pack'
import type { ApiMethod } from '@inherit/sim/declarations'
import type { MapLesson } from '@inherit/sim/course'
import type { PackSave } from '@inherit/sim/save'

export type DrawerTab = 'learn' | 'hints' | 'api' | 'console'
export type PackCommand =
  | { kind: 'open'; id: string; stored: string | null; lesson?: string }
  | { kind: 'run'; files: Files }
  | { kind: 'select'; id: string; files: Files; activeFile: string }
  | { kind: 'hint' }
  | { kind: 'predict'; choice: string }
  | { kind: 'continue'; id: string }
  | { kind: 'tick' | 'stopLoop' }
  | { kind: 'action'; panel: string; row: string }

export interface PackFrame {
  save: PackSave<unknown>
  map: MapLesson[]
  scene?: string
  inputs: ReturnType<NonNullable<Lesson<unknown>['inputs']>>
  theory?: Theory
  task?: Task
  prediction?: Lesson<unknown>['prediction']
  reference: ApiMethod[]
  types: string[]
  mode: 'run' | 'deploy'
  clockMs?: number
  activities: { id: string; title: string }[]
  theory?: { title: string; body: string[]; example: string }
  task?: { condition: string; examples: string[] }
  reference: APIEntry[]
  types: string[]
  previewWorld?: unknown
  notice?: string
  tickCount: number
  showLearn: boolean
  noCalls?: boolean
  finishIdeas?: string[]
  goal: string
  edit: { file: string; line: number }
  hints: readonly string[]
  labels: {id: string; text: string; input?: string}[]
  checks: Colour[]
  solved?: Lesson<unknown>['solved']
  index: number
  total: number
  declarations: string
  panels: {id: string; label: string; placement: 'panel' | 'nav'; rows: Row[]}[]
  logs: string[]
  start?: unknown
  moments: {world: unknown; call: Call; checks: Colour[]}[]
  error: string
}
