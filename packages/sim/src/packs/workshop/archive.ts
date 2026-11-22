import { archiveSource } from '../../framework/archive'
import { packKey } from '../../framework/save'

const activeKey = packKey('workshop')
const legacyKey = 'inherit.workshop.v1'
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function files(value: unknown) {
  return object(value) && Object.values(value).every(source => typeof source === 'string')
}
function revisions(value: unknown) {
  return Array.isArray(value) && value.every(revision => object(revision) && files(revision.files))
}

/** Return null only after the old bytes are durable. The worker validates the
 * fresh slot before the studio writes it. Keep pre-pack sources in place. */
export async function openArchivedSave(storage: Storage, fresh = false): Promise<string | null> {
  const active = storage.getItem(activeKey)
  const raw = active ?? storage.getItem(legacyKey)
  if (raw === null) return null
  let data: Record<string, unknown> | undefined
  try { data = JSON.parse(raw) } catch { /* Keep the exact source available for recovery. */ }
  const chapter = object(data?.world) && data.world.version === 6 &&
    object(data.entryWorld) && data.entryWorld.version === 6
  if (active !== null && !chapter && data?.packId === 'workshop' && data.packVersion === 2) return fresh ? null : active
  await archiveSource(storage, 'workshop', raw, data?.project ?? data?.entries)
  if (fresh) return null
  const chapterSave = chapter && data?.packId === 'workshop' && data.packVersion === data.formatVersion &&
    (data.formatVersion === 1 || data.formatVersion === 2) &&
    object(data.project) && files(data.project.working) && (data.project.deployed === null || files(data.project.deployed)) &&
    revisions(data.project.history) && revisions(data.project.snapshots)
  const prePack = !active && data && (object(data.entries) ||
    (Number.isInteger(data.version) && Number(data.version) >= 1 && Number(data.version) <= 6 && object(data.project)))
  if (!chapterSave && !prePack) throw new Error('Unrecognized Workshop save. Open Settings to recover the original.')
  return null
}
