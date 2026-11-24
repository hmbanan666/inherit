export interface StepQuest {
  from: string
  goal: string
  item: 'ingot' | 'steel'
  qty: number
  trigger?: 'run' | 'events' | 'tick'
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

/** One sentence for the quest card. It names the next thing to do. */
export function questNextStep(state: QuestStepState) {
  const quest = state.quest
  if (!quest) {
    if (state.reading) return `Take ${person(state.reading.from)}'s quest`
    if (state.available) return `Talk to ${person(state.available.from)}`
    return 'More is coming.'
  }
  if (state.ready) return `Hand over ${goods(quest.item, quest.qty)}`
  if (state.furnace.steel > 0) return 'Carry the steel to the depot.'
  if (state.furnace.output > 0) return 'Carry the ingots to the depot.'
  if (quest.trigger === 'run' && untouched(state)) return `Press ▶ next to ${state.runName || 'smeltOnce'}`
  if (quest.trigger === 'tick' && !state.loop && sitting(state)) return 'Turn on Loop: onTick'
  if (quest.trigger === 'events' && sitting(state)) return 'on() runs a function when the works change.'
  return quest.goal
}

/** The one line for a trigger this quest just granted. */
export function grantHint(trigger: StepQuest['trigger']) {
  if (trigger === 'run') return 'Press ▶ next to a function. It runs once, this tick.'
  if (trigger === 'tick') return 'Loop calls that function every tick.'
  if (trigger === 'events') return 'on() runs a function when the works change.'
  return undefined
}
