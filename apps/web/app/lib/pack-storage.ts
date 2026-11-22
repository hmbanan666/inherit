import { archiveSource } from '@inherit/sim/archive'
import { packKey } from '@inherit/sim/save'

/** Read only real slots. Previews bypass storage before calling this function. */
export async function readPackSlot(id: string): Promise<string | null> {
  const stored = localStorage.getItem(packKey(id))
  if (stored === null && id === 'workshop') {
    const legacy = localStorage.getItem('inherit.workshop.v1')
    if (legacy !== null) {
      const { archivedChapterProject } = await import('../../../../packages/sim/src/packs/workshop/save')
      let project
      try { project = archivedChapterProject(legacy) }
      finally { await archiveSource(localStorage, id, legacy, project) }
    }
    return null
  }
  if (stored === null) return null
  const data = JSON.parse(stored)
  if (data?.formatVersion !== 1) return stored
  await archiveSource(localStorage, id, stored, data.project)
  if (id === 'workshop') {
    const { restoreWorkshop } = await import('../../../../packages/sim/src/packs/workshop/save')
    restoreWorkshop(stored, 1)
    return null
  }
  return stored
}
