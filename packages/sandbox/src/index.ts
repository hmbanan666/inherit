import ts from 'typescript'
import variant from '@jitl/quickjs-singlefile-browser-release-sync'
import { DefaultIntrinsics, newQuickJSWASMModuleFromVariant, type QuickJSHandle } from 'quickjs-emscripten'
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping'
import type { Factory, Item } from '@inherit/sim'

const engine = () => newQuickJSWASMModuleFromVariant(variant)
let engineReady: ReturnType<typeof engine> | undefined
export interface Program { onTick(ctx: Factory): void; dispose(): void }

export async function createProgram(source: string): Promise<Program> {
  if (source.length > 64_000) throw new Error('Controller exceeds 64,000 characters.')
  const compiled = ts.transpileModule(source, {
    fileName: 'controller.ts', reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, sourceMap: true },
  })
  const diagnostic = compiled.diagnostics?.find(d => d.category === ts.DiagnosticCategory.Error)
  if (diagnostic) {
    const line = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line ?? 0
    throw new Error(`controller.ts:${line + 1} · ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`)
  }
  const map = new TraceMap(compiled.sourceMapText!)
  const module = await (engineReady ??= engine())
  const runtime = module.newRuntime()
  runtime.setMemoryLimit(8 * 1024 * 1024)
  runtime.setMaxStackSize(256 * 1024)
  let deadline = performance.now() + 100
  runtime.setInterruptHandler(() => performance.now() >= deadline)
  const vm = runtime.newContext({ intrinsics: { ...DefaultIntrinsics, Date: false } })
  const api = vm.newObject()
  let handler: QuickJSHandle | undefined
  let current: Factory | undefined
  let calls = 0
  const dispose = () => {
    handler?.dispose()
    api.dispose()
    vm.dispose()
    runtime.dispose()
  }
  function failure(error: QuickJSHandle): Error {
    try {
      // Only bounded strings cross the error bridge. Never serialize player objects.
      const read = (key: string) => vm.getProp(error, key).consume(h =>
        vm.typeof(h) === 'string' ? vm.getString(h).slice(0, 4096) : '')
      const message = vm.typeof(error) === 'string' ? vm.getString(error).slice(0, 4096) : read('message')
      const frame = read('stack').match(/controller\.js:(\d+)(?::(\d+))?/)
      const pos = frame && originalPositionFor(map, { line: Math.max(1, Number(frame[1]) - 1), column: Math.max(0, Number(frame[2] ?? 1) - 1) })
      return new Error(`controller.ts${pos?.line ? ':' + pos.line : ''} · ${message || 'Controller stopped.'}`)
    } finally { error.dispose() }
  }
  try {
    const setup = vm.evalCode('delete Math.random; delete globalThis.Date')
    if (setup.error) throw failure(setup.error)
    setup.value.dispose()
    vm.defineProp(api, 'tick', { get: () => vm.newNumber(current?.tick ?? 0) })
    for (const key of ['dig', 'work', 'route', 'space', 'stock'] as const) {
      const fn = vm.newFunction(key, (first, second) => {
        if (!current || ++calls > 128) throw new Error('Maximum 128 factory calls per tick.')
        const string = (h?: QuickJSHandle) => h && vm.typeof(h) === 'string' ? vm.getString(h) : undefined
        const id = string(first) ?? ''
        const arg = string(second)
        if (key === 'stock') return vm.newNumber(current.stock(id, arg as Item | undefined))
        const ok = key === 'route' ? current.route(id, arg ?? '') : key === 'space' ? current.space(id, arg) : current[key](id)
        return ok ? vm.true : vm.false
      })
      vm.setProp(api, key, fn)
      fn.dispose()
    }
    const run = vm.evalCode(`(function () { const exports = {};\n${compiled.outputText}\nreturn exports.onTick; })()`, 'controller.js', { type: 'global' })
    if (run.error) throw failure(run.error)
    handler = run.value
    if (vm.typeof(handler) !== 'function') throw new Error('Export a function named onTick.')
    return {
      onTick(ctx) {
        current = ctx
        calls = 0
        deadline = performance.now() + 25
        try {
          const result = vm.callFunction(handler!, vm.undefined, api)
          if (result.error) throw failure(result.error)
          result.value.dispose()
        } finally { current = undefined }
      },
      dispose,
    }
  } catch (error) {
    dispose()
    throw error
  }
}
