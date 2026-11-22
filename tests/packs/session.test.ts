import { readPlayerAPI } from "../../packages/sim/src/framework/declarations"
import { expect, test } from 'vitest'
import { freshSave, decodeSave, selectLesson, continueLesson } from '../../packages/sim/src/framework/save'
import { createPackRunner } from '../../packages/sandbox/src/pack-run'
import beginner from '../../packages/sim/src/packs/beginner/pack'

test('a restored deployment starts its handler without replaying setup on the saved world',async()=>{
  const first = beginner.lessons[0]
  const pack = {...beginner, clock:{intervalMs:250,handler:'onTick' as const},
    lessons:[{...first, mode:'deploy' as const}],
    available:()=>['say','ringBell'] as const}
  const save = freshSave(pack)
  const files = {'main.ts':'ringBell()\nexport function onTick(){say("Hello!")}'}
  const runner = createPackRunner(pack)
  await runner.play(save,files,'deploy')
  expect(save.world.bell).toBe(1)
  expect(save.phase).toBe('working')
  runner.dispose()
  const restored = decodeSave(pack,JSON.stringify(save))
  const next = createPackRunner(pack)
  try {
    await next.play(restored,restored.project.deployed!,'resume')
    await next.play(restored,files,'tick')
    expect(restored.world.bell).toBe(1)
    expect(restored.phase).toBe('solved')
    continueLesson(pack,restored)
    expect(restored.lessonId).toBeNull()
  } finally { next.dispose() }
})
test('bad pack versions, archives and active file references cannot replace a good slot',()=>{
  const good = freshSave(beginner)
  for (const patch of [{packVersion:99},{lessonId:'missing'},{project:{...good.project,activeFile:'other.ts'}},
    {project:{...good.project,history:[{}]}},{world:{}}]) {
    expect(()=>decodeSave(beginner,JSON.stringify({...good,...patch}))).toThrow()
  }
  expect(decodeSave(beginner,JSON.stringify(good))).toEqual(good)
})

test('review returns to the frontier with its draft and checkpoint intact', async () => {
  const save = freshSave(beginner)
  const runner = createPackRunner(beginner)
  try {
    await runner.play(save, beginner.lessons[0].referenceSolution)
    continueLesson(beginner, save)
    save.project.working = {'main.ts': '// still choosing flowers'}
    const frontier = structuredClone(save.entryWorld)
    selectLesson(beginner, save, 'hello')
    expect(save.phase).toBe('brief')
    await runner.play(save, beginner.lessons[0].referenceSolution)
    continueLesson(beginner, save)
    expect(save.lessonId).toBe('flowers')
    expect(save.completed).toEqual(['hello'])
    expect(save.project.working['main.ts']).toBe('// still choosing flowers')
    expect(save.entryWorld).toEqual(frontier)
  } finally {
    runner.dispose()
  }
})

test('player reference retains parameter names, return guidance and multiline examples', () => {
  const source = `export interface PlayerAPI {
    /** Read the label.
     * @param place Station to inspect.
     * @returns Printed label or undefined for an empty station.
     * @example
     * const label = read("cart")
     * console.log(label)
     */
    read(place: string): string | undefined
  }`
  expect(readPlayerAPI(source).methods[0]).toMatchObject({
    signature: 'read(place: string): string | undefined',
    params: [{ name: 'place', description: 'Station to inspect.' }],
    returns: 'Printed label or undefined for an empty station.',
    example: 'const label = read("cart")\nconsole.log(label)',
  })
})

