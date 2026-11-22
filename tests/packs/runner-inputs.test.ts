import { expect, test } from 'vitest'
import { runPack } from '../../packages/sandbox/src/pack-run'
import { freshSave } from '../../packages/sim/src/framework/save'
import type { Check } from '../../packages/sim/src/framework/pack'
import beginner from '../../packages/sim/src/packs/beginner/pack'

test('the pack can use guest console output to finish its scene', async () => {
  const lesson = beginner.lessons.find(lesson => lesson.id === 'weigh-ticket')!
  const pack = { ...beginner, lessons: [lesson] }
  const save = freshSave(pack)
  const result = await runPack(pack, save, lesson.referenceSolution)
  expect(result.logs).toEqual(['10'])
  expect(save.world.slip).toBe('10')
  expect(save.phase).toBe('solved')
})

test('a check keeps one result across the scene and every alternate input', async () => {
  type World = ReturnType<typeof beginner.initialWorld>
  const checks: Check<World>[] = [
    { id: 'speaks', label: 'Greet the visitor', evaluate: e => e.world.bubble ? 'green' : 'red' },
    { id: 'name', label: 'Use the visitor’s name', evaluate: e => e.world.bubble === e.world.sign ? 'green' : 'amber' },
  ]
  const lesson = {
    ...beginner.lessons[0],
    enter(world: World) { world.sign = 'Mila' },
    inputs: (world: World) => ({ visitor: { type: 'string', value: world.sign } }),
    variants: ['Pip', 'Ada'].map(input => ({ input, enter(world: World) { world.sign = input } })),
    checks,
  }
  const pack = { ...beginner, lessons: [lesson] }
  const save = freshSave(pack)
  const play = (source: string) => runPack(pack, save, { 'main.ts': source })
  const wrong = await play('say("Mila")')
  expect(wrong.checks).toEqual(['green', 'amber'])
  expect(wrong.failedInputs).toEqual({ name: ['Pip', 'Ada'] })
  expect(save.world.bubble).toBe('Mila')
  expect(save.passed).toEqual(['speaks'])

  const partial = await play('if (visitor === "Ada") throw new Error("missing")\nsay("Pip")')
  expect(partial.checks).toEqual(['red', 'red'])
  expect(partial.failedInputs).toEqual({ speaks: ['Ada'], name: ['Scene input', 'Ada'] })
  const correct = await play('say(visitor)')
  expect(correct.failedInputs).toEqual({})
  expect(save.phase).toBe('solved')
})
