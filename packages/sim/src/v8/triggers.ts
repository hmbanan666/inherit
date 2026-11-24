import { chargeCpu } from './core/cpu'
import { onDoc, onExample, onSignature } from './core/bricks'
import { pushConsole, type Cell, type Site, type World } from './core/world'
import { dumpCargo, mining } from './modules/mining'
import { takeFromDepot } from './modules/orders'
import { outputCap, smelting } from './modules/smelting'
import { functionUnlocked, triggerUnlocked, unlockError } from './quests'

export const worksEvents = ['furnace.full', 'furnace.ready', 'drone.idle', 'drone.full'] as const
export type WorksEvent = (typeof worksEvents)[number]

export const onApi = {
  name: 'on',
  signature: onSignature,
  doc: onDoc,
  example: onExample,
  cost: 0,
}

/** Run, Loop, and on(). The book and the editor types share these lines. */
export const triggerDocs = [
  {
    id: 'run' as const,
    name: 'Run',
    signature: 'Run functionName',
    doc: 'Play an exported function until it returns. yield, or return false, waits one tick.',
    example: `// Run plays this until it returns. yield waits one tick.\nexport function* once() {\n  // One step of the drone, then the next tick.\n  yield\n}`,
  },
  {
    id: 'tick' as const,
    name: 'Loop',
    signature: 'export function onTick(): void',
    doc: 'Run the function again each time it finishes, until Stop. The Loop switch does this too.',
    example: `// Loop calls onTick again after it returns, until Stop.\nexport function onTick() {\n  // One step. The works call this again when it finishes.\n}`,
  },
  {
    id: 'events' as const,
    name: 'on',
    signature: onSignature,
    doc: onDoc,
    example: onExample,
  },
]

export type ManualAction = 'smelt' | 'alloy' | 'collect' | 'clear' | 'mine' | 'unload' | 'dump'

export function emptyInbox(): World['inbox'] {
  return { smelt: false, alloy: false, collect: false, clear: false, drones: {} }
}

export function snapshotSignals(world: World): World['signals'] {
  return {
    output: world.furnace.output,
    ingotsMade: world.ingotsMade,
    steelMade: world.steelMade,
    drones: Object.fromEntries(world.drones.map(drone => [drone.name, {
      cargo: drone.cargo,
      capacity: drone.capacity,
      idle: drone.cargo === 0 && !drone.route?.length && !world.jobs[drone.name],
    }])),
  }
}

/** A save from before triggers keeps every trigger. Counts and credits stay. */
export function grantLegacy(world: World) {
  world.automation = { run: true, events: true, tick: true, pinned: true }
  world.loop = true
  world.holding = false
}

export function ensureTriggers(world: World) {
  world.depot.ingots ??= 0
  world.depot.steel ??= 0
  world.manualRuns ??= 0
  world.pendingRuns ??= []
  world.jobs ??= {}
  world.inbox ??= emptyInbox()
  world.collectAt ??= null
  world.collectSpan ??= 0
  world.loop ??= false
  world.holding ??= false
  world.script ??= null
  world.pace ??= { mode: 'idle', name: '' }
  if (!world.automation) world.automation = { run: true, events: true, tick: true, pinned: true }
  if (!world.signals) world.signals = snapshotSignals(world)
  return world
}

export function pressManual(world: World, action: ManualAction, drone = 'drone-1') {
  if (action === 'mine' || action === 'unload' || action === 'dump') world.inbox.drones[drone] = action
  else world.inbox[action] = true
}

export function queueRun(world: World, name: string, file: string, line: number) {
  if (!triggerUnlocked(world, 'run')) throw new Error('Run is locked. A quest unlocks it.')
  world.holding = false
  world.script = { name, file, line, loop: world.loop, phase: 'start' }
  world.pace = { mode: 'run', name }
  world.manualRuns = (world.manualRuns ?? 0) + 1
}

export function stopScript(world: World) {
  world.holding = true
  world.loop = false
  world.script = null
  world.pace = { mode: 'idle', name: '' }
}

