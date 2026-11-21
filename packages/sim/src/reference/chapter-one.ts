import { createCampaign } from '../campaign'
import { lessons } from '../onboarding'

/** Apply the exact edits offered to a player, preserving every preceding module. */
export function chapterFiles(beat: number, through?: string) {
  const files = createCampaign().project.working
  for (const task of lessons) {
    if (task.beat > beat) break
    files[task.file] = task.exact
    if (task.id === through) break
  }
  return files
}
