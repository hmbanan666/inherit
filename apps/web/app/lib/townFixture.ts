import type { BuildingId, TownAsk, TownSnapshot, Townsperson } from '@inherit/sim'

const names: Record<BuildingId, string> = {
  forge: 'Forge',
  bakery: 'Bakery',
  'lamp-street': 'Lamp Street',
  mill: 'Mill',
  bridge: 'Bridge',
  bank: 'Bank',
  'town-hall': 'Town Hall',
  riverside: 'Riverside',
}
const residents: [Townsperson['id'], string, string, BuildingId][] = [
  ['bram', 'Bram', 'Blacksmith', 'forge'],
  ['elsie', 'Elsie', 'Baker', 'bakery'],
  ['tomas', 'Tomas', 'Lamplighter', 'lamp-street'],
  ['wen', 'Old Wen', 'Miller', 'mill'],
  ['odile', 'Mayor Odile', 'Mayor', 'town-hall'],
  ['harrow', 'Mrs Harrow', 'Banker', 'bank'],
  ['ines', 'Ines', 'Ferrywoman', 'riverside'],
  ['pell', 'Pell', 'Tinker', 'riverside'],
]
function request(
  requestId: string,
  title: string,
  text: string,
  item: string,
  total: number,
  filled: number,
  dueLabel: string,
): TownAsk {
  return {
    requestId,
    title,
    text,
    items: { [item]: total },
    filled: { [item]: filled },
    dueLabel,
    late: false,
  }
}
const asks = [
  request(
    'mail-horse',
    'Horseshoes for the mail horse',
    'Three ingots will do. The post is getting rather heavy to carry on foot.',
    'iron-ingot',
    3,
    1,
    'by evening',
  ),
  request(
    'oven-grate',
    'A grate for the bread oven',
    'My oven swallowed its grate. Breakfast is counting on you.',
    'plate',
    4,
    2,
    'by morning',
  ),
  request(
    'lamp-wire',
    'Wire for Lamp Street',
    'I know this street by heart. The people tripping over my ladder don’t.',
    'wire',
    5,
    3,
    'by evening',
  ),
  request(
    'water-wheel',
    'Teeth for the mill wheel',
    'There’s plenty of water. It’s the teeth we’re short of.',
    'gear',
    3,
    1,
    'by day 7',
  ),
  request(
    'bridge-brackets',
    'Brackets for the bridge',
    'The ferry is a teacup with oars. Let’s give Riverside a bridge.',
    'bracket',
    6,
    4,
    'by day 10',
  ),
]
type Change = TownSnapshot['changes'][number]
const milestones: [string, number, TownSnapshot['phase'], number, Change[]][] = [
  ['Cold forge', 1, 'morning', 0.16, []],
  [
    'Forge lit',
    1,
    'evening',
    0.7,
    [{ tick: 84, buildingId: 'forge', text: 'The mail horse is back on its rounds.' }],
  ],
  ['Bread stall', 3, 'day', 0.43, [{ tick: 247, buildingId: 'bakery', text: 'Fresh bread on the square.' }]],
  [
    'Lamps lit',
    5,
    'night',
    0.89,
    [{ tick: 518, buildingId: 'lamp-street', text: 'Lamp Street glows again.' }],
  ],
  [
    'Mill turning',
    7,
    'morning',
    0.19,
    [{ tick: 729, buildingId: 'mill', text: 'The wheel turns. Flour for everyone.' }],
  ],
  [
    'Bridge built',
    9,
    'day',
    0.48,
    [
      { tick: 930, buildingId: 'bridge', text: 'The bridge stands.' },
      { tick: 930, buildingId: 'riverside', text: 'Riverside is open.' },
    ],
  ],
  ['Debt paid', 10, 'evening', 0.72, [{ tick: 1051, buildingId: 'bank', text: 'The shed is yours.' }]],
]
export const townFrames = milestones.map(([name, day, phase, clock], step) => {
  const changes = milestones.slice(0, step + 1).flatMap((m) => m[4])
  const buildings: TownSnapshot['buildings'] = (Object.keys(names) as BuildingId[]).map((id) => ({
    id,
    name: names[id],
    state:
      id === 'bank' || id === 'town-hall' || changes.some((c) => c.buildingId === id)
        ? 'working'
        : id === 'riverside'
          ? 'locked'
          : 'broken',
  }))
  const people: Townsperson[] = residents
    .filter((r) => step >= 5 || r[3] !== 'riverside')
    .map(([id, name, role, buildingId], i) => ({
      id,
      name,
      role,
      buildingId,
      mood:
        i === step && step === 2
          ? 'worried'
          : i < step || step >= 5
            ? 'happy'
            : i === 3 && step === 0
              ? 'gone'
              : 'waiting',
      ask: i === step && asks[step] ? { ...asks[step], late: step === 2 } : undefined,
    }))
  const paid = step === 6 ? 600 : step >= 4 ? 300 : step >= 2 ? 100 : 0
  const debt = {
    paid,
    owed: 600 - paid,
    next:
      paid === 600
        ? undefined
        : {
            amount: paid === 300 ? 300 : paid === 100 ? 200 : 100,
            dueDay: paid === 300 ? 10 : paid === 100 ? 6 : 3,
            late: false,
          },
  }
  const bank = buildings.find(b => b.id === 'bank')!
  if (step > 0) bank.label = debt.owed ? debt.owed + ' coins owed' : 'Paid in full'
  return { name, snapshot: { day, clock, phase, buildings, people, changes, debt } satisfies TownSnapshot }
})
