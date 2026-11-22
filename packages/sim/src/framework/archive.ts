import { packKey } from './save'

export interface Archive {
  name: string
  raw: string
  project?: unknown
}

export function archivePrefix(pack: string) {
  return packKey(pack) + '.archive.'
}

/** Verify the independent recovery copy before allowing the live slot to change. */
export async function archiveSource(storage: Pick<Storage, 'getItem' | 'setItem'>, pack: string, raw: string, project?: unknown) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const identity = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
  const key = archivePrefix(pack) + identity
  const archive: Archive = {
    name: pack === 'workshop' ? 'v5 Workshop code' : 'v5 Beginner code',
    raw,
    project,
  }
  const bytes = JSON.stringify(archive)
  if (storage.getItem(key) === null) storage.setItem(key, bytes)
  const stored = storage.getItem(key)
  if (!stored || JSON.parse(stored).raw !== raw) throw new Error('Could not verify the archived save.')
}