/** Loop restarts the function when it finishes. Passing a name starts that function. */
export function setLoop(world: World, on: boolean, name?: string, file = 'main.ts', line = 1) {
  if (!triggerUnlocked(world, 'tick')) throw new Error('Loop is locked. A quest unlocks it.')
  if (!on) {
    world.loop = false
    if (world.script) world.script.loop = false
    return
  }
  world.holding = false
  world.loop = true
  if (world.script) {
    world.script.loop = true
    return
  }
  if (!name) return
  world.script = { name, file, line, loop: true, phase: 'start' }
  world.pace = { mode: 'run', name }
  world.manualRuns = (world.manualRuns ?? 0) + 1
}

function distance(a: Cell, b: Cell) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function note(world: World, text: string, level: 'log' | 'error' = 'error') {
  pushConsole(world, { tick: world.tick, text, level })
}

type Act = (ctx: { world: World; cpuUsed: () => number }, ...args: unknown[]) => unknown

function handler(site: Site, name: string): Act | undefined {
  const found = [...mining(site), ...smelting(site)].find(brick => brick.name === name)
  return typeof found?.handler === 'function' ? found.handler : undefined
}

function stepToward(drone: World['drones'][number], target: Cell) {
  const dx = Math.sign(target.x - drone.pos.x)
  const dy = dx === 0 ? Math.sign(target.y - drone.pos.y) : 0
  drone.pos = { x: drone.pos.x + dx, y: drone.pos.y + dy }
  drone.route = undefined
}

/** Buttons and queued work for this tick. Returns the CPU those actions spent. */
export function actManual(world: World, site: Site) {
  let used = 0
  const limit = world.cpu.limit
  const spend = (cost: number) => {
    const charge = chargeCpu(used, limit, cost)
    used = charge.used
    if (!charge.allowed) note(world, `CPU limit (${limit}) hit.`)
    return charge.allowed
  }
  const ctx = { world, cpuUsed: () => used }
  finishCollect(world)
  const inbox = world.inbox
  world.inbox = emptyInbox()
  if (inbox.smelt) trySmelt(world, site, ctx, spend)
  if (inbox.alloy) tryAlloy(world, site, ctx, spend)
  if (inbox.collect) tryCollect(world, site)
  if (inbox.clear) tryClear(world, site, ctx, spend)
  for (const [name, action] of Object.entries(inbox.drones)) {
    if (action === 'dump') tryDump(world, name, spend)
    else if (action === 'mine') beginMine(world, name)
    else beginUnload(world, name)
  }
  for (const name of Object.keys(world.jobs)) stepJob(world, site, name, ctx, spend)
  return used
}

function finishCollect(world: World) {
  if (world.collectAt === null || world.tick < world.collectAt) return
  world.depot.ingots += world.furnace.output
  world.depot.steel += world.furnace.steel
  world.furnace.output = 0
  world.furnace.steel = 0
  world.collectAt = null
  world.collectSpan = 0
}

function trySmelt(world: World, site: Site, ctx: { world: World; cpuUsed: () => number }, spend: (cost: number) => boolean) {
  const furnace = world.furnace
  if (furnace.readyAt !== null) return note(world, 'The furnace is smelting.')
  if (furnace.input < site.recipe.ore) return note(world, `The furnace needs ${site.recipe.ore} ore.`)
  if (!spend(site.costs.action)) return
  world.manualRuns++
  try { handler(site, 'furnace.smelt')?.(ctx) }
  catch (error) { note(world, error instanceof Error ? error.message : String(error)) }
}

function tryAlloy(world: World, site: Site, ctx: { world: World; cpuUsed: () => number }, spend: (cost: number) => boolean) {
  if (!functionUnlocked(world, 'furnace.alloy')) return note(world, unlockError('furnace.alloy'))
  const furnace = world.furnace
  if (furnace.readyAt !== null) return note(world, 'The furnace is smelting.')
  if (furnace.input < site.recipe.ore || furnace.coal < 1) return note(world, 'Alloy needs 2 ore and 1 coal.')
  if (!spend(site.costs.action)) return
  world.manualRuns++
  try { handler(site, 'furnace.alloy')?.(ctx) }
  catch (error) { note(world, error instanceof Error ? error.message : String(error)) }
}

