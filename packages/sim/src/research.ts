import type { BlueprintAPI, Factory, MachineKind } from './campaign-api'
import type { Campaign, WorkshopSection } from './model'
import { currentLesson } from './onboarding'
import { deployProject, rollbackProject } from './campaign'

export type FactoryMethod = Exclude<keyof Factory, 'tick' | 'recipe'> | keyof BlueprintAPI
export type GameEventName = 'onItemArrived' | 'onMachineIdle' | 'onTruckReturned'
export type ChapterExport = 'take' | 'put' | 'look' | 'buy' | 'repair'
const licenses = { press: 3, furnace: 4, cutter: 5, assembler: 9 } as const
export type ChapterMachine = keyof typeof licenses
export function availableMachines(c: Campaign): ChapterMachine[] {
  return (Object.keys(licenses) as ChapterMachine[]).filter(kind => licenses[kind] <= c.town.beat)
}
export interface UnlockedSurface {
  sections: WorkshopSection[]
  showMoney: boolean
  exports: ChapterExport[]
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
    id: 'blueprints',
    title: 'Blueprint API',
    description: 'Buy, belt and dismantle machines from your controller.',
    cost: 3,
    requires: ['binder'],
    methods: ['build', 'connect', 'dismantle', 'lastError'],
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
  const { beat } = c.town
  const sections: WorkshopSection[] = ['code']
  if (beat > 1 || !!c.world.extracted['iron-ore'] || !!c.world.extracted['copper-ore']) sections.push('factory')
  if (c.town.changes.length) sections.push('town')
  if (beat > 1 && c.progress.messages.some(m => m.kind === 'email' && m.id !== 'uncle')) sections.push('inbox')
  if (c.town.offered.length || c.economy.orders.some(o => o.id.startsWith('order-')))
    sections.push('orders')
  const exports: ChapterExport[] = ['take']
  if (beat > 1 || c.town.solved.includes('dig')) exports.push('put')
  if (beat >= 3) exports.push('buy')
  if (beat >= 4) exports.push('look')
  if (beat >= 6) exports.push('repair')
  const machines: MachineKind[] = ['miner', 'dock', 'furnace']
  if (beat >= 3) machines.push('press')
  if (beat >= 5) machines.push('cutter')
  if (beat >= 9) machines.push('assembler')
  return {
    sections, showMoney: beat > 1, exports, events: [],
    budget: 1024,
    machines,
    multiFile: true,
  }
}
export function deployGameProject(c: Campaign) {
  const revision = deployProject(c)
  if (currentLesson(c)?.cases.length === 0) c.town.wired = true
  return revision
}
export const rollbackGameProject = rollbackProject
