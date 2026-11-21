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

export async function createProgram(source: string | ProjectOptions): Promise<Program> {
  const options = projectOptions(source)
  return loadProgram(options, options.chapterExports ?? ['take'])
}

/** Historical levels run against the original engine's callback surface. */
export function createLegacyProgram(source: string | ProjectOptions) {
  return loadProgram(projectOptions(source))
}

async function loadProgram(options: ProjectOptions, exports?: readonly string[]): Promise<Program> {
  const project = compileProject(options, false)
  const session = await openRuntime(project, options.memory ?? {}, options.budget ?? 128, false, exports)
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

/** Load only the active verb and its imports. Each case gets fresh module state. */
export async function runVerb(options: ProjectOptions, name: string, api: FactoryContext, args: readonly string[]) {
  const project = compileProject(options, false)
  const session = await openRuntime(project, {}, 1024, false, options.chapterExports ?? ['take'])
  try {
    const verb = session.handler(name)
    if (!verb) throw new Error(project.entry + ' · Export a function named ' + name + '.')
    return session.callVerb(verb, api, args)
  } finally {
    session.dispose()
  }
}
