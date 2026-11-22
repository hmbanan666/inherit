import { expect, test } from 'vitest'
import { createPackRunner } from '../../../../sandbox/src/pack-run'
import { freshSave, selectChallenge } from '../../framework/save'
import { inputs, type ChallengeId } from './fixtures'
import { createFloor } from './floor'
import pack from './pack'

test.each(pack.lessons)('$id starts at a TODO and handles every independent input', async lesson => {
  const starter = lesson.starter({})
  const lines = starter.files['main.ts'].split('\n')
  expect(lines.every(line => line === '' || line.startsWith('// TODO:'))).toBe(true)
  expect(lines[starter.edit.line - 2]).toMatch(/^\/\/ TODO:/)
  const solutionLines = lesson.referenceSolution['main.ts'].split('\n').map(line => line.trim()).filter(line => line.length > 4)
  for (const hint of lesson.hints!) expect(solutionLines.some(line => hint.includes(line))).toBe(false)
  for (const fixture of inputs(lesson.id as ChallengeId)) {
    for (const reference of [false, true]) {
      const save = freshSave(pack)
      selectChallenge(pack, save, lesson.id)
      save.world = createFloor(lesson.id as ChallengeId, fixture)
      save.entryWorld = structuredClone(save.world)
      const files = reference ? lesson.referenceSolution : starter.files
      const runner = createPackRunner(pack)
      try {
        await runner.play(save, files, reference ? lesson.mode : 'run')
        if (reference) for (const _ of fixture.turns ?? []) await runner.play(save, files, 'tick')
        expect(save.phase === 'solved', fixture.name).toBe(reference)
      } finally { runner.dispose() }
    }
  }
})

test('checks identify the hidden input when a program only handles the shown batch', async () => {
  const save = freshSave(pack)
  selectChallenge(pack, save, 'heavy-tally')
  const files = { 'main.ts': 'import { take, put, display } from "inherit"\nwhile (take("belt")) put("cart")\ndisplay(2)' }
  const runner = createPackRunner(pack)
  try {
    const result = await runner.play(save, files)
    expect(save.phase).toBe('working')
    expect(result.failures).toContain('Empty belt')
  } finally { runner.dispose() }
})
