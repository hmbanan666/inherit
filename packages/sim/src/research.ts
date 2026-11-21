import type { Factory, MachineKind } from './campaign-api'
import type { Campaign, ProjectFiles } from './model'
import { deployProject, rollbackProject } from './campaign'

export type FactoryMethod = Exclude<keyof Factory, 'tick' | 'recipe'>
export type GameEventName = 'onItemArrived' | 'onMachineIdle' | 'onTruckReturned'
export interface UnlockedSurface {
  methods: FactoryMethod[]
  events: GameEventName[]
  budget: number
  multiFile: boolean
  machines: MachineKind[]
}
export interface ResearchNode {
  id: string
  title: string
  description: string
  cost: number
  requires: string[]
  machines?: MachineKind[]
  methods?: FactoryMethod[]
  events?: GameEventName[]
  budget?: number
}
export const RESEARCH: readonly ResearchNode[] = [
  { id: 'survey', title: 'Tape measure', description: 'Buy neighboring plots.', cost: 1, requires: [] },
  {
    id: 'bins',
    title: 'Bin gauges',
    description: 'Read queues and inspect machines.',
    cost: 1,
    requires: [],
    methods: ['stock', 'inspect', 'machines'],
  },
  {
    id: 'fork',
    title: 'Forked belts',
    description: 'Share one feed between two burners.',
    cost: 2,
    requires: ['bins'],
    machines: ['splitter'],
    methods: ['route'],
  },
  {
    id: 'press',
    title: 'Stamping dies',
    description: 'Mine coal and press parts or plates.',
    cost: 2,
    requires: ['fork'],
    machines: ['press'],
  },
  {
    id: 'clock',
    title: 'Faster clock',
    description: 'Run up to 192 operations per tick.',
    cost: 2,
    requires: ['bins'],
    budget: 192,
  },
  {
    id: 'binder',
    title: 'Workshop binder',
    description: 'Keep helpers in their own files.',
    cost: 3,
    requires: ['fork'],
  },
  {
    id: 'copper',
    title: 'Copper claim',
    description: 'Sink a miner on copper.',
    cost: 3,
    requires: ['survey'],
  },
  {
    id: 'cutter',
    title: 'Cutting head',
    description: 'Draw wire or cut gear teeth.',
    cost: 3,
    requires: ['copper'],
    machines: ['cutter'],
  },
  {
    id: 'recipes',
    title: 'Recipe cards',
    description: 'Ask a machine which recipes it runs.',
    cost: 2,
    requires: ['cutter'],
    methods: ['recipes'],
  },
  {
    id: 'assembly',
    title: 'Assembly jig',
    description: 'Fit brackets and motors.',
    cost: 4,
    requires: ['recipes', 'press'],
    machines: ['assembler'],
  },
  {
    id: 'store',
    title: 'Spare shelves',
    description: 'Buffer a burst of parcels.',
    cost: 2,
    requires: ['fork'],
    machines: ['storage'],
  },
  {
    id: 'merge',
    title: 'Joining belts',
    description: 'Give two lines a shared exit.',
    cost: 2,
    requires: ['store'],
    machines: ['merger'],
  },
  {
    id: 'quality',
    title: 'Quality stamps',
    description: 'Reveal defects, inspect the first parcel and recycle rejects.',
    cost: 4,
    requires: ['merge'],
    machines: ['sorter', 'scrap'],
    methods: ['peek'],
  },
  {
    id: 'arrivals',
    title: 'Doorbell',
    description: 'Handle an arriving parcel.',
    cost: 3,
    requires: ['binder'],
    events: ['onItemArrived'],
  },
  {
    id: 'idle',
    title: 'Shift bell',
    description: 'Hear a machine finish its shift.',
    cost: 3,
    requires: ['arrivals'],
    events: ['onMachineIdle'],
  },
  {
    id: 'clock-2',
    title: 'Spare processor',
    description: 'Run up to 384 operations per tick.',
    cost: 4,
    requires: ['clock'],
    budget: 384,
  },
  {
    id: 'road',
    title: 'Road permit',
    description: 'Buy the road to the yard and fit depots.',
    cost: 4,
    requires: ['assembly'],
    machines: ['depot'],
  },
  {
    id: 'freight',
    title: 'Freight license',
    description: 'Dispatch a truck and hear it return.',
    cost: 4,
    requires: ['road'],
    machines: ['truck'],
    methods: ['dispatch'],
    events: ['onTruckReturned'],
  },
]
export function research(c: Campaign, id: string): boolean {
  const node = RESEARCH.find((n) => n.id === id)
  const e = c.economy
  if (
    !node ||
    e.research.includes(id) ||
    node.cost > e.researchPoints ||
    !node.requires.every((r) => e.research.includes(r))
  )
    return false
  e.researchPoints -= node.cost
  e.research.push(id)
  if (id === 'quality') c.world.defectsEnabled = true
  return true
}
export function getSurface(c: Campaign): UnlockedSurface {
  const nodes = RESEARCH.filter((n) => c.economy.research.includes(n.id))
  return {
    methods: ['dig', 'work', 'space', ...nodes.flatMap((n) => n.methods ?? [])],
    events: nodes.flatMap((n) => n.events ?? []),
    budget: Math.max(96, ...nodes.map((n) => n.budget ?? 0)),
    machines: ['miner', 'furnace', 'dock', ...nodes.flatMap((n) => n.machines ?? [])],
    multiFile: c.economy.research.includes('binder'),
  }
}
function checkFiles(c: Campaign, files: ProjectFiles) {
  if (!getSurface(c).multiFile && Object.keys(files).some((path) => path !== 'main.ts'))
    throw new Error('Research Workshop binder to deploy extra files.')
}
export function deployGameProject(c: Campaign) {
  checkFiles(c, c.project.working)
  return deployProject(c)
}
export function rollbackGameProject(c: Campaign, id: number): boolean {
  const entry = [...c.project.history, ...c.project.snapshots].find((r) => r.id === id)
  if (!entry) return false
  checkFiles(c, entry.files)
  return rollbackProject(c, id)
}
