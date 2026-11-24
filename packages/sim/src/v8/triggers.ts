import { chargeCpu } from './core/cpu'
import { onDoc, onExample, onSignature } from './core/bricks'
import { pushConsole, type Cell, type Site, type World } from './core/world'
import { dumpCargo, mining, orderMine, orderPickup, orderUnload } from './modules/mining'
import { takeFromDepot } from './modules/orders'
import { outputCap, smelting } from './modules/smelting'
import { ensureBin, finishedCap, hingeRecipe, itemNames, kitLines, kitRecipe, latheRecipes, machineSlot, missingInputs, port, pressRecipes, pressStockLabel, recipeById, recipeParts, reservedLabel, type Item, type Press, type Recipe } from './modules/stock'
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
    doc: 'Call an exported function once, on one tick. The function reads the works and gives commands.',
    example: `import { drones, veins } from "inherit"

// Run calls haul once. The drone keeps the task after haul returns.
export function haul() {
  const vein = veins().find(item => item.name === "A")
  const drone = drones()[0]
  if (vein && !drone.busy) drone.mine(vein)
}`,
  },
  {
    id: 'tick' as const,
    name: 'Loop',
    signature: 'export function onTick(): void',
    doc: 'Call onTick every tick until Stop. The Loop switch does this too.',
    example: `import { drones, veins, furnace } from "inherit"

// Loop calls onTick every tick. Give a command only when the drone is free.
export function onTick() {
  const drone = drones()[0]
  const vein = veins().find(item => item.name === "A")
  if (!drone.busy && vein) {
    if (drone.cargo === 0) drone.mine(vein)
    else drone.unload(furnace)
  }
  if (furnace.input >= 2) furnace.smelt()
}`,
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
      idle: drone.cargo === 0 && !drone.route?.length && !drone.task,
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

export function pressManual(world: World, action: ManualAction, drone?: string, vein?: string) {
  const name = drone || world.drones[0]?.name || 'drone-1'
  if (action === 'mine' || action === 'unload' || action === 'dump') {
    world.inbox.drones[name] = action
    if (vein) world.inbox.vein = vein
  } else world.inbox[action] = true
  if (action === 'collect') world.inbox.collectDrone = name
}

export function queueRun(world: World, name: string, file: string, line: number) {
  if (!triggerUnlocked(world, 'run')) throw new Error('Run is locked. A quest unlocks it.')
  world.holding = false
  world.script = { name, file, line, loop: world.loop, phase: 'start' }
  world.manualRuns = (world.manualRuns ?? 0) + 1
}

export function stopScript(world: World) {
  if (world.loop) pushConsole(world, { tick: world.tick, text: 'Loop stopped: onTick', level: 'log' })
  world.holding = true
  world.loop = false
  world.script = null
  world.pace = { mode: 'idle', name: '' }
}

/** Loop calls onTick every tick. It does not queue a one-shot Run. */
export function setLoop(world: World, on: boolean, _name?: string, _file = 'main.ts', _line = 1) {
  if (!triggerUnlocked(world, 'tick')) throw new Error('Loop is locked. A quest unlocks it.')
  if (!on) {
    if (world.loop) pushConsole(world, { tick: world.tick, text: 'Loop stopped: onTick', level: 'log' })
    world.loop = false
    if (world.script) world.script.loop = false
    if (world.pace.mode === 'tick') world.pace = { mode: 'idle', name: '' }
    return
  }
  const starting = !world.loop
  world.holding = false
  world.loop = true
  if (world.script) world.script.loop = true
  if (starting) {
    pushConsole(world, { tick: world.tick, text: 'Loop started: onTick', level: 'log' })
    world.pace = { mode: 'tick', name: 'onTick' }
  }
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

/** Buttons for this tick. Drone tasks step after the player's function. Returns the CPU these buttons spent. */
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
  const inbox = world.inbox
  const vein = inbox.vein
  const collectDrone = inbox.collectDrone ?? world.drones[0]?.name ?? 'drone-1'
  world.inbox = emptyInbox()
  if (inbox.smelt) trySmelt(world, site, ctx, spend)
  if (inbox.alloy) tryAlloy(world, site, ctx, spend)
  if (inbox.collect) tryCollect(world, collectDrone)
  if (inbox.clear) tryClear(world, site, ctx, spend)
  for (const [name, action] of Object.entries(inbox.drones)) {
    if (action === 'dump') tryDump(world, name, spend)
    else if (action === 'mine') beginMine(world, name, vein)
    else beginUnload(world, name)
  }
  return used
}

function trySmelt(world: World, site: Site, ctx: { world: World; cpuUsed: () => number }, spend: (cost: number) => boolean) {
  const furnace = world.furnace
  if (furnace.readyAt !== null) return note(world, 'The furnace is smelting.')
  if (furnace.input < site.recipe.ore) return note(world, `The furnace needs ${site.recipe.ore} ore.`)
  if (!spend(site.costs.action)) return
  world.manualRuns++
  world.manualCommand = true
  try { handler(site, 'furnace.smelt')?.(ctx) }
  catch (error) { note(world, error instanceof Error ? error.message : String(error)) }
  finally { world.manualCommand = false }
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

function tryCollect(world: World, name: string) {
  if (!world.drones.some(item => item.name === name)) return note(world, `No drone named ${name}.`)
  try {
    const result = orderPickup(world, name, world.tick - 1)
    if (result === 'same') return note(world, `${name} is already picking up.`)
    world.manualRuns++
  } catch (error) {
    note(world, error instanceof Error ? error.message : String(error))
  }
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
  if (!drone.cargo) {
    dumpCargo(world, name)
    return note(world, `${name} carries nothing.`)
  }
  if (!spend(1)) return
  world.manualRuns++
  try { dumpCargo(world, name) }
  catch (error) { note(world, error instanceof Error ? error.message : String(error)) }
}

function beginMine(world: World, name: string, veinName?: string) {
  const found = world.drones.find(item => item.name === name)
  if (!found) return note(world, `No drone named ${name}.`)
  let vein = veinName ? world.veins.find(item => item.name === veinName && !item.hidden) : undefined
  if (veinName && !vein) return note(world, `${name} has no vein named ${veinName}.`)
  if (!vein) {
    const veins = world.veins.filter(item => !item.hidden && item.kind === 'ore')
    veins.sort((a, b) => distance(found.pos, a.pos) - distance(found.pos, b.pos) || a.name.localeCompare(b.name))
    vein = veins[0]
  }
  if (!vein) return note(world, `${name} has no vein to mine.`)
  try {
    const result = orderMine(world, name, vein.name, world.tick - 1)
    if (result === 'same') return note(world, `${name} is already mining Vein ${vein.name}.`)
    if (result === 'full') return note(world, `${name} cart is full (${found.cargo}/${found.capacity}).`)
    world.manualRuns++
  } catch (error) {
    note(world, error instanceof Error ? error.message : String(error))
  }
}

function beginUnload(world: World, name: string) {
  const found = world.drones.find(item => item.name === name)
  if (!found) return note(world, `No drone named ${name}.`)
  if (!found.cargo) return note(world, `${name} carries nothing.`)
  const station = found.carrying === 'ingot' || found.carrying === 'steel' ? world.depot.pos : world.furnace.pos
  try {
    const result = orderUnload(world, name, station, world.tick - 1)
    if (result === 'same') return note(world, `${name} is already unloading.`)
    world.manualRuns++
  } catch (error) {
    note(world, error instanceof Error ? error.message : String(error))
  }
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
    const idle = drone.cargo === 0 && !drone.route?.length && !drone.task
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
export interface InspectRecipe { id: string; input: string; output: string; locked?: string; missing?: string }
export interface InspectAction {
  id: ManualAction
  label: string
  api: string
  enabled: boolean
  reason?: string
  drone?: string
  vein?: string
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

function furnaceDetail(furnace: World['furnace']) {
  const parts = [`${furnace.input} ore`]
  if (furnace.coal > 0) parts.push(`${furnace.coal} coal`)
  parts.push(`${furnace.output} ingots`)
  if (furnace.steel > 0) parts.push(`${furnace.steel} steel`)
  return parts.join(' · ')
}

export function machineList(world: World) {
  return [
    { id: 'furnace', name: 'Furnace', detail: furnaceDetail(world.furnace) },
    ...world.press ? [{ id: 'press', name: 'Press', detail: pressStockLabel(world.press) }] : [],
    ...world.spare ? [{ id: 'spare', name: 'Spare press', detail: pressStockLabel(world.spare) }] : [],
    ...world.lathe ? [{ id: 'lathe', name: 'Lathe', detail: pressStockLabel(world.lathe) }] : [],
    ...world.bench ? [{ id: 'bench', name: 'Assembly table', detail: pressStockLabel(world.bench) }] : [],
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
  if (id === 'press' && world.press) return inspectPress(world, world.press, 'press', 'Press')
  if (id === 'spare' && world.spare) return inspectPress(world, world.spare, 'spare', 'Spare press')
  if (id === 'lathe' && world.lathe) return inspectStation(world, world.lathe, 'lathe', 'Lathe', latheRecipes, 'Cuts a blank into a gear, steel into a pin, or a plate into a cut plate.')
  if (id === 'bench' && world.bench) return inspectBench(world)
  if (id === 'depot') return inspectDepot(world)
  const drone = world.drones.find(item => item.name === id)
  if (drone) return inspectDrone(world, drone)
  const vein = world.veins.find(item => `Vein ${item.name}` === id && !item.hidden)
  if (vein) return inspectVein(world, vein)
}

function inspectFurnace(world: World, site: Site): InspectView {
  const furnace = world.furnace
  const span = world.batchTicks ?? site.recipe.ticks
  let progress: InspectProgress | undefined
  if (furnace.readyAt !== null) progress = bar(furnace.batch === 'steel' ? 'Alloying' : 'Smelting', span - (furnace.readyAt - world.tick), span)
  const alloy = functionUnlocked(world, 'furnace.alloy')
  const ore = site.recipe.ore
  const smelting = furnace.readyAt !== null
  const canSmelt = !smelting && furnace.input >= ore
  const canAlloy = alloy && !smelting && furnace.input >= ore && furnace.coal >= 1
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
      { id: 'ingot', input: `${ore} ore`, output: `${site.recipe.ingots} ingot` },
      {
        id: 'steel',
        input: `${ore} ore + 1 coal`,
        output: '1 steel',
        locked: alloy ? undefined : 'Steel for the bridge unlocks furnace.alloy()',
      },
    ],
    actions: [
      {
        id: 'smelt', label: 'Smelt', api: 'furnace.smelt()', enabled: canSmelt,
        reason: smelting ? 'The furnace is smelting.' : canSmelt ? undefined : `Needs ${ore} ore`,
      },
      {
        id: 'alloy', label: 'Alloy', api: 'furnace.alloy()', enabled: canAlloy,
        reason: !alloy ? 'Unlocks with Steel for the bridge' : smelting ? 'The furnace is smelting.' : canAlloy ? undefined : `Needs ${ore} ore and 1 coal`,
      },
      {
        id: 'collect', label: 'Collect', api: 'drone.pickup(furnace)', enabled: (furnace.output > 0 || furnace.steel > 0) && !!world.drones[0],
        drone: world.drones[0]?.name, reason: world.drones[0] ? `Collect with ${world.drones[0].name}` : undefined,
      },
      { id: 'clear', label: 'Clear hopper', api: 'furnace.clear()', enabled: furnace.input > 0 || furnace.coal > 0, reason: 'Drops ore and coal. Ingots and steel stay' },
    ],
    progress,
  }
}

function inspectPress(world: World, press: Press, id: 'press' | 'spare', name: string): InspectView {
  const view = port(world, id)!
  const active = press.recipe ? recipeById(press.recipe) : undefined
  const activeText = active ? recipeParts(active) : undefined
  const span = active?.ticks ?? 1
  const progress = press.readyAt !== null && active
    ? bar(active.output, span - (press.readyAt - world.tick), span)
    : undefined
  const idleGaps = pressRecipes.flatMap(recipe => {
    const missing = missingInputs(view, recipe)
    return missing ? [`${recipe.id} needs ${missing}`] : []
  })
  const cap = finishedCap(world)
  return {
    id,
    name,
    description: 'Forms a grate from steel, a plate from an ingot, a blank from steel, or a shutter from a cut plate.',
    lines: [
      { label: 'Recipe', value: activeText ? `${activeText.input} → ${activeText.output}` : 'Idle' },
      { label: 'Missing', value: active ? (missingInputs(view, active) ?? 'none') : (idleGaps.join(' · ') || 'none') },
      { label: 'Reserved', value: reservedLabel(ensureBin(press.bin)) },
      { label: 'Steel', value: `${view.get('steel')}/${machineSlot}` },
      { label: 'Ingots', value: `${view.get('ingot')}/${machineSlot}` },
      { label: 'Finished', value: `${view.get('grate') + view.get('plate') + view.get('blank') + view.get('shutter')}/${cap}` },
    ],
    recipes: pressRecipes.map(recipe => {
      const text = recipeParts(recipe)
      return { id: recipe.id, input: text.input, output: text.output, missing: missingInputs(view, recipe) }
    }),
    actions: [],
    progress,
  }
}

function outputSum(view: NonNullable<ReturnType<typeof port>>, items: readonly Item[]) {
  return items.reduce((sum, item) => sum + view.get(item), 0)
}

function inspectStation(world: World, machine: Press, id: 'lathe' | 'bench', name: string, recipes: readonly Recipe[], description: string): InspectView {
  const view = port(world, id)!
  const active = machine.recipe ? (machine.recipe.startsWith('pack:') ? kitRecipe(machine.recipe.endsWith('lamp') ? 'lamp' : 'winch') : recipeById(machine.recipe)) : undefined
  const activeText = active ? recipeParts(active) : undefined
  const span = active?.ticks ?? 1
  const progress = machine.readyAt !== null && active
    ? bar(active.output, span - (machine.readyAt - world.tick), span)
    : undefined
  const outputs: Item[] = id === 'lathe' ? ['gear', 'pin', 'cut'] : ['hinge', 'winch', 'lamp']
  const cap = finishedCap(world)
  return {
    id,
    name,
    description,
    lines: [
      { label: 'Recipe', value: activeText ? `${activeText.input} → ${activeText.output}` : 'Idle' },
      { label: 'Missing', value: active ? (missingInputs(view, active) ?? 'none') : 'none' },
      { label: 'Reserved', value: reservedLabel(ensureBin(machine.bin)) },
      { label: 'Finished', value: `${outputSum(view, outputs)}/${cap}` },
    ],
    recipes: recipes.map(recipe => {
      const text = recipeParts(recipe)
      return { id: recipe.id, input: text.input, output: text.output, missing: missingInputs(view, recipe) }
    }),
    actions: [],
    progress,
  }
}

function inspectBench(world: World): InspectView {
  const kit = world.manifest?.active === 'lamp' ? 'lamp' : 'winch'
  const pack = kitRecipe(kit)
  const view = inspectStation(world, world.bench!, 'bench', 'Assembly table', [hingeRecipe, pack], 'Joins a plate and a pin into a hinge, or packs the active kit into a labeled crate.')
  view.lines.splice(1, 0, { label: 'Crate', value: kit })
  const staged = kitLines[kit].map(line => `${world.manifest?.staged[line.item] ?? 0}/${line.qty} ${line.item}`).join(' · ')
  view.lines.push({ label: 'Set aside', value: staged })
  return view
}

function inspectDepot(world: World): InspectView {
  const depot = port(world, 'depot')!
  const stapleLabels: Partial<Record<Item, string>> = { ore: 'Ore', coal: 'Coal', ingot: 'Ingots', steel: 'Steel' }
  const lines = itemNames.flatMap(item => {
    const qty = depot.get(item)
    const label = stapleLabels[item]
    if (!label && qty === 0) return []
    return [{ label: label ?? item[0]!.toUpperCase() + item.slice(1), value: String(qty) }]
  })
  return {
    id: 'depot',
    name: 'Depot',
    description: 'Stock on hand, including goods reserved for pickup. Villagers collect their orders here.',
    lines: [...lines, { label: 'Reserved', value: reservedLabel(depot.bin) }],
    recipes: [],
    actions: [],
  }
}

function taskLabel(task: World['drones'][number]['task']) {
  if (task?.kind === 'mine') return 'Mining'
  if (task?.kind === 'unload') return 'Unloading'
  if (task?.kind === 'pickup') return 'Hauling'
  if (task?.kind === 'transfer') return 'Transferring'
  return 'free'
}

function inspectDrone(world: World, drone: World['drones'][number]): InspectView {
  const task = drone.task
  let progress: InspectProgress | undefined
  if (task?.kind === 'mine' && drone.dig && drone.dig.ticks > 0) {
    const vein = world.veins.find(item => item.name === drone.dig?.vein)
    if (vein) progress = bar('Mining', drone.dig.ticks, vein.ticksPerUnit)
  }
  const dest = drone.carrying === 'ingot' || drone.carrying === 'steel' ? 'depot' : 'furnace'
  return {
    id: drone.name,
    name: drone.name,
    description: 'A cart. It keeps one task: mine, unload, or pick up.',
    lines: [
      { label: 'Cargo', value: drone.carrying ?? 'empty' },
      { label: 'Load', value: `${drone.cargo}/${drone.capacity}` },
      { label: 'Task', value: taskLabel(task) },
      { label: 'Reserved', value: task?.kind === 'transfer' ? `${task.qty - task.delivered} ${task.item}` : 'none' },
      { label: 'At', value: `${drone.pos.x},${drone.pos.y}` },
    ],
    recipes: [],
    actions: [
      { id: 'mine', label: 'Mine', api: 'drone.mine(vein)', enabled: true, drone: drone.name, reason: task?.kind === 'mine' ? 'Same vein keeps going. Another vein replaces it' : undefined },
      {
        id: 'unload', label: 'Unload', api: 'drone.unload(station)', enabled: drone.cargo > 0, drone: drone.name,
        reason: drone.cargo > 0 ? `Unload at ${dest}` : undefined,
      },
      { id: 'dump', label: 'Dump', api: 'drone.dump()', enabled: drone.cargo > 0 || !!task, drone: drone.name, reason: 'Drops ore and coal and cancels the task. Ingots and steel stay' },
    ],
    progress,
  }
}

function inspectVein(world: World, vein: World['veins'][number]): InspectView {
  const drone = world.drones[0]
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
    actions: drone
      ? [{ id: 'mine', label: 'Mine', api: 'drone.mine(vein)', enabled: true, drone: drone.name, vein: vein.name, reason: 'The drone walks here and mines until the cart is full' }]
      : [],
  }
}
