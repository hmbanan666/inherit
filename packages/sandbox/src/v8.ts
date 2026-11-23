import { createWorld, factoryBricks, factoryModule, operationName, runTicks, type Site, type World, type TickContext } from '@inherit/sim/v8'
import { createProgram, type JsonObject, type Program } from './index'
import { PlayerRunError } from './plain-error'

export async function createSession(site: Site, files = site.files, saved?: World) {
  const world = saved ? structuredClone(saved) : createWorld(site)
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
    ...Object.fromEntries(operations.map(op => [op.key, (...args: unknown[]) => op.handler(ctx, ...args)])),
  }
  function step(ticks: number) {
    runTicks(world, site, ticks, () => {
      try {
        try { program.onTick(host) }
        finally { world.memory = program.exportMemory() }
      }
      catch (error) {
        const plain = new PlayerRunError(error, files, names)
        const { file, line } = plain.diagnostic
        return { used: program.stats.used, message: { file, line, text: plain.message } }
      }
      return { used: program.stats.used }
    })
  }
  return { world, deploy, step, dispose: () => program.dispose() }
}

export async function runSession(site: Site, files: Record<string, string>, ticks: number) {
  const session = await createSession(site, files)
  try {
    session.step(ticks)
    return session.world
  } finally { session.dispose() }
}
