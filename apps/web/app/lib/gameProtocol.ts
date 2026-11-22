import type { Campaign, CallRecord, GameTick, ProjectFiles, TownSnapshot } from '@inherit/sim'
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
  | { type: 'init'; campaign: Campaign; resumeClock?: boolean }
  | { type: 'step' }
  | { type: 'run'; files?: ProjectFiles }
  | { type: 'continue' }
  | { type: 'pay'; inFull?: boolean }
  | { type: 'deploy'; files: ProjectFiles }
  | { type: 'rollback'; id: number }
  | { type: 'snapshot'; name: string; files: ProjectFiles }
  | { type: 'read'; id: string }
export interface Frame {
  calls: CallRecord[]
  town: TownSnapshot
  campaign: Omit<Campaign, 'project' | 'seenSections'>
  project?: Campaign['project']
  active: boolean
  error: string
  notice?: string
  cpu: CpuStats
  logs: string[]
  traces: Record<string, CallSite[]>
  feedback?: GameTick
}
