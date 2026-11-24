import { brick, type Brick } from '../core/bricks'
import type { Cell, Site, World } from '../core/world'

/** Kinds a station or a cart can hold. The furnace fields store the first four. */
export const itemNames = ['ore', 'coal', 'ingot', 'steel', 'grate', 'plate', 'blank', 'gear', 'pin', 'cut', 'shutter', 'hinge', 'winch', 'lamp'] as const
export type Item = (typeof itemNames)[number]
export const itemType = itemNames.map(name => `'${name}'`).join(' | ')

export function isItem(value: unknown): value is Item {
  return typeof value === 'string' && (itemNames as readonly string[]).includes(value)
}

/** Finished ingots or steel the furnace can hold. The hotter furnace does not change this. */
export const furnaceOutputCap = 6
/** A granted machine holds this many of each input, and this many finished pieces in total. */
export const machineSlot = 3
/** Odile installs the press here, between the furnace and the cuts. */
export const pressAt: Cell = { x: 5, y: 1 }
/** The spare press, a shop convenience, sits south of the first one. */
export const spareAt: Cell = { x: 5, y: 4 }
/** Harrow's Hand over installs the lathe at the mill. */
export const latheAt: Cell = { x: 9, y: 1 }
/** Tomas's Hand over installs the assembly table by the river. */
export const benchAt: Cell = { x: 12, y: 4 }
/** Quest order. A die opens on the Take that names it, and stays open after. */
const chain = ['bram', 'ines', 'odile', 'elsie', 'harrow', 'tomas', 'pell', 'wen', 'crew']
const dieAt: Record<string, string> = {
  grate: 'elsie', plate: 'harrow', blank: 'harrow', gear: 'tomas',
  pin: 'pell', cut: 'wen', shutter: 'wen', hinge: 'pell', pack: 'crew',
}
const dieNote: Record<string, string> = {
  grate: 'The grate die opens when Elsie is taken.',
  plate: 'The plate die opens when Harrow is taken.',
  blank: 'The blank die opens when Harrow is taken.',
  gear: 'The gear cutter opens when Tomas is taken.',
  pin: 'The pin cutter opens when Pell is taken.',
  cut: 'The cut-plate cutter opens when Wen is taken.',
  shutter: 'The folding die opens when Wen is taken.',
  hinge: 'The hinge drawing opens when Pell is taken.',
  pack: 'Packing opens when the bridge contract is taken.',
}
/** The hotter furnace finishes a furnace batch in this many ticks. */
export const hotFurnaceTicks = 2

export interface RecipeInput { item: Item; qty: number }
export interface Recipe {
  id: string
  machine: 'furnace' | 'press' | 'lathe' | 'bench'
  inputs: RecipeInput[]
  output: Item
  qty: number
  ticks: number
}

