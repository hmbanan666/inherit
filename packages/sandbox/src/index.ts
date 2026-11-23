import { compileProject, projectOptions, type JsonObject, type ProjectOptions } from './project'
import { openRuntime, type CpuStats, type FactoryContext } from './runtime'

export type { JsonObject, JsonValue, ProjectOptions } from './project'
export type { CpuStats, FactoryContext } from './runtime'

export interface Program {
  onTick<C extends FactoryContext>(ctx: C): void
  call<C extends FactoryContext>(name: string, ctx: C): boolean
  emit<C extends FactoryContext>(event: string, ctx: C): void
  prime(used: number, tick: number): void
  exportMemory(): JsonObject
  drainLogs(): string[]
  takeLogs(): { text: string; level: 'log' | 'info' | 'warn' | 'error'; file?: string; line?: number }[]
  readonly stats: CpuStats
  dispose(): void
}
export async function createProgram(source: string | ProjectOptions, initialFactory?: FactoryContext): Promise<Program> {
  const options = projectOptions(source)
  const project = compileProject(options)
  const session = await openRuntime(project, options.memory ?? {}, options.budget ?? 128, options, initialFactory)
  try {
    const tick = session.handler('onTick')
    if (!tick && options.clock !== 'optional') throw new Error(`${project.entry} · Export a function named onTick.`)
    return {
      onTick: (ctx) => { if (tick) session.dispatch(tick, ctx) },
      call: (name, ctx) => {
        const fn = session.handler(name)
        if (!fn) return false
        session.dispatch(fn, ctx)
        return true
      },
      emit: (event, ctx) => session.emit(event, ctx),
      prime: (used, tickNo) => session.prime(used, tickNo),
      exportMemory: session.exportMemory,
      drainLogs: () => session.takeLogs().map(entry => entry.text),
      takeLogs: session.takeLogs,
      get stats() {
        return session.stats()
      },
      dispose: session.dispose,
    }
  } catch (error) {
    session.dispose()
    throw error
  }
}

/** Evaluate the entry module once on the floor without requiring a clock handler. */
export async function runOnce(options: ProjectOptions, api: FactoryContext) {
  const project = compileProject(options)
  const session = await openRuntime(project, {}, options.budget ?? 1024, options, api)
  try {
    return session.drainLogs()
  } finally {
    session.dispose()
  }
}
