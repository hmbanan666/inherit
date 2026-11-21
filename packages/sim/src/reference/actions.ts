import type { MachineKind } from '../campaign-api'
import type { Campaign } from '../model'
import { purchaseBelt, purchaseMachine, purchasePlot, purchaseRoad, sellBelt } from '../shop'
import { research } from '../research'
import { markMessageRead } from '../story'
import { acceptOrder, MOTOR_CUSTOMER } from '../orders'

type MachineRef = string | { memory: string }
export type ReferenceAction =
  | ['research' | 'read', string]
  | ['road' | 'acceptTram']
  | ['plot', string, string]
  | ['belt' | 'unbelt', MachineRef, MachineRef]
  | ['machine', MachineKind, string, number, number, string]

const plan: Record<string, ReferenceAction[]> = {
  survey: [['research', 'survey']],
  plot: [['plot', 'shed', 'east-lot']],
  oven: [['machine', 'furnace', 'shed', 4, 3, 'furnace-b']],
  belt: [['belt', 'furnace-b', 'dock']],
  gauges: [['research', 'bins']],
  'fork-license': [['research', 'fork']],
  fork: [['machine', 'splitter', 'shed', 2, 2, 'splitter']],
  'fork-feed': [
    ['unbelt', 'mine', 'furnace-a'],
    ['belt', 'mine', 'splitter'],
  ],
  'fork-belts': [
    ['belt', 'splitter', 'furnace-a'],
    ['belt', 'splitter', 'furnace-b'],
  ],
  dies: [['research', 'press']],
  coal: [['machine', 'miner', 'shed', 1, 4, 'coal-mine']],
  press: [['machine', 'press', 'shed', 6, 2, 'press']],
  'press-coal': [['belt', 'coal-mine', 'press']],
  'press-iron': [
    ['unbelt', 'furnace-a', 'dock'],
    ['belt', 'furnace-a', 'press'],
  ],
  part: [['belt', 'press', 'dock']],
  clock: [['research', 'clock']],
  binder: [['research', 'binder']],
  'copper-claim': [['research', 'copper']],
  copper: [['machine', 'miner', 'shed', 9, 2, 'copper']],
  blueprints: [['research', 'blueprints']],
  cutter: [
    ['research', 'cutter'],
    ['machine', 'cutter', 'shed', 11, 2, 'draw'],
  ],
  wire: [
    ['unbelt', { memory: 'oven' }, 'dock'],
    ['belt', { memory: 'oven' }, 'draw'],
    ['belt', 'draw', 'dock'],
  ],
  gear: [
    ['machine', 'cutter', 'shed', 7, 3, 'teeth'],
    ['unbelt', 'press', 'dock'],
    ['belt', 'press', 'teeth'],
    ['belt', 'teeth', 'dock'],
  ],
  cards: [['research', 'recipes']],
  assembler: [
    ['research', 'assembly'],
    ['machine', 'assembler', 'shed', 8, 3, 'jig'],
  ],
  bracket: [
    ['unbelt', 'press', 'teeth'],
    ['belt', 'press', 'jig'],
    ['unbelt', 'draw', 'dock'],
    ['belt', 'draw', 'jig'],
    ['belt', 'jig', 'dock'],
  ],
  shelves: [
    ['research', 'store'],
    ['machine', 'storage', 'shed', 12, 2, 'buffer'],
    ['unbelt', 'draw', 'jig'],
    ['belt', 'draw', 'buffer'],
    ['belt', 'buffer', 'jig'],
  ],
  merger: [
    ['research', 'merge'],
    ['machine', 'merger', 'shed', 5, 2, 'merge'],
    ['unbelt', 'furnace-a', 'press'],
    ['unbelt', 'furnace-b', 'dock'],
    ['belt', 'furnace-a', 'merge'],
    ['belt', 'furnace-b', 'merge'],
  ],
  'merge-out': [['belt', 'merge', 'press']],
  quality: [['research', 'quality']],
  'sorter-built': [
    ['machine', 'sorter', 'shed', 2, 1, 'sorter'],
    ['unbelt', 'mine', 'splitter'],
    ['belt', 'mine', 'sorter'],
    ['belt', 'sorter', 'splitter'],
  ],
  scrap: [
    ['machine', 'scrap', 'shed', 3, 1, 'scrap'],
    ['belt', 'sorter', 'scrap'],
    ['belt', 'scrap', 'splitter'],
  ],
  doorbell: [['research', 'arrivals']],
  'idle-bell': [['research', 'idle']],
  road: [['research', 'road'], ['road']],
  'local-depot': [
    ['machine', 'depot', 'shed', 2, 4, 'local'],
    ['unbelt', 'coal-mine', 'press'],
    ['belt', 'coal-mine', 'local'],
  ],
  depots: [['machine', 'depot', 'yard', 1, 1, 'remote']],
  truck: [
    ['research', 'freight'],
    ['machine', 'truck', 'shed', 0, 4, 'truck'],
  ],
  'motor-bench': [['machine', 'assembler', 'shed', 9, 3, 'motor-jig']],
  'motor-gear': [
    ['machine', 'splitter', 'shed', 6, 3, 'plate-fork'],
    ['unbelt', 'press', 'jig'],
    ['belt', 'press', 'plate-fork'],
    ['belt', 'plate-fork', 'teeth'],
    ['belt', 'plate-fork', 'jig'],
    ['unbelt', 'teeth', 'dock'],
    ['belt', 'teeth', 'motor-jig'],
  ],
  'motor-wire': [
    ['machine', 'splitter', 'shed', 11, 3, 'wire-fork'],
    ['unbelt', 'buffer', 'jig'],
    ['belt', 'buffer', 'wire-fork'],
    ['belt', 'wire-fork', 'jig'],
    ['belt', 'wire-fork', 'motor-jig'],
  ],
  motor: [
    ['unbelt', 'jig', 'dock'],
    ['belt', 'jig', 'motor-jig'],
    ['belt', 'motor-jig', 'dock'],
  ],
  network: [['read', 'tram']],
}
export function referenceActions(objectiveId: string): ReferenceAction[] {
  return structuredClone(plan[objectiveId] ?? [])
}
export function applyReferenceAction(c: Campaign, a: ReferenceAction): boolean {
  const machineId = (ref: MachineRef) => {
    const value = typeof ref === 'string' ? ref : c.memory[ref.memory]
    return typeof value === 'string' ? value : ''
  }
  switch (a[0]) {
    case 'machine':
      return !!purchaseMachine(c, a[1], a[2], a[3], a[4], a[5])
    case 'belt':
      return !!purchaseBelt(c, machineId(a[1]), machineId(a[2]))
    case 'unbelt':
      return sellBelt(c, machineId(a[1]), machineId(a[2]))
    case 'research':
      return research(c, a[1])
    case 'plot':
      return purchasePlot(c, a[1], a[2])
    case 'road':
      return purchaseRoad(c)
    case 'read':
      return markMessageRead(c, a[1])
    case 'acceptTram':
      return acceptOrder(
        c,
        c.economy.orders.find((o) => o.customer === MOTOR_CUSTOMER && o.status === 'open')?.id ?? '',
      )
  }
}
