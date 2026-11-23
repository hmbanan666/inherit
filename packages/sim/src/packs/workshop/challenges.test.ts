import { expect, test } from 'vitest'
import { createPackRunner } from '../../../../sandbox/src/pack-run'
import { freshSave, selectLesson } from '../../framework/save'
import { inputs, type ChallengeId } from './fixtures'
import { createFloor } from './floor'
import pack from './pack'

test.each(pack.lessons)('$id starts at a TODO and handles every independent input', async lesson => {
  const starter = lesson.starter()
  const lines = starter.files['main.ts'].split('\n')
  expect(lines.every(line => line === '' || line.startsWith('// TODO:'))).toBe(true)
  expect(lines[starter.edit.line - 2]).toMatch(/^\/\/ TODO:/)
  const solutionLines = lesson.referenceSolution['main.ts'].split('\n').map(line => line.trim()).filter(line => line.length > 4)
  for (const hint of lesson.hints!) expect(solutionLines.some(line => hint.includes(line))).toBe(false)
  expect(lesson.variants?.map(variant => variant.input)).toEqual(inputs(lesson.id as ChallengeId).slice(1).map(fixture => fixture.name))
  for (const fixture of inputs(lesson.id as ChallengeId)) {
    for (const reference of [false, true]) {
      const save = freshSave(pack)
      selectLesson(pack, save, lesson.id)
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
  selectLesson(pack, save, 'heavy-tally')
  const files = { 'main.ts': 'import { take, put, display } from "inherit"\nwhile (take("belt")) put("cart")\ndisplay(2)' }
  const runner = createPackRunner(pack)
  try {
    const result = await runner.play(save, files)
    expect(save.phase).toBe('working')
    expect(result.checks).toEqual(['red', 'green', 'red'])
    expect(result.failedInputs).toEqual({
      'heavy-tally-1': ['Empty belt', 'All light'],
      'heavy-tally-3': ['Empty belt', 'All light'],
    })
  } finally { runner.dispose() }
})

test('the clock setup preview leaves the first deployment eligible for a first-try award', async () => {
  const save = freshSave(pack)
  selectLesson(pack, save, 'first-clock')
  const clock = pack.lessons.find(lesson => lesson.id === 'first-clock')!
  const runner = createPackRunner(pack)
  try {
    await runner.play(save, clock.referenceSolution, 'run')
    expect(save.attempts[clock.id] ?? 0).toBe(0)
    await runner.play(save, clock.referenceSolution, 'deploy')
    expect(save.attempts[clock.id]).toBe(1)
  } finally { runner.dispose() }
})

test('invalid floor arguments identify the bad value and player line in the real runner', async () => {
  const save = freshSave(pack)
  selectLesson(pack, save, 'heavy-tally')
  const runner = createPackRunner(pack)
  const files = { 'main.ts': 'import { display } from "inherit"\ndisplay(Infinity)' }
  try {
    await expect(runner.play(save, files)).rejects.toThrow(/main.ts:2.*Infinity.*finite number/)
    expect(save.world.readings).toEqual([])
  } finally { runner.dispose() }
})
