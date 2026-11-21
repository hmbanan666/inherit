import variant from '@jitl/quickjs-singlefile-browser-release-sync'
import {
  DefaultIntrinsics,
  newQuickJSWASMModuleFromVariant,
  type QuickJSContext,
  type QuickJSHandle,
} from 'quickjs-emscripten'
import { guestSetup, inheritModule } from './guest'
import type { compileProject } from './project'

const engine = () => newQuickJSWASMModuleFromVariant(variant)
let engineReady: ReturnType<typeof engine> | undefined

export interface CpuStats {
  calls: number
  interrupts: number
  used: number
  budget: number
}
export interface FactoryContext {
  traceSite?(site: { file: string; line: number; within?: string }): void
  readonly tick: number
}

// Public methods shared by the chapter Factory and the campaign CampaignFactory.
// A host wrapper can carry additional methods and state; those stay on the host.
const mockFactory = {
  take: () => undefined, put: () => false, look: () => ({}), buy: () => false,
  tick: 0,
  dig: () => false,
  work: () => false,
  route: () => false,
  space: () => false,
  stock: () => 0,
  inspect: () => undefined,
  machines: () => [],
  recipes: () => [],
  peek: () => undefined,
  dispatch: () => false,
  build: () => undefined,
  clear: () => false,
  repair: () => false,
  orders: () => [],
  connect: () => false,
  dismantle: () => false,
  lastError: () => undefined,
}
const operations = Object.keys(mockFactory).filter((key) => key !== 'tick')

// QuickJSHandle.consume only disposes after a successful callback. A player
// exception must release temporaries before unwinding the runtime as well.
function usingHandle<T>(handle: QuickJSHandle, use: (value: QuickJSHandle) => T): T {
  try {
    return use(handle)
  } finally {
    handle.dispose()
  }
}

function hostJson(value: unknown) {
  // Inputs originate on the host (saved JSON, event records or factory views).
  let nodes = 0,
    chars = 0
  const text = JSON.stringify(value, (key, item) => {
    chars += key.length + (typeof item === 'string' ? item.length : 0)
    if (++nodes > 8192 || chars > 64_000) throw new Error('Factory JSON exceeds the transfer limit.')
    return item
  })
  if (text === undefined || text.length > 64_000) throw new Error('Expected bounded factory JSON.')
  return text
}

