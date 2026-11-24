import { outputCap, type Item, type World } from '@inherit/sim/v8'
import { furnaceOutput, orderGoods } from './questNote'

export interface StepQuest {
  from: string
  goal: string
  batchCheck?: World['checks'][number]['status']
  item: Item
  qty: number
  lines?: { item: Item; qty: number }[]
  trigger?: 'run' | 'events' | 'tick'
}

/** Cargo for the next action. A live task does not become the sentence on the card. */
export interface CartCue {
  name: string
  cargo: number
  capacity: number
  carrying: Item | null
  task?: 'mine' | 'unload' | 'pickup' | 'transfer' | null
  vein?: string
  at?: 'furnace' | 'depot'
  phase?: 'fetch' | 'deliver'
}

/** One drone, for the status line. */
export interface DroneCue {
  name: string
  task?: 'mine' | 'unload' | 'pickup' | 'transfer' | null
  vein?: string
}

/** The words on the status bar, and how many updates the candidate has held. */
export interface SteadyLine {
  shown: string
  pending: string
  ticks: number
}

export interface QuestStepState {
  quest?: StepQuest
  reading?: { from: string }
  available?: { from: string }
  ready: boolean
  shipped: number
  loop: boolean
  furnace: { input: number; coal: number; output: number; steel: number }
  made: { ingots: number; steel: number }
  runName?: string
  cart?: CartCue
  /** Ore a smelt or alloy consumes. The site recipe is 2. */
  oreNeed?: number
  smelting?: boolean
  /** The quest's trigger is already granted. A locked trigger is not the next step. */
  triggerReady?: boolean
}

export interface LoopReadiness {
  on: boolean
  /** The deployed main.ts exports onTick. */
  deployed: boolean
  /** The draft main.ts exports onTick. */
  draft: boolean
  /** Another file exports onTick. The name opens that tab. */
  helper?: string
}

export interface GrantNote {
  text: string
  file?: string
}

function person(from: string) {
  return from.replace(/^Mayor /, '')
}

function sitting(state: QuestStepState) {
  return state.shipped === 0 && state.furnace.output === 0 && state.furnace.steel === 0
}

function untouched(state: QuestStepState) {
  return sitting(state) && state.furnace.input === 0 && state.furnace.coal === 0 && state.made.ingots === 0 && state.made.steel === 0
}

function droneBusy(cart: CartCue | undefined) {
  return !!cart && (!!cart.task || cart.cargo > 0)
}

/** One sentence for the quest card. It names the next thing to do, not the live task. */
export function questNextStep(state: QuestStepState) {
  const quest = state.quest
  if (!quest) {
    if (state.reading) return `Take ${person(state.reading.from)}'s quest`
    if (state.available) return `Talk to ${person(state.available.from)}`
    return 'More is coming.'
  }
  if (state.ready) return `Hand over ${orderGoods(quest)}`
  const cart = state.cart
  const busy = droneBusy(cart)
  const oreNeed = state.oreNeed ?? 2
  if (quest.batchCheck === 'open' && !state.smelting && state.furnace.input >= oreNeed && state.furnace.output < outputCap)
    return 'Edit smeltOnce, then press ▶.'
  if (cart && cart.cargo >= cart.capacity && cart.cargo > 0) return `Open ${cart.name} and choose Unload.`
  if (!furnaceOutput(quest.item)) return quest.goal
  if (quest.item === 'ingot' && state.furnace.output > 0) return 'Carry the ingots to the depot.'
  if (quest.item === 'steel' && state.furnace.steel > 0) return 'Carry the steel to the depot.'
  if (quest.batchCheck === 'open') return state.smelting ? 'The furnace is smelting.' : 'Load ore into the furnace.'
  if (!quest.batchCheck && !state.smelting && quest.item === 'ingot' && state.furnace.input >= oreNeed) return 'Open the furnace and choose Smelt.'
  if (!state.smelting && quest.item === 'steel' && state.furnace.input >= oreNeed && state.furnace.coal >= 1)
    return 'Open the furnace and choose Alloy.'
  if (state.smelting) return 'The furnace is smelting.'
  if (!busy && state.triggerReady && quest.trigger === 'run' && untouched(state)) return `Press ▶ next to ${state.runName || 'smeltOnce'}`
  if (!busy && state.triggerReady && quest.trigger === 'tick' && !state.loop && sitting(state)) return 'Turn on Loop: onTick'
  if (!busy && state.triggerReady && quest.trigger === 'events' && sitting(state)) return 'on() runs a function when the works change.'
  return quest.goal
}

function droneVerb(drone: DroneCue) {
  if (drone.task === 'mine') return drone.vein ? `mining Vein ${drone.vein}` : 'mining'
  if (drone.task === 'unload') return 'unloading'
  if (drone.task === 'pickup') return 'hauling'
  if (drone.task === 'transfer') return 'transferring'
  return 'idle'
}

/** `drone-1: mining Vein A`. One clause per drone. */
export function droneStatusLine(drones: readonly DroneCue[]) {
  return drones.map(drone => `${drone.name}: ${droneVerb(drone)}`).join(' · ')
}

/**
 * Keep the shown line until the next one has held for `hold` updates.
 * The first line shows at once. A one-update flicker never replaces it.
 */
export function steadyLine(state: SteadyLine | undefined, next: string, hold = 2): SteadyLine {
  if (!state?.shown) return { shown: next, pending: next, ticks: 0 }
  if (state.shown === next) return { shown: next, pending: next, ticks: 0 }
  if (state.pending === next) {
    const ticks = state.ticks + 1
    if (ticks >= hold) return { shown: next, pending: next, ticks: 0 }
    return { shown: state.shown, pending: next, ticks }
  }
  return { shown: state.shown, pending: next, ticks: 1 }
}

/** The one line for a trigger this quest just granted. */
export function grantHint(trigger: StepQuest['trigger']) {
  if (trigger === 'run') return 'Press ▶ next to a function. It runs once, this tick.'
  if (trigger === 'tick') return 'Loop calls that function every tick.'
  if (trigger === 'events') return 'on() runs a function when the works change.'
  return undefined
}

/** The grant line. A lit Loop with no deployed onTick says what is actually running. */
export function grantNote(trigger: StepQuest['trigger'], loop?: LoopReadiness): GrantNote | undefined {
  const text = grantHint(trigger)
  if (!text) return
  if (trigger !== 'tick' || !loop?.on || loop.deployed) return { text }
  if (loop.draft) return { text: 'Loop is on. Deploy main.ts to start onTick' }
  return { text: 'Export onTick from main.ts', file: loop.helper }
}
