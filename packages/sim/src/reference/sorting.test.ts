import { expect, test } from 'vitest'
import { startChapter } from '../../../sandbox/src'
import { advanceGame, createCampaign, currentStep, jumpToStep } from '../index'
import { applyChapterHint } from './chapter-one'

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