export async function openRuntime(
  project: ReturnType<typeof compileProject>,
  memory: object,
  budget: number,
  testing: boolean,
  chapterExports?: readonly string[],
  initialFactory?: FactoryContext,
) {
  if (!Number.isInteger(budget) || budget < 1 || budget > 4096)
    throw new Error('Budget must be an integer from 1 to 4096.')
  if (!memory || typeof memory !== 'object' || Array.isArray(memory))
    throw new Error('Memory must be a JSON object.')
  const names = chapterExports ?? []
  if (names.some(n => !['take', 'put', 'look', 'buy', 'repair'].includes(n))) throw new Error('Unknown chapter export.')
  const allowed = chapterExports ?? operations
  const initial = hostJson(memory)
  const module = await (engineReady ??= engine())
  const runtime = module.newRuntime()
  runtime.setMemoryLimit(8 * 1024 * 1024)
  runtime.setMaxStackSize(256 * 1024)
  const vm = runtime.newContext({ intrinsics: { ...DefaultIntrinsics, Date: false } })
  const owned: QuickJSHandle[] = []
  const keep = (handle: QuickJSHandle) => {
    owned.push(handle)
    return handle
  }
  let disposed = false
  function dispose() {
    if (disposed) return
    disposed = true
    for (const handle of owned.reverse()) handle.dispose()
    vm.dispose()
    runtime.dispose()
  }

  const fresh = (): CpuStats => ({ calls: 0, interrupts: 0, used: 0, budget })
  let frame = fresh(),
    meter = frame,
    lastTick: number | undefined
  let deadline = 0,
    stopped = ''
  let current: FactoryContext | undefined
  let formatError: QuickJSHandle | undefined
  const logs: string[] = []

  function begin(stats: CpuStats) {
    if (disposed) throw new Error('Program has been disposed.')
    meter = stats
    deadline = performance.now() + 25
    stopped = ''
  }
  function exceeded(checkTime: boolean) {
    if (meter.used > budget) stopped = `Operation budget (${budget}) exceeded; controller interrupted.`
    else if (checkTime && performance.now() >= deadline)
      stopped = 'Controller interrupted by 25 ms time budget.'
    return !!stopped
  }
  function unwrap(result: ReturnType<QuickJSContext['callFunction']>) {
    if (result.error) {
      current = undefined
      const error = result.error
      let detail = ''
      try {
        if (formatError && !stopped) {
          const formatted = vm.callFunction(formatError, vm.undefined, error)
          if (formatted.error) formatted.error.dispose()
          else detail = usingHandle(formatted.value, (h) => vm.getString(h))
        }
      } finally {
        error.dispose()
      }
      const [message, stack] = detail ? (JSON.parse(detail) as [string, string]) : ['', '']
      throw new Error(`${project.location(stack)} · ${stopped || message || 'Controller stopped.'}`)
    }
    if (stopped) {
      result.value.dispose()
      throw new Error(`${project.entry} · ${stopped}`)
    }
    return result.value
  }
  const invoke = (fn: QuickJSHandle, ...args: QuickJSHandle[]) =>
    unwrap(vm.callFunction(fn, vm.undefined, ...args))
  function assertSynchronous(handle: QuickJSHandle) {
    const state = vm.getPromiseState(handle)
    if (state.type === 'fulfilled' && state.notAPromise) return
    if (state.type === 'fulfilled') state.value.dispose()
    if (state.type === 'rejected') state.error.dispose()
    throw new Error('Controller handlers and player tests must be synchronous.')
  }

  try {
    const install = keep(unwrap(vm.evalCode(guestSetup, 'sandbox.js', { type: 'global' })))
    const call = keep(
      vm.newFunction('factory', (name, length, ...args) => {
        if (!current) throw new Error('Factory calls require an active handler.')
        meter.calls++
        meter.used++
        if (exceeded(false)) throw new Error(stopped)
        const key = vm.getString(name)
        const method = allowed.includes(key) && Reflect.get(current, key)
        if (typeof method !== 'function') throw new Error(`Factory method ${key} is unavailable.`)
        const params = args.slice(0, vm.getNumber(length)).map((h) => {
          const type = vm.typeof(h)
          if (type === 'number') return vm.getNumber(h)
          if (type === 'string') return JSON.parse(vm.getString(h))
        })
        if (key === 'build') {
          const [name, x, y, recipe, deposit] = params.splice(1)
          params.push({ name, x, y, recipe, deposit })
        }
        if (chapterExports && current.traceSite) current.traceSite(project.callSite(vm.getString(args[4])))
        const result = Reflect.apply(method, current, params)
        return result === undefined ? vm.undefined : vm.newString(hostJson(result))
      }),
    )
    const tick = keep(vm.newFunction('tick', () => vm.newNumber(current?.tick ?? 0)))
    const log = keep(
      vm.newFunction('log', (line) => {
        if (logs.length === 64) logs.shift()
        logs.push(JSON.parse(vm.getString(line)))
      }),
    )
    const helpers = keep(
      usingHandle(vm.newString(initial), (seed) =>
        usingHandle(vm.newString(JSON.stringify(allowed)), (names) =>
          invoke(install, seed, names, call, tick, log, testing ? vm.true : vm.false, chapterExports ? vm.true : vm.false),
        ),
      ),
    )
    const helper = (key: string) => keep(vm.getProp(helpers, key))
    const api = helper('api'),
      blueprintApi = helper('blueprintApi'),
      parse = helper('parse'),
      snapshot = helper('snapshot')
    const runTest = helper('runTest'),
      testName = helper('testName'),
      finishTests = helper('finishTests')
    const exported = helper('exported')
    formatError = helper('errorText')

    // Charge player module initialization from its first instruction. The fixed
    // bootstrap above runs before any player code can enter this context.
    runtime.setInterruptHandler(() => {
      meter.interrupts++
      meter.used++
      return exceeded(true)
    })
    begin(fresh())
    unwrap(vm.evalCode(inheritModule(names), 'inherit', { type: 'module' })).dispose()
    runtime.setModuleLoader(project.load, project.resolve)
    current = initialFactory
    const namespace = keep(
      unwrap(vm.evalCode(project.load(project.entry), project.entry, { type: 'module' })),
    )
    current = undefined
    assertSynchronous(namespace)
    runtime.removeModuleLoader()
    return {
      dispose,
      stats: () => ({ ...frame }),
      drainLogs: () => logs.splice(0),
      handler(name: string) {
        const fn = keep(usingHandle(vm.newString(name), (key) => invoke(exported, namespace, key)))
        if (vm.typeof(fn) === 'function') return fn
      },
      dispatch(fn: QuickJSHandle, ctx: FactoryContext, event?: object) {
        if (lastTick !== ctx.tick) {
          frame = fresh()
          lastTick = ctx.tick
        }
        begin(frame)
        if (frame.used > budget) throw new Error(`Operation budget (${budget}) exceeded.`)
        const surface = typeof Reflect.get(ctx, 'build') === 'function' ? blueprintApi : api
        current = ctx
        try {
          if (event === undefined) usingHandle(chapterExports ? invoke(fn) : invoke(fn, surface), assertSynchronous)
          else
            usingHandle(vm.newString(hostJson(event)), (text) =>
              usingHandle(invoke(parse, text), (data) =>
                usingHandle(invoke(fn, data, surface), assertSynchronous),
              ),
            )
        } finally {
          current = undefined
        }
      },
      exportMemory() {
        begin(fresh())
        return usingHandle(invoke(snapshot), (h) => JSON.parse(vm.getString(h)))
      },
      tests() {
        begin(fresh())
        const count = usingHandle(invoke(finishTests), (h) => vm.getNumber(h))
        return Array.from({ length: count }, (_, i) =>
          usingHandle(vm.newNumber(i), (index) => {
            begin(fresh())
            const name = usingHandle(invoke(testName, index), (h) => JSON.parse(vm.getString(h)) as string)
            current = mockFactory
            try {
              usingHandle(invoke(runTest, index), assertSynchronous)
              return { name, passed: true }
            } catch (error) {
              return { name, passed: false, error: error instanceof Error ? error.message : 'Test failed.' }
            } finally {
              current = undefined
            }
          }),
        )
      },
    }
  } catch (error) {
    dispose()
    throw error
  }
}