function tryCollect(world: World, site: Site) {
  if (world.collectAt !== null) return note(world, 'The furnace is already collecting.')
  if (world.furnace.output <= 0 && world.furnace.steel <= 0) return note(world, 'The furnace has no ingots or steel.')
  const span = world.batchTicks ?? site.recipe.ticks
  world.collectAt = world.tick + span
  world.collectSpan = span
  world.manualRuns++
}

function tryClear(world: World, site: Site, ctx: { world: World; cpuUsed: () => number }, spend: (cost: number) => boolean) {
  if (world.furnace.input <= 0 && world.furnace.coal <= 0) return note(world, 'The hopper is empty.')
  if (!spend(site.costs.action)) return
  world.manualRuns++
  handler(site, 'furnace.clear')?.(ctx)
}

function tryDump(world: World, name: string, spend: (cost: number) => boolean) {
  const drone = world.drones.find(item => item.name === name)
  if (!drone) return note(world, `No drone named ${name}.`)
  if (!drone.cargo) return note(world, `${name} carries nothing.`)
  if (!spend(1)) return
  world.manualRuns++
  try { dumpCargo(world, name) }
  catch (error) { note(world, error instanceof Error ? error.message : String(error)) }
}

function beginMine(world: World, name: string) {
  const drone = world.drones.find(item => item.name === name)
  if (!drone) return note(world, `No drone named ${name}.`)
  if (world.jobs[name]) return note(world, `${name} is already working.`)
  const veins = world.veins.filter(vein => !vein.hidden && vein.kind === 'ore')
  veins.sort((a, b) => distance(drone.pos, a.pos) - distance(drone.pos, b.pos))
  const vein = veins[0]
  if (!vein) return note(world, `${name} has no vein to mine.`)
  const steps = Math.max(0, distance(drone.pos, vein.pos) - 1)
  world.jobs[name] = { kind: 'mine', vein: vein.name, left: steps, total: Math.max(steps, 1) }
  world.manualRuns++
}

function beginUnload(world: World, name: string) {
  const drone = world.drones.find(item => item.name === name)
  if (!drone) return note(world, `No drone named ${name}.`)
  if (!drone.cargo) return note(world, `${name} carries nothing.`)
  if (world.jobs[name]) return note(world, `${name} is already working.`)
  const station = drone.carrying === 'ingot' || drone.carrying === 'steel' ? world.depot.pos : world.furnace.pos
  const steps = Math.max(0, distance(drone.pos, station) - 1)
  world.jobs[name] = { kind: 'unload', left: steps, total: Math.max(steps, 1) }
  world.manualRuns++
}

function stepJob(world: World, site: Site, name: string, ctx: { world: World; cpuUsed: () => number }, spend: (cost: number) => boolean) {
  const job = world.jobs[name]
  const drone = world.drones.find(item => item.name === name)
  if (!job || !drone) {
    delete world.jobs[name]
    return
  }
  if (job.kind === 'mine') stepMine(world, site, drone, job, ctx, spend)
  else stepUnload(world, site, drone, job, ctx, spend)
}

function stepMine(world: World, site: Site, drone: World['drones'][number], job: World['jobs'][string], ctx: { world: World; cpuUsed: () => number }, spend: (cost: number) => boolean) {
  const vein = world.veins.find(item => item.name === job.vein)
  if (!vein) {
    delete world.jobs[drone.name]
    return note(world, `${drone.name} has no vein to mine.`)
  }
  if (distance(drone.pos, vein.pos) > 1) {
    if (!spend(site.costs.action)) return
    stepToward(drone, vein.pos)
    job.left = Math.max(0, distance(drone.pos, vein.pos) - 1)
    return
  }
  if (!spend(site.costs.action)) return
  const before = drone.cargo
  try { handler(site, 'drone.mine')?.(ctx, drone.name, vein.name) }
  catch (error) {
    delete world.jobs[drone.name]
    return note(world, error instanceof Error ? error.message : String(error))
  }
  if (drone.cargo > before) delete world.jobs[drone.name]
  else job.left = Math.max(0, vein.ticksPerUnit - (drone.dig?.ticks ?? 0))
}

