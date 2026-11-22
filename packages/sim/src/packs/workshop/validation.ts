import type { Files } from '../../framework/pack'
import { startChapter } from '../../../../sandbox/src'
import { createCampaign } from './campaign'
import { advanceGame } from './game'
import { jumpToStep } from './lesson-flow'
import { apiDeclarations } from './declarations'
import { workshopLessons } from './pack'

/** Exercise a live lesson on the same recorded, reachable floor as the preview. */
export function checkpoint(id: string) {
  const entry = jumpToStep(createCampaign(), id)
  const lesson = workshopLessons[entry.lesson.index]
  return {
    previous: entry.project.working,
    world: entry,
    declarations: apiDeclarations(entry),
    async play(files: Files) {
      const c = structuredClone(entry)
      for (let attempt = 0; attempt < (lesson.mode === 'run' ? 16 : 1); attempt++) {
        const { program } = await startChapter(c, files, lesson.mode)
        try {
          if (program) for (let tick = 0; tick < 1200 && c.lesson.phase !== 'solved'; tick++)
            advanceGame(c, program, program.drainLogs)
        } finally { program?.dispose() }
        if (c.lesson.phase === 'solved') break
      }
      return c.lesson.phase === 'solved'
    },
  }
}
