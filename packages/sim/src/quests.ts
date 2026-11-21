import type { Factory, FactoryEvent, MaterialId } from './campaign-api'
import { stepCampaign } from './engine'
import type { Campaign, QuestRun } from './model'

export interface Quest {
  id: string
  title: string
  customer: string
  brief: string
  product: MaterialId
  quantity: number
  dockInterval: number
  count: 'made' | 'shipped'
}
export const QUESTS: readonly Quest[] = [
  {
    id: 'shed',
    title: 'Ship 10 iron ingots',
    customer: 'Hale Hardware',
    brief: 'Let the dock collect the bars.',
    product: 'iron-ingot',
    quantity: 10,
    dockInterval: 1,
    count: 'shipped',
  },
  {
    id: 'balance',
    title: 'Make 10 iron ingots',
    customer: 'West End Rail',
    brief: 'Each finished furnace batch counts.',
    product: 'iron-ingot',
    quantity: 10,
    dockInterval: 1,
    count: 'made',
  },
  {
    id: 'parts',
    title: 'Ship 3 pressed parts',
    customer: 'Miller Tool Co.',
    brief: 'Leave the press running.',
    product: 'part',
    quantity: 3,
    dockInterval: 1,
    count: 'shipped',
  },
  {
    id: 'loading',
    title: 'Ship 3 more iron ingots',
    customer: 'County Freight',
    brief: 'The next three pickups open the order board.',
    product: 'iron-ingot',
    quantity: 3,
    dockInterval: 1,
    count: 'shipped',
  },
  {
    id: 'gate',
    title: 'Make 5 gate parts',
    customer: 'Canal Lock Works',
    brief: 'Each part off the press fits one hinge.',
    product: 'part',
    quantity: 5,
    dockInterval: 1,
    count: 'made',
  },
]

// Older runs contain only a shipment baseline. Carry their earned units into the new counter.
type ProductionRun = QuestRun & { made?: number; sampledTick?: number }
function recordProduction(c: Campaign) {
  const run: ProductionRun | undefined = c.progress.activeQuest
  const q = QUESTS.find((q) => q.id === run?.id)
  if (!run || q?.count !== 'made' || run.sampledTick === c.world.tick) return
  const made = c.world.machines.filter(
    (m) => m.recipe === q.product && m.recentProduction.at(-1) === c.world.tick,
  ).length
  run.made = (run.made ?? Math.max(0, (c.world.delivered[q.product] ?? 0) - run.shipped)) + made
  run.sampledTick = c.world.tick
}
/** Take fresh order counters on the existing floor, including work already in flight. */
export function restartQuest(campaign: Campaign, id?: string): boolean {
  const q = QUESTS.find((q) => (id ? q.id === id : !campaign.progress.completedQuests.includes(q.id)))
  if (!q) return false
  const world = campaign.world
  const run: ProductionRun = {
    id: q.id,
    startTick: world.tick,
    shipped: world.delivered[q.product] ?? 0,
    lost: world.lost,
    coal: world.extracted.coal ?? 0,
    furnaceActive: Object.fromEntries(
      world.machines
        .filter((machine) => machine.kind === 'furnace')
        .map((machine) => [machine.id, machine.stats.activeTicks]),
    ),
  }
  if (q.count === 'made') Object.assign(run, { made: 0, sampledTick: world.tick })
  campaign.progress.activeQuest = run
  world.dockInterval = q.dockInterval
  return true
}
export function questStatus(campaign: Campaign) {
  const world = campaign.world
  const run: ProductionRun | undefined = campaign.progress.activeQuest
  const q = QUESTS.find((q) => q.id === run?.id)
  if (!run || !q) return
  const elapsed = world.tick - run.startTick
  const shipped = (world.delivered[q.product] ?? 0) - run.shipped
  const rate = (shipped * 240) / Math.max(1, elapsed)
  const furnaces = world.machines.filter((machine) => machine.kind === 'furnace')
  const idle = furnaces.length
    ? Math.max(
        ...furnaces.map((machine) => {
          const active =
            machine.stats.activeTicks -
            (Object.hasOwn(run.furnaceActive, machine.id) && machine.builtAt < run.startTick
              ? run.furnaceActive[machine.id]
              : 0)
          return 100 * (1 - active / Math.max(1, world.tick - Math.max(run.startTick, machine.builtAt)))
        }),
      )
    : 100
  const lost = world.lost - run.lost,
    coal = (world.extracted.coal ?? 0) - run.coal
  const current = q.count === 'made' ? (run.made ?? shipped) : shipped
  const state = current >= q.quantity ? 'complete' : 'active'
  return { id: q.id, state, current, elapsed, shipped, rate, idle, lost, coal } as const
}
/** Call once after a raw step, or use advanceCampaign. Returns the newly completed quest ID. */
export function updateQuests(campaign: Campaign): string | undefined {
  recordProduction(campaign)
  const status = questStatus(campaign)
  if (status?.state !== 'complete') return
  campaign.progress.completedQuests.push(status.id)
  delete campaign.progress.activeQuest
  if (!restartQuest(campaign)) campaign.world.dockInterval = 1
  return status.id
}
export function advanceCampaign(
  campaign: Campaign,
  onTick: (ctx: Factory, events: FactoryEvent[]) => void,
  legacyQuests = true,
) {
  try {
    stepCampaign(campaign.world, onTick)
  } finally {
    if (legacyQuests) updateQuests(campaign)
    else recordProduction(campaign)
  }
}