function stepUnload(world: World, site: Site, drone: World['drones'][number], job: World['jobs'][string], ctx: { world: World; cpuUsed: () => number }, spend: (cost: number) => boolean) {
  const station = drone.carrying === 'ingot' || drone.carrying === 'steel' ? world.depot.pos : world.furnace.pos
  if (distance(drone.pos, station) > 1) {
    if (!spend(site.costs.action)) return
    stepToward(drone, station)
    job.left = Math.max(0, distance(drone.pos, station) - 1)
    return
  }
  if (!spend(site.costs.action)) return
  try { handler(site, 'drone.unload')?.(ctx, drone.name, station) }
  catch (error) { note(world, error instanceof Error ? error.message : String(error)) }
  delete world.jobs[drone.name]
}

export function readEdges(world: World): WorksEvent[] {
  const prev = world.signals
  const found = new Set<WorksEvent>()
  if (world.furnace.output >= outputCap && prev.output < outputCap) found.add('furnace.full')
  if (world.ingotsMade > prev.ingotsMade || world.steelMade > prev.steelMade) found.add('furnace.ready')
  for (const drone of world.drones) {
    const was = prev.drones[drone.name]
    const full = drone.capacity > 0 && drone.cargo >= drone.capacity
    if (full && !(was && was.cargo >= was.capacity && was.capacity > 0)) found.add('drone.full')
    const idle = drone.cargo === 0 && !drone.route?.length && !world.jobs[drone.name]
    if (idle && !(was && was.idle)) found.add('drone.idle')
  }
  return [...found]
}

export function dueEvents(world: World): WorksEvent[] {
  return triggerUnlocked(world, 'events') ? readEdges(world) : []
}

export function settleTriggers(world: World, site: Site) {
  takeFromDepot(world, site)
  world.signals = snapshotSignals(world)
}

export interface InspectLine { label: string; value: string }
export interface InspectRecipe { id: string; input: string; output: string; locked?: string }
export interface InspectAction {
  id: ManualAction
  label: string
  api: string
  enabled: boolean
  reason?: string
  drone?: string
}
export interface InspectProgress { label: string; pct: number }
export interface InspectView {
  id: string
  name: string
  description: string
  lines: InspectLine[]
  recipes: InspectRecipe[]
  actions: InspectAction[]
  progress?: InspectProgress
}

export function machineList(world: World) {
  return [
    { id: 'furnace', name: 'Furnace', detail: `${world.furnace.input} ore · ${world.furnace.output} ingots` },
    { id: 'depot', name: 'Depot', detail: `${world.depot.ingots} ingots · ${world.depot.steel} steel` },
    ...world.drones.map(drone => ({
      id: drone.name,
      name: drone.name,
      detail: `${drone.carrying ?? 'empty'} ${drone.cargo}/${drone.capacity}`,
    })),
    ...world.veins.filter(vein => !vein.hidden).map(vein => ({
      id: `Vein ${vein.name}`,
      name: `Vein ${vein.name}`,
      detail: `${vein.purity} ${vein.kind}`,
    })),
  ]
}

function bar(label: string, done: number, total: number): InspectProgress {
  const pct = total <= 0 ? 0 : Math.max(0, Math.min(100, (done / total) * 100))
  return { label, pct }
}

export function inspectMachine(world: World, site: Site, id: string): InspectView | undefined {
  if (id === 'furnace') return inspectFurnace(world, site)
  if (id === 'depot') return inspectDepot(world)
  const drone = world.drones.find(item => item.name === id)
  if (drone) return inspectDrone(world, drone)
  const vein = world.veins.find(item => `Vein ${item.name}` === id && !item.hidden)
  if (vein) return inspectVein(vein)
}

