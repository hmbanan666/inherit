import type { World } from '@inherit/sim/v8'

export type FactoryCommand =
  | { kind: 'restart'; files: Record<string, string>; saved?: World; fresh?: boolean }
  | { kind: 'run'; files: Record<string, string> }
  | { kind: 'visibility'; visible: boolean }
  | { kind: 'accept'; id?: string }
  | { kind: 'complete' }
  | { kind: 'buy'; id: string }
  | { kind: 'dump'; name: string }
  | { kind: 'manual'; action: 'smelt' | 'alloy' | 'collect' | 'clear' | 'mine' | 'unload' | 'dump'; drone?: string }
  | { kind: 'run-fn'; name: string; file: string; line: number }
  | { kind: 'stop' }
  | { kind: 'loop'; on: boolean; name?: string; file?: string; line?: number }
  | { kind: 'clear-console' }

export type FactoryFrame = { world: World; deployed?: Record<string, string> }
  | { error: string }

export interface FactorySave {
  version: 3
  world: World
  files: Record<string, string>
  deployed: Record<string, string>
  activeFile: string
  /** Quest ids whose editor note was already offered. Deleting the line does not offer it again. */
  notes?: string[]
}

export type SaveRecovery =
  | { kind: 'missing' }
  | { kind: 'resume'; save: FactorySave }
  | { kind: 'files'; files: Record<string, string>; deployed: Record<string, string>; activeFile: string }
  | { kind: 'blocked' }

/** Keep main.ts and lib/ when the world blob cannot be trusted. */
export function projectFiles(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  const files: Record<string, string> = {}
  for (const [path, source] of Object.entries(value)) {
    if (typeof source !== 'string' || (path !== 'main.ts' && !path.startsWith('lib/'))) return
    files[path] = source
  }
  if (typeof files['main.ts'] !== 'string') return
  return files
}

export function recoverFactorySave(raw: string | null): SaveRecovery {
  if (raw === null) return { kind: 'missing' }
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return { kind: 'blocked' } }
  if (!parsed || typeof parsed !== 'object') return { kind: 'blocked' }
  const save = parsed as Partial<FactorySave>
  const files = projectFiles(save.files)
  const deployed = projectFiles(save.deployed)
  const world = save.world
  const usable = save.version === 3 && !!files && !!deployed && !!world && Number.isSafeInteger(world.tick) &&
    typeof world.ledger?.income === 'number' && Array.isArray(world.growth) &&
    Array.isArray(world.bought) && Array.isArray(world.cleared) && Array.isArray(world.checks)
  if (usable && typeof save.activeFile === 'string') return { kind: 'resume', save: { ...save, files, deployed, world } as FactorySave }
  if (files) {
    const activeFile = typeof save.activeFile === 'string' && files[save.activeFile] !== undefined ? save.activeFile : 'main.ts'
    return { kind: 'files', files, deployed: deployed ?? files, activeFile }
  }
  return { kind: 'blocked' }
}

const archivePrefix = 'inherit.v8.kettlewick.archive.'

/** Copy the raw slot aside and read it back before anything replaces it. */
export async function archiveFactorySave(storage: Pick<Storage, 'getItem' | 'setItem'>, raw: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const identity = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
  const key = archivePrefix + identity
  if (storage.getItem(key) === null) storage.setItem(key, raw)
  if (storage.getItem(key) !== raw) throw new Error('Could not verify the archived save.')
}
