import { acceptQuest, actManual, buyUpgrade, completeQuest, createWorld, dueEvents, dumpCargo, factoryBricks, factoryModule, grantLegacy, migrateWorld, operationName, pressManual, pushConsole, queueRun, runTicks, settleTriggers, triggerUnlocked, type ManualAction, type Site, type TickContext, type World } from '@inherit/sim/v8'
import { createProgram, type JsonObject, type Program } from './index'
import { PlayerRunError } from './plain-error'

export async function createSession(site: Site, files = site.files, saved?: World, options?: { fresh?: boolean }) {
  const world = saved ? migrateWorld(structuredClone(saved)) : createWorld(site)
  if (!saved && !options?.fresh) grantLegacy(world)
  const bricks = factoryBricks(site)
  const operations = bricks.flatMap(b => typeof b.handler === 'function'
    ? [{ key: operationName(b), handler: b.handler, cost: b.cost }] : [])
  const names = bricks.map(b => b.name)
  let program: Program
  async function deploy(nextFiles: Record<string, string>) {
    let next: Program
    try {
      next = await createProgram({
        files: nextFiles, memory: world.memory as JsonObject, budget: site.cpuLimit, inheritSource: factoryModule(bricks),
        operations: [...operations.map(op => op.key), 'triggers_allow'],
        costs: { ...Object.fromEntries(operations.map(op => [op.key, op.cost])), triggers_allow: 0 },
        clock: 'optional',
      })
    } catch (error) { throw new PlayerRunError(error, nextFiles, names) }
    program?.dispose()
    program = next
    files = nextFiles
  }
  await deploy(files)
  const ctx: TickContext = { world, cpuUsed: () => program.stats.used }
  const host = {
    get tick() { return world.tick },
    get cpuLimit() { return world.cpu.limit },
    ...Object.fromEntries(operations.map(op => [op.key, (...args: unknown[]) => op.handler(ctx, ...args)])),
    triggers_allow() {
      if (!triggerUnlocked(world, 'events')) throw new Error('on() is locked. A quest unlocks it.')
    },
  }
  function play() {
    const manual = actManual(world, site)
    let message: { file: string; line: number; text: string } | undefined
    const queued = world.pendingRuns.splice(0)
    const guest = queued.length > 0 || triggerUnlocked(world, 'events') || triggerUnlocked(world, 'tick')
    try {
      try {
        if (guest) program.prime(manual, world.tick)
        for (const job of queued) {
          world.manualRuns++
          const ran = program.call(job.name, host)
          pushConsole(world, {
            tick: world.tick,
            text: ran ? `${job.name} ok` : `No function ${job.name}.`,
            level: ran ? 'log' : 'error',
            file: job.file,
            line: job.line,
          })
        }
        if (triggerUnlocked(world, 'tick')) program.onTick(host)
        for (const event of dueEvents(world)) program.emit(event, host)
      }
      finally {
        world.memory = program.exportMemory()
        settleTriggers(world, site)
      }
    }
    catch (error) {
      const plain = new PlayerRunError(error, files, names)
      const { file, line } = plain.diagnostic
      message = { file, line, text: plain.message }
      pushConsole(world, { tick: world.tick, text: plain.message, level: 'error', file, line })
    }
    finally {
      for (const entry of program.takeLogs()) {
        pushConsole(world, { tick: world.tick, text: entry.text, level: entry.level, file: entry.file, line: entry.line })
      }
    }
    return { used: Math.max(manual, program.stats.used), message }
  }
  function step(ticks: number) {
    runTicks(world, site, ticks, play)
  }
  return {
    world, deploy, step, dispose: () => program.dispose(),
    dump: (name: string) => dumpCargo(world, name),
    accept: (id?: string) => acceptQuest(world, site, id),
    complete: () => completeQuest(world, site),
    buy: (id: string) => buyUpgrade(world, id),
    press: (action: ManualAction, drone?: string) => pressManual(world, action, drone),
    queue: (name: string, file = 'main.ts', line = 1) => queueRun(world, name, file, line),
  }
}

export async function runSession(site: Site, files: Record<string, string>, ticks: number) {
  const session = await createSession(site, files)
  try {
    session.step(ticks)
    return session.world
  } finally { session.dispose() }
}
