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
import { createProgram, runOnce, type Program } from './index'

/** Initialize against a copy so a failed module cannot spend coins or move live stock. */
export async function startChapter(c: Campaign, files: ProjectFiles, mode: 'run' | 'deploy' | 'resume') {
  const next = cloneCampaign(c)
  next.project.working = { ...files }
  if (mode === 'deploy') deployGameProject(next)
  const attempt = mode === primaryButton(next)
  if (attempt) {
    next.lesson = beginLessonAttempt(next)
    if (next.lesson.phase === 'working' && mode === 'deploy') next.lesson.passed = []
  }
  const tick = primitiveTick(next, mode === 'run' ? 'run' : 'deploy')
  const surface = getSurface(next)
  const options = { files, budget: surface.budget, chapterExports: surface.exports }
  let program: Program | undefined
  try {
    if (mode !== 'run') program = await createProgram(options, tick.api)
    const logs = program
      ? program.drainLogs()
      : await runOnce(options, tick.api, primaryButton(next) === 'deploy')
    tick.finish()
    if (mode !== 'resume') {
      if (attempt) next.lesson = observeLesson(next, tick.calls, logs)
      Object.assign(c, next)
    }
    return { program, calls: mode === 'resume' ? [] : tick.calls, logs }
  } catch (error) {
    program?.dispose()
    if (mode === 'run' && tick.calls.length) {
      tick.finish()
      Object.assign(c, next)
    } else if (attempt && mode === 'run') c.lesson = beginLessonAttempt(c)
    throw new ChapterRunError(error, tick.calls, [])
  }
}
