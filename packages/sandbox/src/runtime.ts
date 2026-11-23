import variant from '@jitl/quickjs-singlefile-browser-release-sync'
import {
  DefaultIntrinsics,
  newQuickJSWASMModuleFromVariant,
  type QuickJSContext,
  type QuickJSHandle,
} from 'quickjs-emscripten'
import { guestSetup, inheritModule } from './guest'
import type { compileProject, ProjectOptions } from './project'

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
  options: ProjectOptions,
  initialFactory?: FactoryContext,
) {
  if (!Number.isInteger(budget) || budget < 1 || budget > 4096)
    throw new Error('Budget must be an integer from 1 to 4096.')
  if (!memory || typeof memory !== 'object' || Array.isArray(memory))
    throw new Error('Memory must be a JSON object.')
  const { operations: names = [], inputs = {}, exposure = 'module', costs } = options
  if (costs && names.some(name => !Number.isSafeInteger(costs[name]) || costs[name] < 0))
    throw new Error('Every operation needs a nonnegative integer CPU cost.')
  if (names.some(n => !/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(n) || n in Object.prototype)) throw new Error('Invalid player function name.')
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
  let stopLocation = project.entry
  let current: FactoryContext | undefined
  let formatError: QuickJSHandle | undefined
  const logs: string[] = []

  function begin(stats: CpuStats) {
    if (disposed) throw new Error('Program has been disposed.')
    meter = stats
    deadline = performance.now() + 25
    stopped = ''
    stopLocation = project.entry
  }
  function exceeded(checkTime: boolean) {
    if (stopped) return true
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
      throw new Error(`${stopped ? stopLocation : project.location(stack)} · ${stopped || message || 'Controller stopped.'}`)
    }
    if (stopped) {
      result.value.dispose()
      throw new Error(`${stopLocation} · ${stopped}`)
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
        const key = vm.getString(name)
        const site = project.callSite(vm.getString(args[4]))
        const next = meter.used + (costs ? costs[key] : 1)
        meter.calls++
        meter.used = costs ? Math.min(next, budget) : next
        function stopAtLimit() {
          stopped = `CPU limit (${budget}) hit.`
          stopLocation = `${site.file}:${site.line}`
          return vm.null
        }
        if (costs && next > budget) return stopAtLimit()
        if (exceeded(false)) throw new Error(stopped)
        const method = names.includes(key) && Reflect.get(current, key)
        if (typeof method !== 'function') throw new Error(`Factory method ${key} is unavailable.`)
        const params = args.slice(0, vm.getNumber(length)).map((h) => {
          const type = vm.typeof(h)
          if (type === 'number') return vm.getNumber(h)
          if (type === 'string') return JSON.parse(vm.getString(h))
        })
        current.traceSite?.(site)
        const result = Reflect.apply(method, current, params)
        if (costs && next === budget) return stopAtLimit()
        return result === undefined ? vm.undefined : vm.newString(hostJson(result))
      }),
    )
    const log = keep(
      vm.newFunction('log', (line) => {
        if (logs.length === 64) logs.shift()
        logs.push(JSON.parse(vm.getString(line)))
      }),
    )
    for (const name of Object.keys(inputs)) {
      if (names.includes(name) || !/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(name))
        throw new Error('Invalid scene input: ' + name)
    }
    const bindings = keep(vm.newString(hostJson(inputs)))
    const helpers = keep(
      usingHandle(vm.newString(initial), (seed) =>
        usingHandle(vm.newString(JSON.stringify(names)), (names) =>
          invoke(install, seed, names, call, log, exposure === 'globals' ? vm.true : vm.false, bindings),
        ),
      ),
    )
    const helper = (key: string) => keep(vm.getProp(helpers, key))
    const snapshot = helper('snapshot')
    const exported = helper('exported')
    formatError = helper('errorText')

    // Charge player module initialization from its first instruction. The fixed
    // bootstrap above runs before any player code can enter this context.
    runtime.setInterruptHandler(() => {
      meter.interrupts++
      if (!costs) meter.used++
      return exceeded(true)
    })
    begin(fresh())
    unwrap(vm.evalCode(inheritModule(names), 'inherit', { type: 'module' })).dispose()
    runtime.setModuleLoader(project.load, (from, request) => project.resolve(from, request))
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
      dispatch(fn: QuickJSHandle, ctx: FactoryContext) {
        if (lastTick !== ctx.tick) {
          frame = fresh()
          lastTick = ctx.tick
        }
        begin(frame)
        if (frame.used > budget) throw new Error(`Operation budget (${budget}) exceeded.`)
        current = ctx
        try {
          usingHandle(invoke(fn), assertSynchronous)
        } finally {
          current = undefined
        }
      },
      exportMemory() {
        begin(fresh())
        return usingHandle(invoke(snapshot), (h) => JSON.parse(vm.getString(h)))
      },
    }
  } catch (error) {
    dispose()
    throw error
  }
}
