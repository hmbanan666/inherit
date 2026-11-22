import { expect, test } from 'vitest'
import {
  advanceGame,
  continueStep,
  createCampaign,
  currentStep,
  jumpToStep,
  loadSave,
  primitiveTick,
  serializeSave,
} from '@inherit/sim'
import { runOnce, startChapter, createProgram } from './index'

test('watched calls keep source positions and the innermost function across files and soft failures', async () => {
  const c = createCampaign()
  const tick = primitiveTick(c, 'run')
  const files = {
    'main.ts': 'import { outer } from "./tools"\nouter()',
    'tools.ts':
      'import { take, put } from "inherit"\ntype Name = string\nexport function outer() { inner() }\nfunction inner() {\n  take("mine")\n  put("furnace")\n  take("mines")\n}',
  }
  await runOnce({ files, operations: ['take','put'] }, tick.api)
  expect(tick.calls.map(({ file, line, within, hand, ok }) => [file, line, within, hand, ok])).toEqual([
    ['tools.ts', 5, 'inner', 'iron-ore', true],
    ['tools.ts', 6, 'inner', null, true],
    ['tools.ts', 7, 'inner', null, false],
  ])
  tick.finish()
})

test('Deploy runs module scope once and calls the exported clock with zero arguments on each tick', async () => {
  const c = createCampaign()
  const init = primitiveTick(c, 'deploy')
  const program = await createProgram(
    {
      operations: ['take','put'],
      files: {
        'main.ts':
          'import { take, put } from "inherit"\ntake("mine")\nexport function onTick() {\n  if (arguments.length) throw Error("clock arguments")\n  put("cart")\n}',
      },
    },
    init.api,
  )
  try {
    expect(init.calls).toMatchObject([{ line: 2, fn: 'take' }])
    expect(init.calls[0].within).toBeUndefined()
    init.finish()
    for (let i = 0; i < 2; i++) {
      const tick = primitiveTick(c)
      program.onTick(tick.api)
      expect(tick.calls).toMatchObject([{ line: 5, within: 'onTick', fn: 'put' }])
      tick.finish()
    }
  } finally {
    program.dispose()
  }
})

test('an empty starter, a typo and a successful watched Run stay on the same card until Continue', async () => {
  const c = createCampaign()
  const starter = c.project.working['main.ts']
  const first = await startChapter(c, c.project.working, 'run')
  expect(first.calls).toEqual([])
  expect(currentStep(c)?.phase).toBe('working')
  const typo = await startChapter(c, { 'main.ts': starter + 'take("mines")' }, 'run')
  expect(typo.calls).toMatchObject([
    {
      line: 4,
      ok: false,
      hand: null,
      message: 'There is no place called "mines". Places: mine, furnace, cart.',
    },
  ])
  expect(continueStep(c)).toEqual(c)
  await startChapter(c, { 'main.ts': starter + 'take("mine")' }, 'run')
  for (let i = 0; i < 50; i++) advanceGame(c)
  const restored = loadSave(serializeSave(c))
  expect(currentStep(restored)).toMatchObject({ step: { id: 'bram-take' }, phase: 'solved' })
  expect(restored.world.hand?.item).toBe('iron-ore')
  expect(currentStep(continueStep(restored))).toMatchObject({ step: { id: 'bram-feed' }, phase: 'brief' })
})

test('a stopped watched run shows completed moves and a failed deployment leaves its purchase uncharged', async () => {
  const c = createCampaign()
  await expect(
    startChapter(
      c,
      { 'main.ts': 'import { take } from "inherit"\ntake("mine")\nthrow Error("stopped")' },
      'run',
    ),
  ).rejects.toMatchObject({
    message: 'main.ts:3 · stopped',
    calls: [{ file: 'main.ts', line: 2, hand: 'iron-ore' }],
  })
  expect(c.world.hand?.origin).toBe('mine')
  expect(c.lesson.phase).toBe('working')
  const shed = jumpToStep(c, 'elsie-press')
  const money = shed.economy.money
  await expect(
    startChapter(
      shed,
      { 'main.ts': 'import { buy } from "inherit"\nbuy("press")\nthrow Error("stopped")' },
      'deploy',
    ),
  ).rejects.toThrow('stopped')
  expect(shed.economy.money).toBe(money)
  expect(shed.world.machines.some((m) => m.id === 'press')).toBe(false)
})

test('an empty clock cannot automate Bram by repeating module setup', async () => {
  const c = jumpToStep(createCampaign(), 'bram-loop')
  const files = { 'main.ts': c.project.working['main.ts'] + '\nexport function onTick() {}' }
  for (let i = 0; i < 200; i++) {
    const { program } = await startChapter(c, files, 'deploy')
    advanceGame(c, program)
    program!.dispose()
  }
  expect(currentStep(c)?.phase).toBe('working')
  expect(c.economy.money).toBe(0)
})

test('Run once continues the deployed clock and keeps draft setup off the floor', async () => {
  const c = jumpToStep(createCampaign(), 'elsie-press')
  const files = { 'main.ts': 'let n = 0; console.log("setup"); export function onTick() { console.log(++n) }' }
  const { program } = await startChapter(c, files, 'deploy')
  try {
    expect(advanceGame(c, program, program!.drainLogs).logs).toEqual(['1'])
    expect((await startChapter(c, files, 'run', program)).logs).toEqual(['2'])
    const draft = { 'main.ts': 'import { buy } from "inherit"; buy("press"); ' + files['main.ts'] }
    expect((await startChapter(c, draft, 'run', program)).logs).toEqual(['1'])
    expect(c.world.machines.map(m => m.id)).not.toContain('press')
    expect(advanceGame(c, program, program!.drainLogs).logs).toEqual(['3'])
  } finally {
    program?.dispose()
  }
})

test.each([true, false])('the cart remembers whether the first Run found an unfinished ingot (%s)', async (ready) => {
  let c = jumpToStep(createCampaign(), 'bram-cart')
  const files = { 'main.ts': c.project.working['main.ts'] + 'take("furnace")\nput("cart")\n' }
  if (ready) for (let i = 0; i < 6; i++) advanceGame(c)
  const first = await startChapter(c, files, 'run')
  expect(first.calls.find(call => call.fn === 'take' && call.args[0] === 'furnace')?.ok).toBe(ready)
  c = loadSave(serializeSave(c))
  if (!ready) {
    for (let i = 0; i < 6; i++) advanceGame(c)
    await startChapter(c, files, 'run')
  }
  expect(currentStep(c)).toMatchObject({ phase: 'solved', step: { solved: {
    idea: ready ? 'The arm carried the ingot from the furnace to the cart.'
      : 'Your first Run found the furnace still working, so take came back empty. Running again collected the finished ingot.',
  } } })
})

test('deploying the press purchase twice buys one press for 28 coins', async () => {
  const c = jumpToStep(createCampaign(), 'elsie-press')
  const start = c.economy.money
  const files = { 'main.ts': 'import { buy } from "inherit"\nbuy("press")\nexport function onTick() {}' }
  for (let i = 0; i < 2; i++) {
    const { program } = await startChapter(c, files, 'deploy')
    program!.dispose()
    expect(c.economy.money).toBe(start - 28)
    expect(c.world.machines.filter(m => m.id === 'press')).toHaveLength(1)
  }
})
