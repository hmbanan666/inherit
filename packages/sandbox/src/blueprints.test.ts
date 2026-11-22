import { expect, test } from 'vitest'
import { advanceGame, apiReference, createCampaign, getSurface, lessons } from '@inherit/sim'
import { createProgram } from './index'

test('the chapter module exposes exactly the documented functions and onTick receives zero arguments', async () => {
  const c = createCampaign()
  for (const task of lessons) {
    c.town.beat = task.beat
    const program = await createProgram({
      operations: getSurface(c).exports,
      files: {
        'main.ts':
          'import * as workshop from "inherit"; export function onTick(){ console.log(Object.keys(workshop).sort().join(","), arguments.length) }',
      },
    })
    try {
      advanceGame(c, program)
      expect(program.drainLogs()).toEqual([
        apiReference(c)
          .map((doc) => doc.name)
          .sort()
          .join(',') + ' 0',
      ])
    } finally {
      program.dispose()
    }
    c.town.solved.push(task.id)
  }
})