test('migration credits surviving ids across gaps, keeps the draft, and rechecks a solved boundary', async () => {
  const before = freshSave(beginner)
  const { migrateBeginner } = await import('../../packages/sim/src/framework/migrate')
  const raw = JSON.stringify({
    ...before, formatVersion: 1, packVersion: 1, lessonId: 'flowers', phase: 'solved',
    completed: ['hello', 'house-sign', 'village-fair'], released: [], seenSections: [], pendingReveals: [],
    project: {...before.project, working: {'main.ts': '// saved draft'}},
  })
  const runner = createPackRunner(beginner)
  try {
    const save = await migrateBeginner(beginner, raw, async (trial, files) => { await runner.play(trial, files) })
    expect(decodeSave(beginner, JSON.stringify(save))).toMatchObject({
      formatVersion: 2, phase: 'brief', lessonId: 'flowers', completed: ['hello', 'house-sign'],
      world: {bubble: 'Hello!', gateFlowers: 0}, project: {working: {'main.ts': '// saved draft'}},
    })
    await runner.play(save, beginner.lessons[1].referenceSolution)
    await runner.advance(save)
    expect(save.lessonId).toBe('flag')
    expect(save.world).toMatchObject({gateFlowers: 3, sign: 'Mira'})
    await expect(migrateBeginner(beginner, raw.replace('"gateFlowers":0', '"gateFlowers":null'), async () => {})).rejects.toThrow()
  } finally {
    runner.dispose()
  }
})

test('a challenge can be selected first and its named input reaches the unchanged player file', async () => {
  const second = {
    ...beginner.lessons[0], id: 'second', inputs: () => ({ greeting: { type: 'string', value: 'Hello!' } }),
  }
  const pack = {
    ...beginner, lessons: [beginner.lessons[0], second],
    manifest: {...beginner.manifest, track: 'challenges' as const, units: undefined},
    available: () => ['say'] as const,
  }
  const save = freshSave(pack)
  selectLesson(pack, save, 'second')
  const runner = createPackRunner(pack)
  try {
    await runner.play(save, {'main.ts': 'say(greeting)'})
    expect(save.phase).toBe('solved')
    continueLesson(pack, save)
    expect(save.lessonId).toBe('hello')
    expect(save.world.bubble).toBe('')
  } finally { runner.dispose() }
})

test('a constant answer fails the alternate input while the visible scene still plays', async () => {
  const first = beginner.lessons[0]
  const pack = {
    ...beginner, available: () => ['say'] as const,
    lessons: [{
      ...first,
      inputs: (w: ReturnType<typeof beginner.initialWorld>) => ({
        weather: {type: 'string', value: w.raining ? 'Rain' : 'Sun'},
      }),
      variants: [{input: 'Rainy day', enter: (w: ReturnType<typeof beginner.initialWorld>) => { w.raining = true }}],
      checks: ['Sunny day', 'Rainy day'].map(input => ({
        id: input, label: 'Report the weather', input,
        evaluate: (e: {world: ReturnType<typeof beginner.initialWorld>}) =>
          e.world.bubble === (e.world.raining ? 'Rain' : 'Sun') ? 'green' as const : 'red' as const,
      })),
    }],
  }
  const runner = createPackRunner(pack)
  const save = freshSave(pack)
  try {
    await runner.play(save, {'main.ts': 'say("Sun")'})
    expect(save.world.bubble).toBe('Sun')
    expect(save.phase).toBe('working')
    expect(save.passed).toEqual(['Sunny day'])
    await runner.play(save, {'main.ts': 'say(weather)'})
    expect(save.phase).toBe('solved')
    expect(save.world.raining).toBe(false)
  } finally { runner.dispose() }
})

test('archive verification is idempotent and an interrupted copy leaves the original slot intact', async () => {
  const { archiveSource } = await import('../../packages/sim/src/framework/archive')
  const raw = '{"project":{"working":{"main.ts":"// an old draft"}}}'
  const slots = new Map([['inherit.pack.workshop', raw]])
  const storage = {
    getItem: (key: string) => slots.get(key) ?? null,
    setItem: (key: string, value: string) => { slots.set(key, value) },
  }
  await archiveSource(storage, 'workshop', raw, JSON.parse(raw).project)
  await archiveSource(storage, 'workshop', raw, JSON.parse(raw).project)
  expect(slots.size).toBe(2)
  const broken = {...storage, setItem() { throw new Error('Storage full') }}
  await expect(archiveSource(broken, 'workshop', raw + '\n')).rejects.toThrow()
  expect(slots.get('inherit.pack.workshop')).toBe(raw)
})
