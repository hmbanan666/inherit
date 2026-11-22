import type { Parcel, Place } from './player'

export type Queues = Partial<Record<Place, Parcel[]>>
export interface Delivery {
  tick: number
  station: Place
  parcels: Parcel[]
}
export interface Fixture {
  name: string
  queues: Queues
  deliveries?: Delivery[]
  jams?: number[]
  /** Source of each required transfer. A dash is a quiet tick, and ! clears the left outlet. */
  turns?: string[]
}

function parcel(id: string, weight = 1, colour: Parcel['colour'] = 'red', to: Parcel['to'] = 'north'): Parcel {
  return { id, weight, colour, to }
}
const a = parcel('A', 2)
const b = parcel('B', 5, 'blue', 'south')
const c = parcel('C', 8, 'red', 'dock')
const d = parcel('D', 4, 'blue', 'north')
const e = parcel('E', 1, 'red', 'south')
const empty = { name: 'Empty belt', queues: {} }
const mixed = batch('Waiting batch', { belt: [a, b, c] })
const delivery = (tick: number, station: Place, ...parcels: Parcel[]): Delivery => ({ tick, station, parcels })

function batch(name: string, queues: Queues): Fixture {
  return { name, queues }
}

export const fixtures = {
  'dispatch-batch': [
    mixed, empty, batch('Longer batch', { belt: [d, b, e, a, c] }),
  ],
  'heavy-tally': [
    mixed, empty, batch('Every weight is on the boundary', { belt: [parcel('X', 5), b] }),
    batch('All light', { belt: [e, a] }),
  ],
  'colour-bins': [
    mixed, batch('Blue only', { belt: [b, d] }),
    batch('Red only', { belt: [c, a] }), empty,
  ],
  'route-table': [
    batch('Crossed colours', { belt: [d, e, c] }),
    batch('Dock only', { belt: [c, parcel('F', 3, 'blue', 'dock')] }),
    batch('Repeated labels', { belt: [e, d, b, a, c] }),
  ],
  'peak-weight': [
    batch('Tied maximum', { belt: [parcel('A', 8), parcel('B', 3), c] }),
    empty, batch('Descending weights', { belt: [parcel('Z', 99), d, e] }),
    batch('Last is heaviest', { belt: [e, a, b] }),
  ],
  'fragile-head': [
    batch('Heavy in the middle', { belt: [parcel('A'), parcel('B', 3), parcel('C', 4), parcel('D', 2)] }),
    empty, batch('Heavy first', { belt: [c, e] }),
    batch('All light', { belt: [e, a] }),
  ],
  'merge-bins': [
    batch('Equal heads', { left: [a, parcel('C', 6)], right: [parcel('B', 2), d] }),
    batch('Empty left', { right: [e, d] }),
    batch('Empty right', { left: [e, a] }),
    batch('Repeated ties', { left: [a, parcel('F', 2)], right: [e, parcel('G', 2)] }),
  ],
  'bin-dispatch': [
    batch('Waiting dispatch', { right: [parcel('P')], belt: [a, b] }),
    batch('Empty right bin', { belt: [c] }),
    batch('Two already waiting', { right: [e, d], belt: [b] }),
  ],
  'first-clock': [
    {
      name: 'Gap and burst',
      queues: {},
      deliveries: [delivery(1, 'belt', a), delivery(3, 'belt', b, c)],
      turns: ['belt', '-', 'belt', 'belt', '-', '-'],
    },
    {
      name: 'Last tick arrival',
      queues: {},
      deliveries: [delivery(6, 'belt', e)],
      turns: ['-', '-', '-', '-', '-', 'belt'],
    },
  ],
  'clear-outlet': [
    {
      name: 'Jam before tick two',
      queues: { left: [a, b] },
      jams: [2],
      turns: ['left', '!', 'left', '-'],
    },
    {
      name: 'Two obstructions',
      queues: { left: [d, e] },
      jams: [1, 3],
      turns: ['!', 'left', '!', 'left'],
    },
    {
      name: 'Empty healthy bin',
      queues: {},
      turns: ['-', '-', '-', '-'],
    },
  ],
  'alternate-bins': [
    {
      name: 'Both bins busy',
      queues: { left: [a, c], right: [b, d] },
      turns: ['left', 'right', 'left', 'right', '-', '-'],
    },
    {
      name: 'Idle between arrivals',
      queues: { right: [b] },
      deliveries: [delivery(3, 'left', c), delivery(3, 'right', d)],
      turns: ['right', '-', 'left', 'right', '-', '-'],
    },
    {
      name: 'Left followed by a gap',
      queues: { left: [a] },
      deliveries: [delivery(4, 'left', c), delivery(4, 'right', d)],
      turns: ['left', '-', '-', 'right', 'left', '-'],
    },
  ],
  'relay-controller': [
    {
      name: 'Two together',
      queues: {},
      deliveries: [delivery(1, 'belt', a, b)],
      turns: ['belt', 'right', 'belt', 'right', '-', '-', '-', '-'],
    },
    {
      name: 'Delayed arrival',
      queues: {},
      deliveries: [delivery(3, 'belt', c)],
      turns: ['-', '-', 'belt', 'right', '-', '-', '-', '-'],
    },
    {
      name: 'Four by tick three',
      queues: {},
      deliveries: [delivery(1, 'belt', a), delivery(3, 'belt', b, c, d)],
      turns: ['belt', 'right', 'belt', 'right', 'belt', 'right', 'belt', 'right'],
    },
  ],
} satisfies Record<string, Fixture[]>
export type ChallengeId = keyof typeof fixtures
export function inputs(id: ChallengeId): Fixture[] {
  return fixtures[id]
}
