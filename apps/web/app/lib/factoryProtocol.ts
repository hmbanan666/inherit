import type { World } from '@inherit/sim/v8'

export type FactoryCommand =
  | { kind: 'restart'; files: Record<string, string>; saved?: World }
  | { kind: 'run'; files: Record<string, string> }
  | { kind: 'visibility'; visible: boolean }

export type FactoryFrame = { world: World; deployed?: Record<string, string> }
  | { error: string }

export interface FactorySave {
  version: 1
  world: World
  files: Record<string, string>
  deployed: Record<string, string>
  activeFile: string
}
