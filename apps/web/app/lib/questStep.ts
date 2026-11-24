export interface StepQuest {
  from: string
  goal: string
  item: 'ingot' | 'steel'
  qty: number
  trigger?: 'run' | 'events' | 'tick'
}

/** The drone's task, not its position. The sentence stays put until the task changes. */
export interface CartCue {
  name: string
  cargo: number
  capacity: number
  carrying: 'ore' | 'coal' | 'ingot' | 'steel' | null
  task?: 'mine' | 'unload' | 'pickup' | null
  vein?: string
  at?: 'furnace' | 'depot'
  phase?: 'fetch' | 'deliver'
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

function goods(item: 'ingot' | 'steel', qty: number) {
  if (item === 'steel') return `${qty} steel`
  return qty === 1 ? '1 ingot' : `${qty} ingots`
}

function sitting(state: QuestStepState) {
  return state.shipped === 0 && state.furnace.output === 0 && state.furnace.steel === 0
}

function untouched(state: QuestStepState) {
  return sitting(state) && state.furnace.input === 0 && state.furnace.coal === 0 && state.made.ingots === 0 && state.made.steel === 0
}

function goodName(carrying: CartCue['carrying'], item: 'ingot' | 'steel') {
  if (carrying === 'steel' || (carrying !== 'ingot' && item === 'steel')) return 'steel'
  return 'ingots'
}

function taskSentence(cart: CartCue, quest: StepQuest) {
  const name = cart.name
  if (cart.task === 'mine') {
    const vein = cart.vein ? `Vein ${cart.vein}` : 'the vein'
    return `${name} is mining ${vein}. When the cart is full, open ${name} and choose Unload.`
  }
  if (cart.task === 'unload' && cart.at === 'depot') {
    return `${name} is carrying ${goodName(cart.carrying, quest.item)} to the depot.`
  }
  if (cart.task === 'unload') {
    const load = cart.carrying === 'coal' ? 'coal' : 'ore'
    const next = quest.item === 'steel'
      ? 'Open the furnace and choose Alloy once the hopper has ore and coal.'
      : 'Open the furnace and choose Smelt once the hopper has enough ore.'
    return `${name} is carrying ${load} to the furnace. ${next}`
  }
  if (cart.task === 'pickup') {
    const delivering = cart.phase === 'deliver' || cart.carrying === 'ingot' || cart.carrying === 'steel'
    if (delivering) return `${name} is carrying ${goodName(cart.carrying, quest.item)} to the depot.`
    return `${name} is going to the furnace for ${quest.item === 'steel' ? 'steel' : 'ingots'}.`
  }
  return quest.goal
}

/** One sentence for the quest card. It names the next thing to do. */
export function questNextStep(state: QuestStepState) {
  const quest = state.quest
  if (!quest) {
    if (state.reading) return `Take ${person(state.reading.from)}'s quest`
    if (state.available) return `Talk to ${person(state.available.from)}`
    return 'More is coming.'
  }
  if (state.ready) return `Hand over ${goods(quest.item, quest.qty)}`
  const cart = state.cart
  if (cart?.task) return taskSentence(cart, quest)
  if (cart && cart.cargo >= cart.capacity && cart.cargo > 0) return `Open ${cart.name} and choose Unload.`
  if (quest.item === 'ingot' && state.furnace.output > 0) return 'Carry the ingots to the depot.'
  if (quest.item === 'steel' && state.furnace.steel > 0) return 'Carry the steel to the depot.'
  const oreNeed = state.oreNeed ?? 2
  if (!state.smelting && quest.item === 'ingot' && state.furnace.input >= oreNeed) return 'Open the furnace and choose Smelt.'
  if (!state.smelting && quest.item === 'steel' && state.furnace.input >= oreNeed && state.furnace.coal >= 1)
    return 'Open the furnace and choose Alloy.'
  if (state.smelting) return 'The furnace is smelting.'
  if (state.triggerReady && quest.trigger === 'run' && untouched(state)) return `Press ▶ next to ${state.runName || 'smeltOnce'}`
  if (state.triggerReady && quest.trigger === 'tick' && !state.loop && sitting(state)) return 'Turn on Loop: onTick'
  if (state.triggerReady && quest.trigger === 'events' && sitting(state)) return 'on() runs a function when the works change.'
  return quest.goal
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
