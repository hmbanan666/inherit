import {
  beginLessonAttempt,
  ChapterRunError,
  cloneCampaign,
  deployGameProject,
  getSurface,
  observeLesson,
  primaryButton,
  primitiveTick,
  type Campaign,
  type ProjectFiles,
} from '@inherit/sim'
import workshop, { workshopAttempt } from '../../sim/src/packs/workshop/pack'
import { createProgram, runOnce, type Program } from './index'

/** Initialize against a copy so a failed module cannot spend coins or move live stock. */
export async function startChapter(c: Campaign, files: ProjectFiles, mode: 'run' | 'deploy' | 'resume', live?: Program) {
  const next = cloneCampaign(c)
  next.project.working = { ...files }
  if (mode === 'deploy') deployGameProject(next)
  const attempt = mode === primaryButton(next)
  const tick = workshopAttempt(next, mode === 'run' ? 'run' : 'setup')
  const surface = getSurface(next)
  const options = { files, budget: surface.budget, chapterExports: workshop.available(next, ''), exposure: workshop.exposure }
  let program: Program | undefined
  let draft: Program | undefined
  try {
    let logs: string[]
    if (mode !== 'run') {
      program = await createProgram(options, tick.api)
      logs = program.drainLogs()
    } else if (primaryButton(next) === 'deploy') {
      // A changed draft needs its own module state, but its setup must not buy
      // machines or move stock on the live floor during a single clock step.
      const sameSource = JSON.stringify(files) === JSON.stringify(c.project.deployed)
      if (!live || !sameSource) {
        const setup = workshopAttempt(cloneCampaign(c), 'setup')
        draft = await createProgram(options, setup.api)
        draft.drainLogs()
      }
      const clock = draft ?? live!
      clock.onTick(tick.api)
      logs = clock.drainLogs()
    } else logs = await runOnce(options, tick.api)
    tick.finish()
    if (mode !== 'resume') {
      if (attempt) {
        next.lesson = beginLessonAttempt(next, tick.calls)
        if (mode === 'deploy' && next.lesson.phase === 'working') next.lesson.passed = []
        next.lesson = observeLesson(next, tick.calls, logs)
      }
      Object.assign(c, next)
    }
    return { program, calls: mode === 'resume' ? [] : tick.calls, logs }
  } catch (error) {
    program?.dispose()
    if (mode === 'run' && tick.calls.length) {
      tick.finish()
      if (attempt) next.lesson = beginLessonAttempt(next, tick.calls)
      Object.assign(c, next)
    } else if (attempt && mode === 'run') c.lesson = beginLessonAttempt(c)
    throw new ChapterRunError(error, tick.calls, [])
  } finally {
    draft?.dispose()
  }
}
