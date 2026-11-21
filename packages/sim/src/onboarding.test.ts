import { expect, test } from 'vitest'
import { runVerb } from '../../sandbox/src'
import {
  createCampaign,
  currentLesson,
  getSurface,
  lessons,
  runBench,
  loadSave,
  serializeSave,
} from './index'
import { chapterFiles } from './reference/chapter-one'

test('the exact edits pass in a fresh bench and each empty function still needs work', async () => {
  const c = createCampaign()
  for (const lesson of lessons) {
    c.town.beat = lesson.beat
    expect(currentLesson(c)?.id).toBe(lesson.id)
    if (lesson.cases.length) {
      const files = chapterFiles(lesson.beat, lesson.id)
      const run = () =>
        runBench(lesson, files, (api, args, files) =>
          runVerb(
            { files, entry: lesson.file, chapterExports: getSurface(c).exports },
            lesson.name,
            api,
            args,
          ),
        )
      expect(
        (await run()).every((c) => c.state === 'done'),
        lesson.id,
      ).toBe(true)
      files[lesson.file] = lesson.stub
      expect(
        (await run()).every((c) => c.state === 'todo'),
        lesson.id,
      ).toBe(true)
    }
    c.town.solved.push(lesson.id)
    expect(loadSave(serializeSave(c)).town.solved).toEqual(c.town.solved)
  }
})
test('a nested transfer passes the same behavioral bench', async () => {
  const lesson = lessons.find((l) => l.id === 'smelt')!
  const files = {
    'verbs/smelt.ts':
      'import { take, put } from "inherit"; export const smelt = () => put("furnace", take("mine"))',
  }
  const checks = await runBench(lesson, files, (api, args, files) =>
    runVerb({ files, entry: lesson.file, chapterExports: ['take', 'put'] }, lesson.name, api, args),
  )
  expect(checks[0].state).toBe('done')
})