export const smeltRecipe: Recipe = {
  id: 'smelt', machine: 'furnace', inputs: [{ item: 'ore', qty: 2 }], output: 'ingot', qty: 1, ticks: 4,
}
export const alloyRecipe: Recipe = {
  id: 'alloy', machine: 'furnace',
  inputs: [{ item: 'ore', qty: smeltRecipe.inputs[0]!.qty }, { item: 'coal', qty: 1 }],
  output: 'steel', qty: 1, ticks: smeltRecipe.ticks,
}
const pressTicks = 4
const latheTicks = 6
const packTicks = 6
export const pressRecipes: Recipe[] = [
  { id: 'grate', machine: 'press', inputs: [{ item: 'steel', qty: 2 }], output: 'grate', qty: 1, ticks: pressTicks },
  { id: 'plate', machine: 'press', inputs: [{ item: 'ingot', qty: 1 }], output: 'plate', qty: 1, ticks: pressTicks },
  { id: 'blank', machine: 'press', inputs: [{ item: 'steel', qty: 1 }], output: 'blank', qty: 1, ticks: pressTicks },
  { id: 'shutter', machine: 'press', inputs: [{ item: 'cut', qty: 1 }], output: 'shutter', qty: 1, ticks: pressTicks },
]
export const latheRecipes: Recipe[] = [
  { id: 'gear', machine: 'lathe', inputs: [{ item: 'blank', qty: 1 }], output: 'gear', qty: 1, ticks: latheTicks },
  { id: 'pin', machine: 'lathe', inputs: [{ item: 'steel', qty: 1 }], output: 'pin', qty: 1, ticks: latheTicks },
  { id: 'cut', machine: 'lathe', inputs: [{ item: 'plate', qty: 1 }], output: 'cut', qty: 1, ticks: latheTicks },
]
export const hingeRecipe: Recipe = {
  id: 'hinge', machine: 'bench', inputs: [{ item: 'plate', qty: 1 }, { item: 'pin', qty: 1 }], output: 'hinge', qty: 1, ticks: pressTicks,
}
/** The two bridge crates, in order. Pack reads the active one. */
export const kitLines: Record<'winch' | 'lamp', { item: Item; qty: number }[]> = {
  winch: [{ item: 'gear', qty: 1 }, { item: 'hinge', qty: 2 }],
  lamp: [{ item: 'shutter', qty: 2 }, { item: 'hinge', qty: 1 }],
}
const recipes = [smeltRecipe, alloyRecipe, ...pressRecipes, ...latheRecipes, hingeRecipe]
const recipeByIdMap = new Map(recipes.map(recipe => [recipe.id, recipe]))
export function recipeById(id: string) { return recipeByIdMap.get(id) }

export const pressRecipeType = pressRecipes.map(recipe => `'${recipe.id}'`).join(' | ')
export const latheRecipeType = latheRecipes.map(recipe => `'${recipe.id}'`).join(' | ')
export const benchRecipeType = `'hinge' | 'pack'`
export const furnaceRecipeType = `'${smeltRecipe.id}' | '${alloyRecipe.id}'`

const pressOutputs = new Set(pressRecipes.map(recipe => recipe.output))
const latheOutputs = new Set(latheRecipes.map(recipe => recipe.output))
const benchOutputs = new Set<Item>(['hinge', 'winch', 'lamp'])

export interface Manifest {
  active: 'winch' | 'lamp'
  staged: Partial<Record<Item, number>>
  winch: boolean
  lamp: boolean
}

export function emptyManifest(): Manifest {
  return { active: 'winch', staged: {}, winch: false, lamp: false }
}

export function normalizeManifest(manifest: Manifest | undefined): Manifest {
  const next = manifest ?? emptyManifest()
  if (next.active !== 'winch' && next.active !== 'lamp') next.active = 'winch'
  next.staged ??= {}
  next.winch = !!next.winch
  next.lamp = !!next.lamp
  return next
}

export function kitRecipe(kit: 'winch' | 'lamp'): Recipe {
  return {
    id: 'pack', machine: 'bench',
    inputs: kitLines[kit].map(line => ({ item: line.item, qty: line.qty })),
    output: kit, qty: 1, ticks: packTicks,
  }
}

/** True once the quest that opens this die is taken, or a later quest is open or handed over. */
export function dieOpen(world: { questId?: string; cleared?: string[] }, id: string) {
  const quest = dieAt[id]
  if (!quest) return true
  const index = chain.indexOf(quest)
  if (index < 0) return false
  return chain.some((name, i) => i >= index && (world.questId === name || !!world.cleared?.includes(name)))
}

/** Physical goods plus the amounts promised to a transfer or a running batch. */
export interface Bin {
  qty: Partial<Record<Item, number>>
  /** Space promised to goods that have not arrived, including a batch output. */
  reservedIn: Partial<Record<Item, number>>
  /** Physical goods promised to a transfer that has not picked them up. */
  reservedOut: Partial<Record<Item, number>>
}

export function emptyBin(): Bin {
  return { qty: {}, reservedIn: {}, reservedOut: {} }
}

export function ensureBin(bin: Bin | undefined): Bin {
  if (!bin) return emptyBin()
  bin.qty ??= {}
  bin.reservedIn ??= {}
  bin.reservedOut ??= {}
  return bin
}

