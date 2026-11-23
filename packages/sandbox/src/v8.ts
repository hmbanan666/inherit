import { createWorld, mining, miningModule, operationName, runTicks, type Site, type TickContext } from '@inherit/sim/v8'
import { createProgram, type Program } from './index'
import { PlayerRunError } from './plain-error'

export async function runSession(site: Site, files: Record<string, string>, ticks: number) {
  const world = createWorld(site)
  const bricks = mining(site)
  const operations = bricks.flatMap(b => typeof b.handler === 'function'
    ? [{ key: operationName(b), handler: b.handler, cost: b.cost }] : [])
  const names = bricks.map(b => b.name)
  let program: Program
  try {
    program = await createProgram({
      files, budget: site.cpuLimit, inheritSource: miningModule(bricks),
      operations: operations.map(op => op.key),
      costs: Object.fromEntries(operations.map(op => [op.key, op.cost])),
    })
  } catch (error) { throw new PlayerRunError(error, files, names) }
  const ctx: TickContext = { world, cpuUsed: () => program.stats.used }
  const host = {
    get tick() { return world.tick },
    ...Object.fromEntries(operations.map(op => [op.key, (...args: unknown[]) => op.handler(ctx, ...args)])),
  }
  try {
    runTicks(world, ticks, () => {
      try { program.onTick(host) }
      catch (error) {
        const plain = new PlayerRunError(error, files, names)
        const { file, line } = plain.diagnostic
        return { used: program.stats.used, message: { file, line, text: plain.message } }
      }
      return { used: program.stats.used }
    })
    world.memory = program.exportMemory()
    return world
  } finally { program.dispose() }
}
