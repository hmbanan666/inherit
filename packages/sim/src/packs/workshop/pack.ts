import { definePack } from '../../framework/pack'
import { briefs } from './briefs'
import { inputs, type ChallengeId } from './fixtures'
import { createFloor, fixtureFor, floorActions, places, type Floor } from './floor'
import { lessons } from './lessons'
import manifest from './manifest'
import type { Parcel, PlayerAPI } from './player'

function validParcel(value: Parcel) {
  return value && typeof value.id === 'string' && ['red', 'blue'].includes(value.colour) &&
    ['north', 'south', 'dock'].includes(value.to) && Number.isInteger(value.weight)
}
export default definePack<Floor, PlayerAPI>({
  manifest,
  version: 2,
  initialWorld: () => createFloor('dispatch-batch', inputs('dispatch-batch')[0]),
  decodeWorld(input) {
    const world = input as Floor
    if (!world || !Object.hasOwn(briefs, world.challenge) || !places.includes(world.station) ||
        !Number.isSafeInteger(world.tick) || world.tick < 0 || typeof world.jammed !== 'boolean' ||
        !places.every(place => Array.isArray(world.queues?.[place]) && world.queues[place].every(validParcel)) ||
        !(world.hand === null || validParcel(world.hand)) || !Array.isArray(world.readings) ||
        !world.readings.every(Number.isFinite) || !Array.isArray(world.actions) ||
        !world.actions.every(a => a && Number.isInteger(a.tick) && typeof a.ok === 'boolean' &&
          ['take', 'put', 'display', 'clearJam'].includes(a.name))) throw new Error('Unreadable parcel floor.')
    fixtureFor(world)
    return world
  },
  entities: places.map(place => ({
    id: place,
    label: place,
    rows: world => world.queues[place].map(parcel => ({ id: parcel.id, label: parcel.id, value: parcel.to })),
  })),
  panels: [],
  scenes: ['parcel-floor'],
  lessons,
  exposure: 'module',
  retry: 'entry',
  clock: { intervalMs: 900, handler: 'onTick' },
  available: (_, id) => briefs[id as ChallengeId]?.api ?? [],
  beginAttempt(world, mode) {
    return { api: floorActions(world, mode), finish() {} }
  },
})
