import { archiveSource } from '@inherit/sim/archive'
import { packKey } from '@inherit/sim/save'

/** Read only real slots. Previews bypass storage before calling this function. */
export async function readPackSlot(id: string, fresh = false): Promise<string | null> {
  if (id === 'workshop') {
    const { openArchivedSave } = await import('../../../../packages/sim/src/packs/workshop/archive')
    return openArchivedSave(localStorage, fresh)
  }
  if (fresh) return null
  const stored = localStorage.getItem(packKey(id))
  if (stored === null) return null
  const data = JSON.parse(stored)
  if (data?.formatVersion !== 1) return stored
  await archiveSource(localStorage, id, stored, data.project)
  return stored
}
