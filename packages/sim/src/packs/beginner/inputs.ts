import type { InputValue } from '../../framework/pack'
import type { Readings, Village } from './world'

const types = {
  lane: 'number',
  capacity: 'number',
  position: 'number',
  hooks: 'number',
  distance: 'number',
  leftReady: 'boolean',
  rightReady: 'boolean',
  nearOpen: 'boolean',
  farOpen: 'boolean',
  ringing: 'boolean',
  queue: 'string[]',
  waiting: 'string[]',
  visitors: 'string[]',
  weights: 'number[]',
  booking: '{ name: string; seats: number }',
} satisfies Record<keyof Readings, string>

export function inputCards(world: Readonly<Village>): Record<string, { type: string; value: InputValue }> {
  const cards: Record<string, { type: string; value: InputValue }> = {}
  for (const name of Object.keys(world.readings) as (keyof Readings)[]) {
    const value = world.readings[name]!
    cards[name] = {
      type: types[name],
      value: typeof value === 'object' && !Array.isArray(value) ? { ...value } : value,
    }
  }
  return cards
}