function inspectFurnace(world: World, site: Site): InspectView {
  const furnace = world.furnace
  const span = world.batchTicks ?? site.recipe.ticks
  let progress: InspectProgress | undefined
  if (furnace.readyAt !== null) progress = bar(furnace.batch === 'steel' ? 'Alloying' : 'Smelting', span - (furnace.readyAt - world.tick), span)
  else if (world.collectAt !== null) progress = bar('Collecting', world.collectSpan - (world.collectAt - world.tick), world.collectSpan || span)
  const alloy = functionUnlocked(world, 'furnace.alloy')
  return {
    id: 'furnace',
    name: 'Furnace',
    description: 'Smelts ore into ingots. Ore and coal together become steel.',
    lines: [
      { label: 'Hopper ore', value: `${furnace.input}/${furnace.oreMax}` },
      { label: 'Hopper coal', value: `${furnace.coal}/${furnace.coalMax}` },
      { label: 'Ingots', value: `${furnace.output}/${outputCap}` },
      { label: 'Steel', value: `${furnace.steel}/${outputCap}` },
    ],
    recipes: [
      { id: 'ingot', input: `${site.recipe.ore} ore`, output: `${site.recipe.ingots} ingot` },
      {
        id: 'steel',
        input: `${site.recipe.ore} ore + 1 coal`,
        output: '1 steel',
        locked: alloy ? undefined : 'Steel for the bridge unlocks furnace.alloy()',
      },
    ],
    actions: [
      { id: 'smelt', label: 'Smelt', api: 'furnace.smelt()', enabled: furnace.readyAt === null && world.collectAt === null },
      { id: 'alloy', label: 'Alloy', api: 'furnace.alloy()', enabled: alloy && furnace.readyAt === null, reason: alloy ? undefined : 'Unlocks with Steel for the bridge' },
      { id: 'collect', label: 'Collect', api: '', enabled: world.collectAt === null && (furnace.output > 0 || furnace.steel > 0), reason: 'Moves ingots and steel to the depot' },
      { id: 'clear', label: 'Clear hopper', api: 'furnace.clear()', enabled: furnace.input > 0 || furnace.coal > 0, reason: 'Drops ore and coal. Ingots and steel stay' },
    ],
    progress,
  }
}

function inspectDepot(world: World): InspectView {
  return {
    id: 'depot',
    name: 'Depot',
    description: 'Villagers take ingots and steel from here. Ore and coal can wait here too.',
    lines: [
      { label: 'Ingots', value: String(world.depot.ingots) },
      { label: 'Steel', value: String(world.depot.steel) },
      { label: 'Ore', value: String(world.depot.ore) },
      { label: 'Coal', value: String(world.depot.coal) },
    ],
    recipes: [],
    actions: [],
  }
}

function inspectDrone(world: World, drone: World['drones'][number]): InspectView {
  const job = world.jobs[drone.name]
  return {
    id: drone.name,
    name: drone.name,
    description: 'A cart. It mines, carries one kind, and unloads.',
    lines: [
      { label: 'Cargo', value: drone.carrying ?? 'empty' },
      { label: 'Load', value: `${drone.cargo}/${drone.capacity}` },
      { label: 'At', value: `${drone.pos.x},${drone.pos.y}` },
    ],
    recipes: [],
    actions: [
      { id: 'mine', label: 'Mine', api: 'drone.mine(vein)', enabled: !job, drone: drone.name, reason: job?.kind === 'mine' ? 'Already mining' : undefined },
      { id: 'unload', label: 'Unload', api: 'drone.unload(station)', enabled: !job && drone.cargo > 0, drone: drone.name },
      { id: 'dump', label: 'Dump', api: 'drone.dump()', enabled: drone.cargo > 0, drone: drone.name, reason: 'Drops ore and coal. Ingots and steel stay' },
    ],
    progress: job ? bar(job.kind === 'mine' ? 'Mining' : 'Unloading', job.total - job.left, job.total) : undefined,
  }
}

function inspectVein(vein: World['veins'][number]): InspectView {
  return {
    id: `Vein ${vein.name}`,
    name: `Vein ${vein.name}`,
    description: vein.kind === 'coal' ? 'A coal deposit. It does not run out.' : 'An ore deposit. It does not run out.',
    lines: [
      { label: 'Purity', value: vein.purity === 'rich' ? 'Rich' : vein.purity === 'normal' ? 'Normal' : 'Poor' },
      { label: 'Rock', value: vein.kind === 'coal' ? 'Coal' : 'Ore' },
      { label: 'Each mine', value: `${vein.ticksPerUnit} ticks for ${vein.yield}` },
    ],
    recipes: [],
    actions: [],
  }
}
