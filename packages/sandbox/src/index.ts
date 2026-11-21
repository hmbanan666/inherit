import { compileProject, projectOptions, type JsonObject, type ProjectOptions } from './project'
import { openRuntime, type CpuStats, type FactoryContext } from './runtime'

export type { JsonObject, JsonValue, ProjectOptions } from './project'
export type { CpuStats, FactoryContext } from './runtime'

const events = ['onItemArrived', 'onMachineIdle', 'onTruckReturned'] as const
export type EventName = (typeof events)[number]
export interface Program {
  onTick<C extends FactoryContext>(ctx: C): void
  deliverEvent<C extends FactoryContext>(name: EventName, event: object, ctx: C): void
  exportMemory(): JsonObject
  drainLogs(): string[]
  readonly stats: CpuStats
  dispose(): void
}
export interface PlayerTestResult {
  name: string
  passed: boolean
  error?: string
}

export { sandboxDeclarations } from './declarations'

const chapterExports = ['take', 'put', 'look', 'buy', 'repair'] as const

export async function createProgram(source: string | ProjectOptions, initialFactory?: FactoryContext): Promise<Program> {
  const options = projectOptions(source)
  return loadProgram(options, options.chapterExports ?? chapterExports, initialFactory)
}

/** Historical levels run against the original engine's callback surface. */
export function createLegacyProgram(source: string | ProjectOptions) {
  return loadProgram(projectOptions(source))
}

async function loadProgram(options: ProjectOptions, exports?: readonly string[], initialFactory?: FactoryContext): Promise<Program> {
  const project = compileProject(options, false)
  const session = await openRuntime(project, options.memory ?? {}, options.budget ?? 128, false, exports, initialFactory)
  try {
    const tick = session.handler('onTick')
    if (!tick) throw new Error(`${project.entry} · Export a function named onTick.`)
    const handlers = new Map(
      events
        .filter((name) => options.unlockedEvents?.includes(name))
        .map((name) => [name, session.handler(name)]),
    )
    return {
      onTick: (ctx) => session.dispatch(tick, ctx),
      deliverEvent(name, event, ctx) {
        const fn = handlers.get(name)
        if (fn) session.dispatch(fn, ctx, event)
      },
      exportMemory: session.exportMemory,
      drainLogs: session.drainLogs,
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

export async function runProjectTests(source: string | ProjectOptions): Promise<PlayerTestResult[]> {
  const options = projectOptions(source)
  if (!Object.hasOwn(options.files, 'tests.ts')) return []
  try {
    const project = compileProject(options, true)
    const session = await openRuntime(project, options.memory ?? {}, options.budget ?? 128, true)
    try {
      return session.tests()
    } finally {
      session.dispose()
    }
  } catch (error) {
    return [
      {
        name: 'tests.ts',
        passed: false,
        error: error instanceof Error ? error.message : 'Test setup failed.',
      },
    ]
  }
}

/** Evaluate the entry module once on the floor without requiring a clock handler. */
export async function runOnce(options: ProjectOptions, api: FactoryContext, runClock = false) {
  const project = compileProject(options, false)
  const session = await openRuntime(project, {}, options.budget ?? 1024, false, options.chapterExports ?? chapterExports, api)
  try {
    const tick = runClock && session.handler('onTick')
    if (tick) session.dispatch(tick, api)
    return session.drainLogs()
  } finally {
    session.dispose()
  }
}
export { startChapter } from './chapter'
