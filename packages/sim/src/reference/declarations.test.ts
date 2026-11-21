import { expect, test } from 'vitest'
import ts from 'typescript'
import { posix } from 'node:path'
import { apiDeclarations, apiReference, createCampaign, lessons } from '../index'

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

test('each exact hint and its growing project typecheck with only the unlocked exports', () => {
  const c = createCampaign()
  const files = new Map<string, string>()
  for (const lesson of lessons) {
    c.town.beat = lesson.beat
    const dir = '/workshop/' + lesson.id
    const scope = (source: string) => source.replaceAll('"inherit"', JSON.stringify('inherit-' + lesson.id))
    files.set(dir + '/api.d.ts', scope(apiDeclarations(c)))
    for (const [name, source] of Object.entries(chapterFiles(lesson.beat, lesson.id)))
      files.set(dir + '/' + name, scope(source))
    const entries = apiReference(c)
    for (const doc of entries) {
      const imports = 'import { ' + entries.map((entry) => entry.name).join(', ') + ' } from "inherit"'
      files.set(dir + '/example-' + doc.name + '.ts', scope(imports + '\n' + doc.example))
    }
    c.town.solved.push(lesson.id)
  }
  typecheck(files)
})