export interface Press {
  pos: Cell
  bin: Bin
  readyAt: number | null
  recipe: string | null
}

export function createPress(): Press {
  return { pos: { x: pressAt.x, y: pressAt.y }, bin: emptyBin(), readyAt: null, recipe: null }
}

export function createSpare(): Press {
  return { pos: { x: spareAt.x, y: spareAt.y }, bin: emptyBin(), readyAt: null, recipe: null }
}

export function createLathe(): Press {
  return { pos: { x: latheAt.x, y: latheAt.y }, bin: emptyBin(), readyAt: null, recipe: null }
}

export function createBench(): Press {
  return { pos: { x: benchAt.x, y: benchAt.y }, bin: emptyBin(), readyAt: null, recipe: null }
}

function placeMachine(machine: Press, at: Cell) {
  machine.pos = { x: at.x, y: at.y }
  machine.bin = ensureBin(machine.bin)
  machine.readyAt ??= null
  machine.recipe ??= null
  return machine
}

export function normalizeLathe(machine: Press) {
  return placeMachine(machine, latheAt)
}

export function normalizeBench(machine: Press) {
  return placeMachine(machine, benchAt)
}

export function normalizeSpare(press: Press) {
  press.pos = { x: spareAt.x, y: spareAt.y }
  press.bin = ensureBin(press.bin)
  press.readyAt ??= null
  press.recipe ??= null
  return press
}

/** Finished pieces on a press. Racks double the slot. Inputs stay at one slot. */
export function finishedCap(world: { outputRacks?: boolean }) {
  return world.outputRacks ? machineSlot * 2 : machineSlot
}

export function grateDieOpen(world: { questId?: string; cleared?: string[] }) {
  return dieOpen(world, 'grate')
}

export function normalizePress(press: Press) {
  press.pos = { x: pressAt.x, y: pressAt.y }
  press.bin = ensureBin(press.bin)
  press.readyAt ??= null
  press.recipe ??= null
  return press
}

export type StationId = 'depot' | 'furnace' | 'press' | 'spare' | 'lathe' | 'bench'
export const stationLabel: Record<StationId, string> = {
  depot: 'Depot', furnace: 'Furnace', press: 'Press', spare: 'Spare press', lathe: 'Lathe', bench: 'Assembly table',
}

function tally(map: Partial<Record<Item, number>>, item: Item) {
  return map[item] ?? 0
}

export function reserve(map: Partial<Record<Item, number>>, item: Item, qty: number) {
  map[item] = tally(map, item) + qty
}

export function release(map: Partial<Record<Item, number>>, item: Item, qty: number) {
  const next = tally(map, item) - qty
  if (next <= 0) delete map[item]
  else map[item] = next
}

export interface Port {
  id: StationId
  pos: Cell
  bin: Bin
  get(item: Item): number
  set(item: Item, qty: number): void
  free(item: Item): number
  room(item: Item): number
  take(item: Item, qty: number): void
  add(item: Item, qty: number): void
}

function classicFurnace(world: World, item: Item) {
  if (item === 'ore') return world.furnace.input
  if (item === 'coal') return world.furnace.coal
  if (item === 'ingot') return world.furnace.output
  if (item === 'steel') return world.furnace.steel
}

function setClassicFurnace(world: World, item: Item, qty: number) {
  if (item === 'ore') world.furnace.input = qty
  else if (item === 'coal') world.furnace.coal = qty
  else if (item === 'ingot') world.furnace.output = qty
  else if (item === 'steel') world.furnace.steel = qty
  else if (qty <= 0) delete world.furnace.bin.qty[item]
  else world.furnace.bin.qty[item] = qty
}

function pendingFurnace(world: World, item: Item) {
  const reserved = world.furnace.bin.reservedIn[item]
  if (reserved) return reserved
  if (item === 'ingot' && world.furnace.batch === 'ingot') return smeltRecipe.qty
  if (item === 'steel' && world.furnace.batch === 'steel') return alloyRecipe.qty
  return 0
}

