import { brick, type Brick } from '../core/bricks'
import type { Cell, Site, World } from '../core/world'

/** Kinds a station or a cart can hold. The furnace fields store the first four. */
export const itemNames = ['ore', 'coal', 'ingot', 'steel', 'grate', 'plate', 'blank'] as const
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
/** Quests from Elsie onward. Taking Elsie opens the grate die. */
const grateDieQuests = ['elsie', 'harrow', 'tomas', 'pell', 'wen']
/** The hotter furnace finishes a furnace batch in this many ticks. */
export const hotFurnaceTicks = 2

export interface RecipeInput { item: Item; qty: number }
export interface Recipe {
  id: string
  machine: 'furnace' | 'press'
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
export const pressRecipes: Recipe[] = [
  { id: 'grate', machine: 'press', inputs: [{ item: 'steel', qty: 2 }], output: 'grate', qty: 1, ticks: pressTicks },
  { id: 'plate', machine: 'press', inputs: [{ item: 'ingot', qty: 1 }], output: 'plate', qty: 1, ticks: pressTicks },
  { id: 'blank', machine: 'press', inputs: [{ item: 'steel', qty: 1 }], output: 'blank', qty: 1, ticks: pressTicks },
]
const recipes = [smeltRecipe, alloyRecipe, ...pressRecipes]
const recipeByIdMap = new Map(recipes.map(recipe => [recipe.id, recipe]))
export function recipeById(id: string) { return recipeByIdMap.get(id) }

export const pressRecipeType = pressRecipes.map(recipe => `'${recipe.id}'`).join(' | ')
export const furnaceRecipeType = `'${smeltRecipe.id}' | '${alloyRecipe.id}'`

const pressOutputs = new Set(pressRecipes.map(recipe => recipe.output))

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
  return grateDieQuests.some(id => world.questId === id || world.cleared?.includes(id))
}

export function normalizePress(press: Press) {
  press.pos = { x: pressAt.x, y: pressAt.y }
  press.bin = ensureBin(press.bin)
  press.readyAt ??= null
  press.recipe ??= null
  return press
}

export type StationId = 'depot' | 'furnace' | 'press' | 'spare'
export const stationLabel: Record<StationId, string> = { depot: 'Depot', furnace: 'Furnace', press: 'Press', spare: 'Spare press' }

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

function pressRoom(bin: Bin, item: Item, cap: number) {
  if (pressOutputs.has(item)) {
    let used = 0
    for (const output of pressOutputs) used += tally(bin.qty, output) + tally(bin.reservedIn, output)
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
  const cap = finishedCap(world)
  const machine = id === 'spare' ? world.spare : world.press
  if (!machine) return
  machine.bin = ensureBin(machine.bin)
  return portFrom(id, machine.pos, machine.bin,
    item => tally(machine.bin.qty, item),
    (item, qty) => { if (qty <= 0) delete machine.bin.qty[item]; else machine.bin.qty[item] = qty },
    item => pressRoom(machine.bin, item, cap))
}

export function stationAt(world: World, pos: Cell): StationId | undefined {
  if (pos.x === world.furnace.pos.x && pos.y === world.furnace.pos.y) return 'furnace'
  if (pos.x === world.depot.pos.x && pos.y === world.depot.pos.y) return 'depot'
  if (world.press && pos.x === world.press.pos.x && pos.y === world.press.pos.y) return 'press'
  if (world.spare && pos.x === world.spare.pos.x && pos.y === world.spare.pos.y) return 'spare'
}

export function freeAt(world: World, id: StationId, item: Item) {
  return port(world, id)?.free(item) ?? 0
}

export type StartResult = 'started' | 'busy' | 'short' | 'full'
export type MachineId = 'furnace' | 'press' | 'spare'

function machineBusy(world: World, machine: MachineId) {
  if (machine === 'furnace') return world.furnace.readyAt !== null
  if (machine === 'spare') return world.spare?.readyAt != null
  return world.press?.readyAt != null
}

/** Consume inputs, reserve the output slot, and let the machine finish the batch. */
export function startRecipe(world: World, machine: MachineId, id: string): StartResult {
  const host = machine === 'spare' ? 'press' : machine
  const recipe = recipeById(id)
  if (!recipe || recipe.machine !== host) throw new Error(`The ${machine} does not run ${id}.`)
  if (host === 'press' && recipe.id === 'grate' && !grateDieOpen(world))
    throw new Error('The grate die opens when Elsie is taken.')
  if (host === 'press' && recipe.id !== 'grate')
    throw new Error(`The ${recipe.id} die opens on a later quest.`)
  const view = port(world, machine)
  if (!view) throw new Error(machine === 'spare' ? 'The spare press is not installed.' : 'The press is not installed.')
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
    const press = machine === 'spare' ? world.spare : world.press
    if (press) {
      press.recipe = recipe.id
      press.readyAt = readyAt
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

function finishOne(world: World, id: 'press' | 'spare') {
  const press = id === 'spare' ? world.spare : world.press
  if (!press?.recipe || press.readyAt !== world.tick) return
  const recipe = recipeById(press.recipe)
  press.readyAt = null
  press.recipe = null
  if (!recipe) return
  press.bin = ensureBin(press.bin)
  release(press.bin.reservedIn, recipe.output, recipe.qty)
  port(world, id)?.add(recipe.output, recipe.qty)
}

export function finishPress(world: World) {
  finishOne(world, 'press')
  finishOne(world, 'spare')
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
    brick('press.start', `start(recipe: ${pressRecipeType}): void`, 'Start one press batch. It finishes on its own. 2 steel become a grate, 1 ingot a plate, 1 steel a blank.',
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
