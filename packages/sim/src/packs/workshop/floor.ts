import { inputs, type ChallengeId, type Fixture } from './fixtures'
import type { Parcel, Place, PlayerAPI } from './player'

export const places: Place[] = ['belt', 'left', 'right', 'cart']
export interface Action {
  tick: number
  name: 'take' | 'put' | 'clearJam' | 'display'
  place?: Place
  parcel?: string
  ok: boolean
}
export interface Floor {
  challenge: ChallengeId
  input: string
  queues: Record<Place, Parcel[]>
  hand: Parcel | null
  station: Place
  jammed: boolean
  readings: number[]
  tick: number
  actions: Action[]
}

export function createFloor(challenge: ChallengeId, fixture: Fixture): Floor {
  const { belt = [], left = [], right = [], cart = [] } = structuredClone(fixture.queues)
  return {
    challenge, input: fixture.name, queues: { belt, left, right, cart },
    hand: null, station: 'belt', jammed: false, readings: [], tick: 0, actions: [],
  }
}

export function fixtureFor(world: Floor) {
  const fixture = inputs(world.challenge)?.find(input => input.name === world.input)
  if (!fixture) throw new Error('Unknown parcel fixture.')
  return fixture
}

function checkPlace(value: Place) {
  if (!places.includes(value)) throw new Error(`${String(value)}: expected Place ("belt", "left", "right" or "cart").`)
}
export function floorActions(world: Floor, mode: 'run' | 'setup' | 'tick' | 'idle'): PlayerAPI {
  if (mode === 'tick') {
    const fixture = fixtureFor(world)
    world.tick++
    for (const arrival of fixture.deliveries ?? []) {
      if (arrival.tick === world.tick) world.queues[arrival.station].push(...structuredClone(arrival.parcels))
    }
    if (fixture.jams?.includes(world.tick)) world.jammed = true
  }
  const blocked = (place: Place) => place === 'left' && world.jammed
  function record(name: Action['name'], ok: boolean, place?: Place, parcel?: string) {
    world.actions.push({ tick: world.tick, name, place, parcel, ok })
  }
  return {
    take(place) {
      checkPlace(place)
      world.station = place
      const parcel = !world.hand && place !== 'cart' && !blocked(place) ? world.queues[place].shift() : undefined
      if (parcel) world.hand = parcel
      record('take', !!parcel, place, parcel?.id)
      return parcel && { ...parcel }
    },
    put(place) {
      checkPlace(place)
      world.station = place
      const held = world.hand
      const ok = !!held && place !== 'belt' && !blocked(place)
      if (ok) {
        world.queues[place].push(held)
        world.hand = null
      }
      record('put', ok, place, held?.id)
      return ok
    },
    look(place) {
      checkPlace(place)
      const queue = world.queues[place]
      return { count: queue.length, front: queue[0] && { ...queue[0] }, jammed: blocked(place) }
    },
    display(value) {
      if (!Number.isFinite(value)) throw new Error(`${String(value)}: expected a finite number.`)
      world.readings.push(value)
      record('display', true)
    },
    clearJam(place) {
      checkPlace(place)
      const ok = blocked(place)
      if (ok) world.jammed = false
      record('clearJam', ok, place)
      return ok
    },
  }
}