function furnaceRoom(world: World, item: Item) {
  const bin = world.furnace.bin
  if (item === 'ore') return Math.max(0, world.furnace.oreMax - world.furnace.input - tally(bin.reservedIn, item))
  if (item === 'coal') return Math.max(0, world.furnace.coalMax - world.furnace.coal - tally(bin.reservedIn, item))
  if (item === 'ingot' || item === 'steel') return Math.max(0, furnaceOutputCap - classicFurnace(world, item)! - pendingFurnace(world, item))
  return Math.max(0, machineSlot - tally(bin.qty, item) - tally(bin.reservedIn, item))
}

function depotGet(world: World, item: Item) {
  if (item === 'ore') return world.depot.ore
  if (item === 'coal') return world.depot.coal ?? 0
  if (item === 'ingot') return world.depot.ingots ?? 0
  if (item === 'steel') return world.depot.steel ?? 0
  return tally(world.depot.bin.qty, item)
}

function depotSet(world: World, item: Item, qty: number) {
  if (item === 'ore') world.depot.ore = qty
  else if (item === 'coal') world.depot.coal = qty
  else if (item === 'ingot') world.depot.ingots = qty
  else if (item === 'steel') world.depot.steel = qty
  else if (qty <= 0) delete world.depot.bin.qty[item]
  else world.depot.bin.qty[item] = qty
}

function slotRoom(bin: Bin, item: Item, outputs: Set<Item>, cap: number) {
  if (outputs.has(item)) {
    let used = 0
    for (const output of outputs) used += tally(bin.qty, output) + tally(bin.reservedIn, output)
    return Math.max(0, cap - used)
  }
  return Math.max(0, machineSlot - tally(bin.qty, item) - tally(bin.reservedIn, item))
}

function portFrom(id: StationId, pos: Cell, bin: Bin, get: (item: Item) => number, set: (item: Item, qty: number) => void, room: (item: Item) => number): Port {
  return {
    id, pos, bin, get, set, room,
    free(item) { return Math.max(0, get(item) - tally(bin.reservedOut, item)) },
    take(item, qty) {
      const have = get(item)
      if (qty > have - tally(bin.reservedOut, item)) throw new Error(`Not enough free ${item}.`)
      set(item, have - qty)
    },
    add(item, qty) { set(item, get(item) + qty) },
  }
}

export function port(world: World, id: StationId): Port | undefined {
  if (id === 'furnace') {
    world.furnace.bin = ensureBin(world.furnace.bin)
    return portFrom(id, world.furnace.pos, world.furnace.bin,
      item => classicFurnace(world, item) ?? tally(world.furnace.bin.qty, item),
      (item, qty) => setClassicFurnace(world, item, qty),
      item => furnaceRoom(world, item))
  }
  if (id === 'depot') {
    world.depot.bin = ensureBin(world.depot.bin)
    return portFrom(id, world.depot.pos, world.depot.bin,
      item => depotGet(world, item),
      (item, qty) => depotSet(world, item, qty),
      () => Number.POSITIVE_INFINITY)
  }
  const found = id === 'spare' ? world.spare : id === 'lathe' ? world.lathe : id === 'bench' ? world.bench : world.press
  if (!found) return
  const outputs = id === 'lathe' ? latheOutputs : id === 'bench' ? benchOutputs : pressOutputs
  found.bin = ensureBin(found.bin)
  return portFrom(id, found.pos, found.bin,
    item => tally(found.bin.qty, item),
    (item, qty) => { if (qty <= 0) delete found.bin.qty[item]; else found.bin.qty[item] = qty },
    item => slotRoom(found.bin, item, outputs, finishedCap(world)))
}

export function stationAt(world: World, pos: Cell): StationId | undefined {
  if (pos.x === world.furnace.pos.x && pos.y === world.furnace.pos.y) return 'furnace'
  if (pos.x === world.depot.pos.x && pos.y === world.depot.pos.y) return 'depot'
  if (world.press && pos.x === world.press.pos.x && pos.y === world.press.pos.y) return 'press'
  if (world.spare && pos.x === world.spare.pos.x && pos.y === world.spare.pos.y) return 'spare'
  if (world.lathe && pos.x === world.lathe.pos.x && pos.y === world.lathe.pos.y) return 'lathe'
  if (world.bench && pos.x === world.bench.pos.x && pos.y === world.bench.pos.y) return 'bench'
}

