import type { Campaign, GameTick, ProjectFiles, TownSnapshot } from '@inherit/sim'
import type { CpuStats } from '@inherit/sandbox'

export interface CallSite {
  file: string
  line: number
  fn: string
}
export interface GameLog {
  tick: number
  level: 'log' | 'error'
  text: string
  file?: string
  line?: number
}
export interface MetricSample {
  tick: number
  money: number
  cpu: number
  budget: number
  errors: number
  machines: Record<string, { rate: number; idle: number; blocked: number; queue: number }>
}
export type Action =
  | { kind: 'init'; campaign: Campaign }
  | { kind: 'step' }
  | { kind: 'pay'; inFull?: boolean }
  | { kind: 'deploy'; files: ProjectFiles }
  | { kind: 'rollback'; id: number }
  | { kind: 'snapshot'; name: string; files: ProjectFiles }
  | { kind: 'read'; id: string }
export interface Frame {
  town: TownSnapshot
  campaign: Omit<Campaign, 'project'>
  project?: Campaign['project']
  active: boolean
  error: string
  notice?: string
  cpu: CpuStats
  logs: string[]
  traces: Record<string, CallSite[]>
  feedback?: GameTick
}
