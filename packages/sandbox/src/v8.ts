import { acceptQuest, actManual, buyUpgrade, completeQuest, createWorld, dueEvents, dumpCargo, factoryBricks, factoryModule, grantLegacy, migrateWorld, operationName, pressManual, pushConsole, queueRun, runTicks, setLoop, settleTriggers, stepDroneTasks, stopScript, triggerUnlocked, type ManualAction, type Site, type TickContext, type World } from '@inherit/sim/v8'
import { createProgram, type JsonObject, type Program } from './index'
import { PlayerRunError } from './plain-error'

export async function createSession(site: Site, files = site.files, saved?: World, options?: { fresh?: boolean }) {
  const world = saved ? migrateWorld(structuredClone(saved)) : createWorld(site)
  if (!saved && !options?.fresh) grantLegacy(world)
  const bricks = factoryBricks(site)
  const operations = bricks.flatMap(b => typeof b.handler === 'function'
    ? [{ key: operationName(b), handler: b.handler, cost: b.cost }] : [])
  const names = bricks.map(b => b.name)
  let program: Program | undefined
  const ctx: TickContext = { world, cpuUsed: () => program?.stats.used ?? 0 }
  const host = {
    get tick() { return world.tick },
    get cpuLimit() { return world.cpu.limit },
    ...Object.fromEntries(operations.map(op => [op.key, (...args: unknown[]) => op.handler(ctx, ...args)])),
    triggers_allow() {
      if (!triggerUnlocked(world, 'events')) throw new Error('on() is locked. A quest unlocks it.')
    },
  }
  async function deploy(nextFiles: Record<string, string>) {
    let next: Program
    try {
      next = await createProgram({
        files: nextFiles, memory: world.memory as JsonObject, budget: site.cpuLimit, inheritSource: factoryModule(bricks),
        operations: [...operations.map(op => op.key), 'triggers_allow'],
        costs: { ...Object.fromEntries(operations.map(op => [op.key, op.cost])), triggers_allow: 0 },
        clock: 'optional',
      }, host)
    } catch (error) { throw new PlayerRunError(error, nextFiles, names) }
    const replacing = program !== undefined
    program?.dispose()
    program = next
    files = nextFiles
    if (world.script) world.script.phase = 'start'
    if (replacing) {
      for (const drone of world.drones) {
        drone.task = null
        drone.route = undefined
      }
    }
  }
  await deploy(files)
  function noteRun(name: string, file: string, line: number, text: string, level: 'log' | 'error') {
    pushConsole(world, { tick: world.tick, text, level, file, line })
  }
  function active() {
    if (!program) throw new Error('Deploy the works before running them.')
    return program
  }
  function drive() {
    const code = active()
    const script = world.script
    if (script) {
      let result: ReturnType<typeof code.step>
      try { result = code.step(script.name, host) }
      catch (error) {
        world.script = null
        world.pace = { mode: 'idle', name: '' }
        throw error
      }
      if (result === 'missing') {
        noteRun(script.name, script.file, script.line, `No function ${script.name}.`, 'error')
        world.script = null
        world.pace = { mode: 'idle', name: '' }
        return
      }
      noteRun(script.name, script.file, script.line, `${script.name} ok`, 'log')
      world.script = null
      world.pace = { mode: 'run', name: script.name }
      return
    }
    if (!world.holding && world.loop && triggerUnlocked(world, 'tick')) {
      let result: ReturnType<typeof code.step>
      try { result = code.step('onTick', host) }
      catch (error) {
        world.pace = { mode: 'idle', name: '' }
        throw error
      }
      if (result === 'missing') {
        world.pace = { mode: 'idle', name: '' }
        return
      }
      world.pace = { mode: 'tick', name: 'onTick' }
      return
    }
    world.pace = { mode: 'idle', name: '' }
  }
  function play() {
    const manual = actManual(world, site)
    const code = active()
    let spent = manual
    let message: { file: string; line: number; text: string } | undefined
    const guest = !!world.script || (!world.holding && ((world.loop && triggerUnlocked(world, 'tick')) || triggerUnlocked(world, 'events')))
    try {
      try {
        if (guest) code.prime(manual, world.tick)
        drive()
        spent = stepDroneTasks(world, site, guest ? code.stats.used : manual)
        if (!world.holding && triggerUnlocked(world, 'events')) {
          for (const event of dueEvents(world)) code.emit(event, host)
        }
      }
      finally {
        world.memory = code.exportMemory()
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
      for (const entry of code.takeLogs()) {
        pushConsole(world, { tick: world.tick, text: entry.text, level: entry.level, file: entry.file, line: entry.line })
      }
    }
    return { used: guest ? Math.max(spent, code.stats.used) : spent, message }
  }
  function step(ticks: number) {
    runTicks(world, site, ticks, play)
  }
  return {
    world, deploy, step, dispose: () => program?.dispose(),
    dump: (name: string) => dumpCargo(world, name),
    accept: (id?: string) => acceptQuest(world, site, id),
    complete: () => completeQuest(world, site),
    buy: (id: string) => buyUpgrade(world, id),
    press: (action: ManualAction, drone?: string, vein?: string) => pressManual(world, action, drone, vein),
    queue: (name: string, file = 'main.ts', line = 1) => {
      queueRun(world, name, file, line)
    },
    stop: () => {
      stopScript(world)
    },
    setLoop: (on: boolean, name?: string, file?: string, line?: number) => {
      setLoop(world, on, name, file, line)
    },
  }
}

export async function runSession(site: Site, files: Record<string, string>, ticks: number) {
  const session = await createSession(site, files)
  try {
    session.step(ticks)
    return session.world
  } finally { session.dispose() }
}