export function freeAt(world: World, id: StationId, item: Item) {
  return port(world, id)?.free(item) ?? 0
}

export type StartResult = 'started' | 'busy' | 'short' | 'full'
export type MachineId = 'furnace' | 'press' | 'spare' | 'lathe' | 'bench'

function machineBody(world: World, machine: MachineId) {
  if (machine === 'spare') return world.spare
  if (machine === 'lathe') return world.lathe
  if (machine === 'bench') return world.bench
  return world.press
}

function machineBusy(world: World, machine: MachineId) {
  if (machine === 'furnace') return world.furnace.readyAt !== null
  return machineBody(world, machine)?.readyAt != null
}

function missingMachine(machine: MachineId) {
  if (machine === 'spare') return 'The spare press is not installed.'
  if (machine === 'lathe') return 'The lathe is not installed.'
  if (machine === 'bench') return 'The assembly table is not installed.'
  return 'The press is not installed.'
}

function storedRecipe(world: World, stored: string) {
  if (stored === 'pack:winch') return kitRecipe('winch')
  if (stored === 'pack:lamp') return kitRecipe('lamp')
  return recipeById(stored)
}

/** Consume inputs, reserve the output slot, and let the machine finish the batch. */
export function startRecipe(world: World, machine: MachineId, id: string): StartResult {
  const host = machine === 'spare' ? 'press' : machine
  const recipe = host === 'bench' && id === 'pack'
    ? kitRecipe(world.manifest?.active === 'lamp' ? 'lamp' : 'winch')
    : recipeById(id)
  if (!recipe || recipe.machine !== host) throw new Error(`The ${machine} does not run ${id}.`)
  if (!dieOpen(world, recipe.id)) throw new Error(dieNote[recipe.id] ?? `The ${recipe.id} die is closed.`)
  const view = port(world, machine)
  if (!view) throw new Error(missingMachine(machine))
  if (machineBusy(world, machine)) return 'busy'
  if (view.room(recipe.output) < recipe.qty) return 'full'
  for (const input of recipe.inputs) if (view.free(input.item) < input.qty) return 'short'
  for (const input of recipe.inputs) view.take(input.item, input.qty)
  reserve(view.bin.reservedIn, recipe.output, recipe.qty)
  const ticks = machine === 'furnace' ? (world.batchTicks ?? recipe.ticks) : recipe.ticks
  const readyAt = world.tick + ticks
  if (machine === 'furnace') {
    world.furnace.batch = recipe.output === 'steel' ? 'steel' : 'ingot'
    world.furnace.readyAt = readyAt
  } else {
    const body = machineBody(world, machine)
    if (body) {
      body.recipe = recipe.id === 'pack' ? `pack:${recipe.output}` : recipe.id
      body.readyAt = readyAt
    }
  }
  return 'started'
}

/** Drop a transfer's claim on cargo and receiving space. A second call releases nothing. */
export function releaseTransfer(world: World, drone: World['drones'][number]) {
  const task = drone.task
  if (task?.kind !== 'transfer') return
  const source = port(world, task.from)
  const dest = port(world, task.to)
  if (source) release(source.bin.reservedOut, task.item, task.qty - task.picked)
  if (dest) release(dest.bin.reservedIn, task.item, task.qty - task.delivered)
  task.picked = task.qty
  task.delivered = task.qty
}

function finishOne(world: World, id: 'press' | 'spare' | 'lathe' | 'bench') {
  const body = id === 'spare' ? world.spare : id === 'lathe' ? world.lathe : id === 'bench' ? world.bench : world.press
  if (!body?.recipe || body.readyAt !== world.tick) return
  const recipe = storedRecipe(world, body.recipe)
  body.readyAt = null
  body.recipe = null
  if (!recipe) return
  body.bin = ensureBin(body.bin)
  release(body.bin.reservedIn, recipe.output, recipe.qty)
  port(world, id)?.add(recipe.output, recipe.qty)
}

