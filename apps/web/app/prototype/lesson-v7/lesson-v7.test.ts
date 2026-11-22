import { expect, test } from 'vitest'
import beginner from '../../../../../packages/sim/src/packs/beginner/pack'
import { continueLesson, freshSave } from '../../../../../packages/sim/src/framework/save'
import { createPackRunner } from '../../../../../packages/sandbox/src/pack-run'
import { lessonsV7 } from './content'
import { plainError } from './plain-errors'

async function attempt(id: string, source: string) {
  const save = freshSave(beginner)
  const runner = createPackRunner(beginner)
  try {
    while (save.lessonId !== id) {
      const lesson = beginner.lessons.find(l => l.id === save.lessonId)!
      await runner.play(save, lesson.referenceSolution, lesson.mode)
      continueLesson(beginner, save)
    }
    try {
      await runner.play(save, { 'main.ts': source })
      return { solved: save.phase === 'solved', world: save.world, error: '' }
    } catch (cause) {
      return { solved: false, world: save.world, error: (cause as Error).message }
    }
  } finally { runner.dispose() }
}

test('the v7 copy lines up with the first shipped lessons', async () => {
  expect(lessonsV7.map(lesson => lesson.id)).toEqual(beginner.lessons.slice(0, lessonsV7.length).map(lesson => lesson.id))
  for (const v7 of lessonsV7) {
    const shipped = beginner.lessons.find(lesson => lesson.id === v7.id)!
    const reference = shipped.referenceSolution['main.ts']
    expect(v7.checks).toHaveLength(shipped.checks.length)
    expect(v7.ghost(v7.starter)?.offset).toBe(v7.caret)
    expect(v7.ready(v7.starter)).toBe(false)
    expect(v7.ready(reference)).toBe(true)
    expect((await attempt(v7.id, v7.starter)).solved).toBe(false)
    expect((await attempt(v7.id, reference)).solved).toBe(true)
  }
})

test('typing only the words into the lesson 1 prefill solves it', async () => {
  const { starter, caret } = lessonsV7[0]
  const typed = starter.slice(0, caret) + 'Hello, traveller!' + starter.slice(caret)
  const result = await attempt('hello', typed)
  expect(result.solved).toBe(true)
  expect(result.world.bubble).toBe('Hello, traveller!')
})

test('runner messages for beginner slips become plain titles with a marked token', async () => {
  const context = { names: ['say'], example: 'say("The lantern is lit.")', needsWords: 'Mila needs some words.' }
  const cases: [source: string, title: string, marked: string][] = [
    ['sya("Hello")', 'Check the spelling on line 2', 'sya'],
    ['Say("Hello")', 'Capital letters matter in names', 'Say'],
    ['say(Hello)', 'The words need quotes', 'say(Hello)'],
    ['say(Hello there)', 'The words need quotes', 'say(Hello there)'],
    ['say("Hello)', 'A quote is missing', 'say("Hello)'],
    ['say("Hello"', 'A bracket is missing', 'say("Hello"'],
    ['say("")', 'No words yet', 'say("")'],
    ['say(“Hello”)', 'Those are curly quotes', 'say(“Hello”)'],
    ['say "Hello"', 'Line 2 is not quite code yet', 'say "Hello"'],
  ]
  for (const [line, title, marked] of cases) {
    const source = '// Mila says the words between the quotes.\n' + line
    const { error } = await attempt('hello', source)
    const plain = plainError(error, source, context)
    expect([line, plain.title]).toEqual([line, title])
    expect(plain.line).toBe(2)
    expect(source.slice(plain.mark!.from, plain.mark!.to)).toBe(marked)
    expect(plain.raw).toBe(error)
    expect(plain.body).not.toMatch(/expected|identifier|literal|undefined/i)
  }
})

test('a run without errors explains what is still different in the scene', async () => {
  const [, sign, order] = lessonsV7
  expect(sign.miss((await attempt('sign-spaces', 'paintSign("moon ferry")')).world)).toContain('Capital letters count.')
  expect(sign.miss((await attempt('sign-spaces', 'paintSign("MoonFerry")')).world)).toContain('The space between the words counts.')
  expect(order.miss((await attempt('call-order', 'say("All aboard")')).world)).toContain('Only one message showed.')
  expect(order.miss((await attempt('call-order', 'say("Go")\nsay("All aboard")')).world)).toContain('“Go” showed first.')
})
