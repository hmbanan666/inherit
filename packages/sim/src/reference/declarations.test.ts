import { expect, test } from 'vitest'
import ts from 'typescript'
import { posix } from 'node:path'
import { apiDeclarations, createCampaign, OBJECTIVES, referenceActions, referenceFiles } from '../index'

test('each pasteable stage typechecks against its own editor surface, including recipe typos', () => {
  const c = createCampaign()
  const files = new Map<string, string>()
  files.set(
    '/workshop/globals.d.ts',
    'type Json = string | number | boolean | null | Json[] | { [key: string]: Json }; declare const memory: { [key: string]: Json }',
  )
  for (const stage of OBJECTIVES) {
    // Each folder has its own "inherit" module just as each research milestone does in Monaco.
    for (const a of referenceActions(stage.id)) if (a[0] === 'research') c.economy.research.push(a[1])
    const dir = '/workshop/' + stage.id
    const scope = (source: string) => source.replaceAll('"inherit"', JSON.stringify('inherit-' + stage.id))
    files.set(dir + '/api.d.ts', scope(apiDeclarations(c)))
    for (const [name, text] of Object.entries(referenceFiles(stage.id)))
      files.set(dir + '/' + name, scope(text))
    if (stage.id === 'contract')
      files.set(
        dir + '/typo.ts',
        scope(
          'import { runJob } from "./lib/jobs"; import type { Factory } from "inherit"; declare const ctx: Factory; runJob(ctx, "draw", "wirre")',
        ),
      )
  }
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
  expect(errors).toEqual([
    { file: '/workshop/contract/typo.ts', code: 2345, message: expect.stringContaining('wirre') },
  ])
})