export function finishPress(world: World) {
  finishOne(world, 'press')
  finishOne(world, 'spare')
  finishOne(world, 'lathe')
  finishOne(world, 'bench')
}

export function recipeParts(recipe: Recipe) {
  return {
    input: recipe.inputs.map(input => `${input.qty} ${input.item}`).join(' + '),
    output: `${recipe.qty} ${recipe.output}`,
  }
}

/** What a start would still need. Undefined when the free inputs already cover it. */
export function missingInputs(view: Port, recipe: Recipe) {
  const parts = recipe.inputs.flatMap(input => {
    const short = input.qty - view.free(input.item)
    return short > 0 ? [`${short} ${input.item}`] : []
  })
  return parts.length ? parts.join(' + ') : undefined
}

export function reservedLabel(bin: Bin) {
  const parts: string[] = []
  for (const item of itemNames) {
    const incoming = tally(bin.reservedIn, item)
    const outgoing = tally(bin.reservedOut, item)
    if (incoming) parts.push(`${incoming} ${item} in`)
    if (outgoing) parts.push(`${outgoing} ${item} out`)
  }
  return parts.join(' · ') || 'none'
}

export function pressStockLabel(press: Press) {
  const parts = itemNames.flatMap(item => {
    const qty = tally(press.bin.qty, item)
    return qty > 0 ? [`${qty} ${item}`] : []
  })
  if (press.recipe) parts.push(press.recipe)
  return parts.join(' · ') || 'empty'
}

