import { expect, test } from 'vitest'
import ts from 'typescript'
import { posix } from 'node:path'
import { advanceGame, apiDeclarations, apiReference, bramLessons, createCampaign, onboardingStep } from '../index'

import { chapterFiles } from './chapter-one'

function typecheck(files: Map<string, string>) {
  files.set(
    '/workshop/globals.d.ts',
    'type Json = string | number | boolean | null | Json[] | { [key: string]: Json }; declare const memory: { [key: string]: Json }',
  )
  const options: ts.CompilerOptions = {
    strict: true,
    target: ts.ScriptTarget.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    noEmit: true,
    types: [],
  }
  const host = ts.createCompilerHost(options)
  const { fileExists, directoryExists, readFile } = host
  const dirs = new Set(
    [...files.keys()].flatMap((path) => [posix.dirname(path), posix.dirname(posix.dirname(path))]),
  )
  host.directoryExists = (path) => dirs.has(path) || !!directoryExists?.(path)
  host.fileExists = (path) => files.has(path) || fileExists(path)
  host.readFile = (path) => files.get(path) ?? readFile(path)
  const program = ts.createProgram([...files.keys()], options, host)
  const errors = ts.getPreEmitDiagnostics(program).map((d) => ({
    file: d.file?.fileName,
    code: d.code,
    message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
  }))
  expect(errors).toEqual([])
}

test('each chapter controller typechecks against the declarations available at that beat', () => {
  const c = createCampaign()
  const files = new Map<string, string>()
  for (const beat of [2, 3, 4, 5, 6, 7, 8, 9]) {
    c.town.beat = beat
    const dir = '/workshop/' + beat
    const scope = (source: string) => source.replaceAll('"inherit"', JSON.stringify('inherit-' + beat))
    files.set(dir + '/api.d.ts', scope(apiDeclarations(c)))
    for (const [name, text] of Object.entries(chapterFiles(beat))) files.set(dir + '/' + name, scope(text))
  }
  typecheck(files)
})

test('each exact hint compiles at its step and later verbs stay out of autocomplete', () => {
  const c = createCampaign()
  const files = new Map<string, string>()
  let imports = ''
  const lines: string[] = []
  for (const step of [1, 2, 3, 4, 5, 6, 7] as const) {
    expect(onboardingStep(c, step === 2)).toBe(step)
    const lesson = bramLessons[step]
    const dir = '/workshop/step-' + step
    const scope = (source: string) => source.replaceAll('"inherit"', JSON.stringify('inherit-step-' + step))
    files.set(dir + '/api.d.ts', scope(apiDeclarations(c)))
    imports = lesson.importLine ?? imports
    if (step >= 2 && lesson.code) lines.push(lesson.code)
    const controller = step === 1 ? lesson.code! : imports + '\nexport function onTick() {\n' + lines.join('\n') + '\n}'
    const locked = [
      step < 3 && 'import { mine } from "inherit"',
      step < 4 && 'import { furnace } from "inherit"',
      step === 3 && 'mine.connect("furnace")',
      step === 4 && 'furnace.smelt()',
      step < 6 && 'import { cart } from "inherit"',
      (step === 4 || step === 5) && 'furnace.connect("cart")',
      step >= 3 && 'mine.smelt()',
      step >= 6 && 'cart.connect(mine)',
    ].filter(Boolean)
    files.set(dir + '/main.ts', scope(controller + locked.map(line => '\n// @ts-expect-error\n' + line).join('')))
    if (step === 2) c.progress.signals.printedTick = true
    if (step === 3) advanceGame(c, ctx => ctx.dig('mine'))
    if (step === 4) advanceGame(c, ctx => ctx.connect('mine', 'furnace'))
    if (step === 5) {
      for (let i = 0; i < 8; i++) advanceGame(c, ctx => {
        ctx.dig('mine')
        ctx.work('furnace')
      })
    }
    if (step === 6) advanceGame(c, ctx => ctx.connect('furnace', 'cart'))
  }
  typecheck(files)
})

test('the reference and controller typings introduce calls at the same story beat', () => {
  const c = createCampaign()
  for (const [name, beat] of [
    ['build', 2], ['stock', 3], ['peek', 4], ['route', 4],
    ['repair', 6], ['onMachineIdle', 6], ['onItemArrived', 6], ['orders', 8],
  ] as const) {
    for (const current of [beat - 1, beat]) {
      c.town.beat = current
      expect(apiReference(c).some(entry => entry.name === name)).toBe(current >= beat)
      if (current > 1) expect(new RegExp('\\b' + name + '\\??\\(').test(apiDeclarations(c))).toBe(current >= beat)
    }
  }
})
