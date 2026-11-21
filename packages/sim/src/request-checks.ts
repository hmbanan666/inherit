import type { Campaign } from './model'
import { bramActivity } from './onboarding'
import { activeRequest } from './town'

export interface RequestCheck {
  id: string
  text: string
  state: 'todo' | 'close' | 'done'
  progress?: [number, number]
}

function state(done: boolean, close = false): RequestCheck['state'] {
  if (done) return 'done'
  return close ? 'close' : 'todo'
}

export function requestChecks(c: Campaign, draftExportsOnTick = false): RequestCheck[] {
  const request = activeRequest(c)
  if (!request) return []
  const { filled } = c.town
  const delivery: RequestCheck = {
    id: request.id,
    text: request.check,
    state: state(filled >= request.quantity, filled > 0),
    progress: [filled, request.quantity],
  }
  if (request.id !== 'horseshoes') return [delivery]

  const { dug, printed } = bramActivity(c)
  const furnace = c.world.machines.find(m => m.id === 'furnace')
  const connected = c.world.belts.some(b => b.from === 'mine' && b.to === 'furnace')
  const smelted = (furnace?.stats.processed ?? 0) > 0
  const smelting = (furnace?.remaining ?? 0) > 0
  const received = smelted || smelting || !!furnace?.queue.some(i => i.kind === 'iron-ore')
  return [
    { id: 'onTick', text: 'Your onTick prints a message', state: state(printed, draftExportsOnTick) },
    { id: 'dig', text: 'The mine digs iron ore', state: state(dug) },
    { id: 'ore', text: 'Ore reaches the furnace', state: state(received, connected) },
    { id: 'smelt', text: 'The furnace smelts ingots', state: state(smelted, smelting) },
    delivery,
  ]
}
