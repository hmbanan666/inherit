import { expect, test } from 'vitest'
import beginner from '../../sim/src/packs/beginner/pack'
import { freshSave } from '../../sim/src/framework/save'
import { runPack } from './pack-run'
import { PlayerRunError } from './plain-error'

test('the real runner locates and explains common editing mistakes', async () => {
  const cases: [source: string, title: string, marked: string][] = [
    ['sya("Hello")', 'Check the spelling on line 2', 'sya'],
    ['Say("Hello")', 'Capital letters matter in names', 'Say'],
    ['say(Hello)', 'The words need quotes', 'Hello'],
    ['say(Hello there)', 'The words need quotes', 'Hello there'],
    ['say("Hello)', 'A quote is missing', '"Hello)'],
    ['say("Hello"', 'A bracket is missing', '('],
    ['say("")', 'No words yet', '""'],
    ['say(“Hello”)', 'Those are curly quotes', '“'],
    ['say "Hello"', 'Line 2 is not quite code yet', 'say "Hello"'],
  ]
  for (const [line, title, marked] of cases) {
    const source = '// Mila says the words between the quotes.\n' + line
    const error = await runPack(beginner, freshSave(beginner), { 'main.ts': source }).catch(e => e)
    expect(error).toBeInstanceOf(PlayerRunError)
    const plain = error.diagnostic
    expect([line, plain.title]).toEqual([line, title])
    expect(plain.line).toBe(2)
    expect(source.slice(plain.mark!.from, plain.mark!.to)).toBe(marked)
    expect(plain.raw).toContain('main.ts:2')
    expect(plain.body).not.toMatch(/expected|identifier|literal|undefined/i)
  }
})
