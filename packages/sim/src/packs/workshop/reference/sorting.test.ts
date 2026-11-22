import { expect, test } from 'vitest'
import { startChapter } from '../../../../../sandbox/src'
import { advanceGame, continueStep, createCampaign, currentStep, jumpToStep } from '../../../index'
import { applyChapterHint, workshopReference } from './chapter-one'

test('the first sorting run has room for both samples before the cutter arrives', async () => {
  const c = jumpToStep(createCampaign(), 'vein-sort')
  // This point in the random vein formerly filled the copper bin before any iron appeared.
  c.world.seed = 34
  const files = applyChapterHint(c.project.working, currentStep(c)!.step)
  const { program } = await startChapter(c, files, 'deploy')
  try {
    for (let i = 0; i < 128 && c.lesson.phase !== 'solved'; i++) advanceGame(c, program)
    expect(c.lesson.passed).toEqual(['iron', 'copper'])
    expect(c.lesson.phase).toBe('solved')
  } finally {
    program?.dispose()
  }
})

test('both sorting samples arrive after the old clock jams the iron hearth again', async () => {
  let c = jumpToStep(createCampaign(), 'vein-clear')
  c.world.seed = 1
  const clear = await startChapter(c, workshopReference(currentStep(c)!.step), 'deploy')
  try {
    c = continueStep(c)
    // The player reads the next goal while the old delivery still runs.
    for (let i = 0; i < 3; i++) advanceGame(c, clear.program)
    expect(c.world.machines.find(m => m.id === 'furnace')?.fault).toBe('jammed')
  } finally {
    clear.program?.dispose()
  }
  const sort = await startChapter(c, workshopReference(currentStep(c)!.step), 'deploy')
  try {
    for (let i = 0; i < 120 && c.lesson.phase !== 'solved'; i++) advanceGame(c, sort.program)
    expect(c.lesson.passed).toEqual(['iron', 'copper'])
    expect(c.lesson.phase).toBe('solved')
  } finally {
    sort.program?.dispose()
  }
})
