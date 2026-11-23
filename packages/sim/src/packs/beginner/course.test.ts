import { expect, test } from 'vitest'
import { lessons, units } from './lessons'
import { inputCards } from './inputs'
import pack from './pack'

test('the course map contains 52 lessons across ten ordered units', () => {
  expect(pack.lessons).toHaveLength(52)
  expect(units.map(unit => lessons.filter(lesson => lesson.unit === unit.id).length))
    .toEqual([4, 4, 6, 5, 3, 7, 5, 5, 5, 8])
  expect(lessons.map(lesson => lesson.unit))
    .toEqual(units.flatMap(unit => lessons.filter(lesson => lesson.unit === unit.id).map(() => unit.id)))
  expect(lessons[0].id).toBe('hello')
  expect(lessons.at(-1)?.id).toBe('fair-opening')
})

test.each(lessons)('$id explains its edit and has an independent example', lesson => {
  const { body, example } = lesson.theory
  expect(body.length).toBeGreaterThanOrEqual(3)
  expect(body.length).toBeLessThanOrEqual(8)
  expect(body.every(line => line.trim() && !line.includes('\n'))).toBe(true)
  const reference = lesson.referenceSolution['main.ts']
  expect(example.trim()).not.toBe(reference.trim())
  const { files, edit } = lesson.starter()
  const lines = files['main.ts'].split('\n')
  if (lesson.steps) {
    expect(lesson.readyPattern!.test(files['main.ts'])).toBe(false)
    expect(lesson.readyPattern!.test(reference)).toBe(true)
  } else {
    expect(lines[edit.line - 2]).toMatch(/^\s*\/\/ TODO: /)
    expect(lines[edit.line - 1].trim()).toBe('')
  }
  const answerLines = reference.split('\n').map(line => line.trim()).filter(line => line.length > 4)
  for (const todo of lines.filter(line => line.includes('// TODO:'))) {
    for (const answer of answerLines) expect(todo).not.toContain(answer)
  }
  expect(lesson.hints.length).toBeGreaterThanOrEqual(2)
  expect(lesson.hints.length).toBeLessThanOrEqual(3)
  expect(lesson.checks.length).toBeGreaterThanOrEqual(1)
  expect(lesson.checks.length).toBeLessThanOrEqual(2)
  const world = pack.initialWorld(1)
  lesson.enter(world)
  const methods = pack.available(world, lesson.id)
  for (const name of Object.keys(inputCards(world))) expect(methods).not.toContain(name)
  expect(world.scene).toBe(lesson.scene)
  if (lesson.kind === 'predict') expect(lesson.prediction?.choices).toContain(lesson.prediction?.answer)
})