export function pressBricks(site: Site): Brick[] {
  const { read, action } = site.costs
  return [
    brick('press', 'const press: Press', 'The press. Odile installs it on Hand over.', 'press.start("grate")', read, {
      guest: `export const press = Object.freeze({
        pos: Object.freeze(${JSON.stringify(pressAt)}),
        get installed() { return api.press_installed() },
        count: api.press_count,
        start: api.press_start,
      })`,
    }),
    brick('press.installed', 'readonly installed: boolean', 'True after Odile hands over the press.', 'press.installed', read,
      ({ world }) => world.press != null),
    brick('press.count', `count(item: ${itemType}): number`, 'How many of that good are sitting on the press.', 'press.count("steel")', read,
      ({ world }, item) => {
        if (!isItem(item)) throw new Error(`Unknown good ${String(item)}.`)
        return port(world, 'press')?.get(item) ?? 0
      }),
    brick('press.start', `start(recipe: ${pressRecipeType}): void`, 'Start one press batch. It finishes on its own. 2 steel become a grate, 1 ingot a plate, 1 steel a blank, and 1 cut plate a shutter.',
      `// 2 steel on the press become 1 grate.\npress.start("grate")`, action, ({ world }, id) => {
        const recipe = String(id)
        const result = startRecipe(world, 'press', recipe)
        if (result === 'full') throw new Error(`press output is full (${finishedCap(world)}). Carry parts off the press.`)
      }),
    brick('spare', 'const spare: Press', 'The second press. The shop sells it once the first press is installed.', 'spare.start("grate")', read, {
      guest: `export const spare = Object.freeze({
        pos: Object.freeze(${JSON.stringify(spareAt)}),
        get installed() { return api.spare_installed() },
        count: api.spare_count,
        start: api.spare_start,
      })`,
    }),
    brick('spare.installed', 'readonly installed: boolean', 'True after the spare press is bought.', 'spare.installed', read,
      ({ world }) => world.spare != null),
    brick('spare.count', `count(item: ${itemType}): number`, 'How many of that good are sitting on the spare press.', 'spare.count("grate")', read,
      ({ world }, item) => {
        if (!isItem(item)) throw new Error(`Unknown good ${String(item)}.`)
        return port(world, 'spare')?.get(item) ?? 0
      }),
    brick('spare.start', `start(recipe: ${pressRecipeType}): void`, 'Start one batch on the spare press. The grate die opens with Elsie.',
      `spare.start("grate")`, action, ({ world }, id) => {
        const result = startRecipe(world, 'spare', String(id))
        if (result === 'full') throw new Error(`spare output is full (${finishedCap(world)}). Carry parts off the press.`)
      }),
    brick('lathe', 'const lathe: Lathe', 'The lathe. Harrow installs it on Hand over.', 'lathe.start("gear")', read, {
      guest: `export const lathe = Object.freeze({
        pos: Object.freeze(${JSON.stringify(latheAt)}),
        get installed() { return api.lathe_installed() },
        count: api.lathe_count,
        start: api.lathe_start,
      })`,
    }),
    brick('lathe.installed', 'readonly installed: boolean', 'True after Harrow hands over the lathe.', 'lathe.installed', read,
      ({ world }) => world.lathe != null),
    brick('lathe.count', `count(item: ${itemType}): number`, 'How many of that good are sitting on the lathe.', 'lathe.count("blank")', read,
      ({ world }, item) => {
        if (!isItem(item)) throw new Error(`Unknown good ${String(item)}.`)
        return port(world, 'lathe')?.get(item) ?? 0
      }),
    brick('lathe.start', `start(recipe: ${latheRecipeType}): void`, 'Start one lathe batch. It finishes in 6 ticks. A blank becomes a gear, steel a pin, and a plate a cut plate.',
      `// 1 blank on the lathe becomes 1 gear.\nlathe.start("gear")`, action, ({ world }, id) => {
        const result = startRecipe(world, 'lathe', String(id))
        if (result === 'full') throw new Error(`lathe output is full (${finishedCap(world)}). Carry parts off the lathe.`)
      }),
    brick('bench', 'const bench: Bench', 'The assembly table. Tomas installs it on Hand over.', 'bench.start("hinge")', read, {
      guest: `export const bench = Object.freeze({
        pos: Object.freeze(${JSON.stringify(benchAt)}),
        get installed() { return api.bench_installed() },
        count: api.bench_count,
        start: api.bench_start,
      })`,
    }),
    brick('bench.installed', 'readonly installed: boolean', 'True after Tomas hands over the assembly table.', 'bench.installed', read,
      ({ world }) => world.bench != null),
    brick('bench.count', `count(item: ${itemType}): number`, 'How many of that good are sitting on the assembly table.', 'bench.count("hinge")', read,
      ({ world }, item) => {
        if (!isItem(item)) throw new Error(`Unknown good ${String(item)}.`)
        return port(world, 'bench')?.get(item) ?? 0
      }),
    brick('bench.start', `start(recipe: ${benchRecipeType}): void`, 'Start one assembly batch. A plate and a pin become a hinge. pack boxes the active kit into a labeled crate.',
      `// 1 plate and 1 pin become 1 hinge.\nbench.start("hinge")`, action, ({ world }, id) => {
        const result = startRecipe(world, 'bench', String(id))
        if (result === 'full') throw new Error(`assembly table output is full (${finishedCap(world)}). Carry parts off the table.`)
      }),
    brick('manifest', 'function manifest(): Manifest', 'The active bridge crate, and the parts the depot has already set aside for it.', 'manifest().id', read,
      ({ world }) => {
        const manifest = normalizeManifest(world.manifest)
        const kit = manifest.active
        return {
          id: kit,
          winch: manifest.winch,
          lamp: manifest.lamp,
          lines: kitLines[kit].map(line => ({ item: line.item, qty: line.qty, staged: manifest.staged[line.item] ?? 0 })),
        }
      }),
    brick('depot.count', `count(item: ${itemType}): number`, 'How many of that good are at the depot. A quest counts them only here.', 'depot.count("grate")', read,
      ({ world }, item) => {
        if (!isItem(item)) throw new Error(`Unknown good ${String(item)}.`)
        return port(world, 'depot')?.get(item) ?? 0
      }),
  ]
}

export function furnaceFullMessage(output: Item) {
  if (output === 'steel') return `furnace steel is full (${furnaceOutputCap}). Carry steel to the depot.`
  return `furnace output is full (${furnaceOutputCap}). Carry ingots to the depot.`
}
