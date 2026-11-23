import type { World } from '@inherit/sim/v8'

export type FactoryCommand =
  | { kind: 'restart' | 'run'; files: Record<string, string> }
  | { kind: 'clock'; paused: boolean; speed: number }

export type FactoryFrame = { world: Omit<World, 'memory'>; deployed?: Record<string, string> }
  | { error: string }
