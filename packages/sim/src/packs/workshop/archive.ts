import { packKey } from '../../framework/save'

const activeKey = packKey('workshop')
const legacyKey = 'inherit.workshop.v1'
export const archiveTitle = 'v5 Workshop code'
const prefix = activeKey + '.archive.'
type StorageReader = Pick<Storage, 'getItem' | 'setItem' | 'length' | 'key'>

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function archivedFiles(raw: string) {
  const groups: { name: string; files: Record<string, string> }[] = []
  function collect(name: string, files: unknown) {
    if (!object(files)) return
    const sources = Object.entries(files).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    if (sources.length) groups.push({ name, files: Object.fromEntries(sources) })
  }
  let data: unknown
  try { data = JSON.parse(raw) } catch { return groups }
  if (!object(data)) return groups
  if (object(data.project)) {
    collect('Working files', data.project.working)
    collect('Deployed files', data.project.deployed)
    for (const key of ['history', 'snapshots']) {
      const revisions = data.project[key]
      if (!Array.isArray(revisions)) continue
      for (const revision of revisions) {
        if (object(revision)) collect(key + ' · ' + String(revision.name ?? revision.id), revision.files)
      }
    }
  } else if (object(data.entries)) {
    for (const [name, entry] of Object.entries(data.entries)) {
      if (object(entry)) collect('Chapter ' + name, { 'main.ts': entry.code })
    }
  }
  return groups
}

export function archives(storage: StorageReader) {
  return Array.from({ length: storage.length }, (_, i) => storage.key(i))
    .filter((key): key is string => !!key?.startsWith(prefix))
    .map(key => ({ key, raw: storage.getItem(key)! }))
}

/** Return null only after the old bytes are durable. The worker validates the
 * fresh slot before the studio writes it. Keep pre-pack sources in place. */
export async function openArchivedSave(storage: StorageReader): Promise<string | null> {
  const active = storage.getItem(activeKey)
  const raw = active ?? storage.getItem(legacyKey)
  if (raw === null) return null
  let data: Record<string, unknown> | undefined
  try { data = JSON.parse(raw) } catch { /* Keep the exact source available for recovery. */ }
  if (active !== null && data?.packId === 'workshop' && data.packVersion === 2) return active
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  const key = prefix + hash
  if (storage.getItem(key) !== raw) storage.setItem(key, raw)
  if (storage.getItem(key) !== raw) throw new Error('Could not verify the Workshop code archive.')
  const versionFive = data?.formatVersion === 1 && data.packVersion === 1 && data.packId === 'workshop' &&
    object(data.world) && data.world.version === 6 && object(data.entryWorld) && data.entryWorld.version === 6 &&
    object(data.project) && object(data.project.working) && (data.project.deployed === null || object(data.project.deployed)) &&
    Array.isArray(data.project.history) && Array.isArray(data.project.snapshots)
  const prePack = !active && data && (object(data.entries) ||
    (Number.isInteger(data.version) && Number(data.version) >= 1 && Number(data.version) <= 6 && object(data.project)))
  if (!versionFive && !prePack) throw new Error('Unrecognized Workshop save. Open Settings to recover the original.')
  return null
}
