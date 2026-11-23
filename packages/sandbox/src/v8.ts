import { acceptQuest, buyUpgrade, completeQuest, createWorld, dumpCargo, factoryBricks, factoryModule, migrateWorld, operationName, pushConsole, runTicks, type Site, type World, type TickContext } from '@inherit/sim/v8'
import { createProgram, type JsonObject, type Program } from './index'
import { PlayerRunError } from './plain-error'

export async function createSession(site: Site, files = site.files, saved?: World) {
  const world = migrateWorld(saved ? structuredClone(saved) : createWorld(site))
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
        operations: operations.map(op => op.key),
        costs: Object.fromEntries(operations.map(op => [op.key, op.cost])),
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
  }
  function step(ticks: number) {
    runTicks(world, site, ticks, () => {
      let message: { file: string; line: number; text: string } | undefined
      try {
        try { program.onTick(host) }
        finally { world.memory = program.exportMemory() }
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
      return { used: program.stats.used, message }
    })
  }
  return {
    world, deploy, step, dispose: () => program.dispose(),
    dump: (name: string) => dumpCargo(world, name),
    accept: (id?: string) => acceptQuest(world, site, id),
    complete: () => completeQuest(world, site),
    buy: (id: string) => buyUpgrade(world, id),
  }
}

export async function runSession(site: Site, files: Record<string, string>, ticks: number) {
  const session = await createSession(site, files)
  try {
    session.step(ticks)
    return session.world
  } finally { session.dispose() }
}
