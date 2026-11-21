// Temporary copy of the shared lesson contract until the sim exports it.
export type StepPhase = 'brief' | 'working' | 'solved'
export type Reveal =
  | { kind: 'section'; id: 'town' | 'inbox' | 'orders' }
  | { kind: 'coins' }
  | { kind: 'debt' }
  | { kind: 'letter'; id: string }
export interface LessonStep {
  id: string
  beat: number
  who: string
  title: string
  story: string
  task: string
  idea?: { name: string; explain: string }
  starter?: string
  hints: [string, string, string]
  checks: { id: string; text: string }[]
  solved: { did: string; idea: string; reward?: string }
  button: 'run' | 'deploy'
}
export interface CheckView { id: string; text: string; status: 'red' | 'amber' | 'green'; progress?: string }
export interface StepView { step: LessonStep; phase: StepPhase; checks: CheckView[]; index: number; total: number; nextReveal?: Reveal }
export interface CallRecord {
  file: string
  line: number
  fn: 'take' | 'put' | 'look' | 'buy' | 'repair'
  args: string[]
  ok: boolean
  result?: unknown
  message?: string
  within?: string
  hand: string | null
}
