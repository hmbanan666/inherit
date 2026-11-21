import type { Campaign, GameTick, MachineKind, ProjectFiles } from '@inherit/sim'
import type { CpuStats } from '@inherit/sandbox'

export interface CallSite { file: string; line: number; fn: string }
export interface GameLog { tick: number; level: 'log' | 'error'; text: string; file?: string; line?: number }
export interface MetricSample {
  tick: number
  money: number
  cpu: number
  budget: number
  errors: number
  machines: Record<string, {rate: number; idle: number; blocked: number; queue: number}>
}
export type Action =
  | { kind: 'init'; campaign: Campaign }
  | { kind: 'step' | 'road' | 'retry' }
  | { kind: 'deploy'; files: ProjectFiles }
  | { kind: 'rollback'; id: number }
  | { kind: 'snapshot'; name: string; files: ProjectFiles }
  | { kind: 'research' | 'accept' | 'read' | 'sellMachine'; id: string }
  | { kind: 'machine'; machine: MachineKind; site: string; x: number; y: number }
  | { kind: 'plot'; site: string; id: string }
  | { kind: 'belt' | 'sellBelt'; from: string; to: string }
export interface Frame {
  campaign: Campaign
  error: string
  notice?: string
  cpu: CpuStats
  logs: string[]
  traces: Record<string, CallSite[]>
  feedback?: GameTick
}
