export type Files = Record<string, string>
export interface Unit {
  id: string
  title: string
  landmark: string
}

export type PackManifest = (
  | { track: 'course'; units: readonly Unit[] }
  | { track: 'challenges'; units?: never }
) & {
  id: string
  title: string
  tagline: string
  level: 'Beginner' | 'Basics' | 'Game' | 'Advanced'
  genre: string
  learningGoals: string[]
  estimatedMinutes: { min: number; max: number }
  cover: string
  next?: string
  featured?: boolean
  showcaseNote?: string
}
export interface Starter { files: Files; edit: { file: string; line: number } }
export interface Call {
  name: string
  args: unknown[]
  result?: unknown
  file: string
  line: number
  within?: string
  ok: boolean
}
export interface Evidence<W> {
  before: Readonly<W>
  world: Readonly<W>
  calls: readonly Call[]
  console: readonly string[]
  files: Readonly<Files>
}
export type Colour = 'red' | 'amber' | 'green'
export interface Check<W> {
  id: string
  label: string
  input?: string
  evaluate(e: Evidence<W>): Colour
}
export interface Theory {
  title: string
  body: readonly string[]
  example: string
}

export interface Task {
  condition: string
  examples: readonly string[]
}

export type InputValue = string | number | boolean | null | InputValue[] | { [key: string]: InputValue }

export interface Lesson<W> {
  unit?: string
  kind: 'write' | 'fill' | 'fix' | 'predict'
  theory?: Theory
  task?: Task
  prediction?: { question: string; choices: readonly string[]; answer: string }
  scene: string
  variants?: readonly { input: string; enter(world: W): void; maxTicks?: number }[]
  inputs?(world: Readonly<W>): Record<string, { type: string; value: InputValue }>
  id: string
  goal: string
  idea: string
  mode: 'run' | 'deploy'
  starter(previous: Files): Starter
  hints?: readonly string[]
  checks: readonly Check<W>[]
  referenceSolution: Files
  visibleEffect: { description: string; testId: string; text: string }
  solved: { reaction: string; did: string; idea: string }
  enter?(world: W): void
}
export interface Row { id: string; label: string; value: string; action?: {name:string;args:unknown[]} }
export interface Entity<W> { id: string; label: string; rows(world: W): Row[] }
export interface Panel<W> extends Entity<W> { placement: 'nav' | 'panel' }
export interface Pack<W, A extends object> {
  manifest: PackManifest
  version: number
  initialWorld(seed: number): W
  decodeWorld(input: unknown): W
  entities: Entity<W>[]
  panels: Panel<W>[]
  scenes: readonly string[]
  lessons: Lesson<W>[]
  exposure: 'globals' | 'module'
  retry: 'entry' | 'live'
  beginAttempt(world: W, mode: 'run' | 'setup' | 'tick' | 'idle'): { api: A; finish(): void }
  available(world: W, lessonId: string): readonly (keyof A & string)[]
  guestModules?: Readonly<Record<string,{source:string;declarations:string}>>
  typeAliases?(world: W): Record<string,string[]>
  clock?: {intervalMs:number;handler:'onTick'}
  actions?: Record<string,(world:W,args:readonly unknown[])=>void>
  upgrade?(fromVersion:number,input:unknown):unknown
}
export function definePack<W, A extends object>(pack: Pack<W, A>) { return pack }
export function mainFile(source: string, line = source.split('\n').length): Starter {
  return { files: { 'main.ts': source }, edit: { file: 'main.ts', line } }
}
