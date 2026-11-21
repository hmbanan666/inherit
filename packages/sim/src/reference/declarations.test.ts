import { expect, test } from 'vitest'
import ts from 'typescript'
import { posix } from 'node:path'
import { apiDeclarations, createCampaign, getSurface } from '../index'

import { chapterFiles } from './chapter-one'

test('each chapter controller typechecks against the declarations available at that beat', () => {
  const c = createCampaign()
  const files = new Map<string, string>()
  files.set(
    '/workshop/globals.d.ts',
    'type Json = string | number | boolean | null | Json[] | { [key: string]: Json }; declare const memory: { [key: string]: Json }',
  )
  for (const beat of [1, 3, 4, 5, 6, 7, 8, 9]) {
    c.town.beat = beat
    const dir = '/workshop/' + beat
    const scope = (source: string) => source.replaceAll('"inherit"', JSON.stringify('inherit-' + beat))
    files.set(dir + '/api.d.ts', scope(apiDeclarations(c)))
    for (const [name, text] of Object.entries(chapterFiles(beat))) files.set(dir + '/' + name, scope(text))
    expect(getSurface(c).methods).toContain('build')
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
  expect(errors).toEqual([])
})
