import ts from 'typescript'
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping'

export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject
export interface JsonObject {
  [key: string]: JsonValue
}
export interface ProjectOptions {
  files: Record<string, string>
  entry?: string
  memory?: JsonObject
  budget?: number
  unlockedEvents?: readonly string[]
}

export function projectOptions(source: string | ProjectOptions): ProjectOptions {
  return typeof source === 'string' ? { files: { 'controller.ts': source }, entry: 'controller.ts' } : source
}

function projectPath(path: string) {
  if (path.length > 128 || !/^(?:[\w-][\w.-]*\/)*[\w-][\w.-]*\.ts$/.test(path) || path.endsWith('.d.ts')) {
    throw new Error('Invalid project path. Use a relative .ts filename.')
  }
}

function resolveImport(files: Map<string, string>, from: string, request: string, location = from) {
  if (request === 'inherit') return request
  const parts = from.split('/').slice(0, -1)
  if (request.length > 128 || !/^\.\.?\//.test(request)) {
    throw new Error(`${location} · Import from "inherit" or use a relative project path.`)
  }
  for (const part of request.split('/')) {
    if (part === '.') continue
    if (part === '..') {
      if (!parts.length) throw new Error(`${location} · Import escapes the project.`)
      parts.pop()
    } else {
      if (!part || !/^[\w.-]+$/.test(part)) throw new Error(`${location} · Invalid import path.`)
      parts.push(part)
    }
  }
  const path = parts.join('/')
  for (const candidate of [path, path + '.ts', path + '/index.ts']) {
    if (files.has(candidate)) return candidate
  }
  throw new Error(`${location} · Cannot resolve ${request}.`)
}

export function compileProject(options: ProjectOptions, testing: boolean) {
  const files = new Map(Object.entries(options.files))
  if (files.size > 32) throw new Error('A project can contain at most 32 files.')
  let size = 0
  for (const [path, source] of files) {
    projectPath(path)
    if (typeof source !== 'string') throw new Error(`${path} · Expected TypeScript source text.`)
    size += source.length
    if (source.length > 64_000 || size > 256_000) {
      throw new Error('Project exceeds 64,000 characters per file or 256,000 total.')
    }
  }
  const entry = testing ? 'tests.ts' : (options.entry ?? 'main.ts')
  projectPath(entry)
  const compiled = new Map<string, { js: string; map: TraceMap }>()
  const resolve = (from: string, request: string) => resolveImport(files, from, request)
  function compile(path: string) {
    if (path === 'inherit' || compiled.has(path)) return
    const source = files.get(path)
    if (source === undefined) throw new Error(`Missing project entry ${path}.`)
    const output = ts.transpileModule(source, {
      fileName: path,
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, sourceMap: true },
    })
    const error = output.diagnostics?.find((d) => d.category === ts.DiagnosticCategory.Error)
    if (error) {
      const line = error.file?.getLineAndCharacterOfPosition(error.start ?? 0).line ?? 0
      throw new Error(`${path}:${line + 1} · ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`)
    }
    const map = new TraceMap(output.sourceMapText!)
    compiled.set(path, { js: output.outputText, map })
    for (const dependency of ts.preProcessFile(output.outputText, true, true).importedFiles) {
      const prefix = output.outputText.slice(0, dependency.pos)
      const position = originalPositionFor(map, {
        line: prefix.split('\n').length, column: prefix.length - prefix.lastIndexOf('\n') - 1,
      })
      compile(resolveImport(files, path, dependency.fileName, position.line ? path + ':' + position.line : path))
    }
  }
  compile(entry)
  return {
    entry,
    resolve,
    load(path: string) {
      const file = compiled.get(path)
      if (!file) throw new Error('Unknown project module.')
      return file.js
    },
    location(stack: string) {
      for (const match of stack.matchAll(/([\w./-]+\.ts):(\d+)(?::(\d+))?/g)) {
        const file = compiled.get(match[1])
        if (!file) continue
        const pos = originalPositionFor(file.map, {
          line: +match[2],
          column: Math.max(0, +(match[3] ?? 1) - 1),
        })
        return pos.line ? match[1] + ':' + pos.line : match[1]
      }
      return entry
    },
  }
}
