import type { Factory, FactoryEvent, MaterialId } from './campaign-api'
import { stepCampaign } from './engine'
import type { Campaign } from './model'

export interface Quest {
  id: string
  title: string
  customer: string
  brief: string
  product: MaterialId
  quantity: number
  dockInterval: number
  minRate?: number
  maxIdle?: number
  lossless?: boolean
  coalBudget?: number
  deadline?: number
}
export const QUESTS: readonly Quest[] = [
  {
    id: 'shed',
    title: 'The shed',
    customer: 'Hale Hardware',
    brief: 'Give the cold furnace a job and ship ten ingots.',
    product: 'iron-ingot',
    quantity: 10,
    dockInterval: 1,
  },
  {
    id: 'balance',
    title: 'Second furnace',
    customer: 'West End Rail',
    brief:
      'Add a second furnace. Balance both bins to ship 185 ingots per minute with each furnace at most half idle.',
    product: 'iron-ingot',
    quantity: 48,
    dockInterval: 1,
    minRate: 185,
    maxIdle: 50,
  },
  {
    id: 'parts',
    title: 'Parts department',
    customer: 'Miller Tool Co.',
    brief: 'Feed coal and iron into a press for ten parts.',
    product: 'part',
    quantity: 10,
    dockInterval: 1,
  },
  {
    id: 'loading',
    title: 'Loading bay',
    customer: 'County Freight',
    brief: 'The dock loads every twelve ticks. Ship seven ingots without spilling anything.',
    product: 'iron-ingot',
    quantity: 7,
    dockInterval: 12,
    lossless: true,
  },
  {
    id: 'gate',
    title: 'First real order',
    customer: 'Canal Lock Works',
    brief: 'Ship twelve parts within 128 ticks. Draw at most twelve coal and avoid spills.',
    product: 'part',
    quantity: 12,
    dockInterval: 8,
    deadline: 128,
    coalBudget: 12,
    lossless: true,
  },
]
/** Take fresh order counters on the existing floor, including work already in flight. */
export function restartQuest(campaign: Campaign, id?: string): boolean {
  const q = QUESTS.find((q) => (id ? q.id === id : !campaign.progress.completedQuests.includes(q.id)))
  if (!q) return false
  const world = campaign.world
  campaign.progress.activeQuest = {
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
  world.dockInterval = q.dockInterval
  return true
}
export function questStatus(campaign: Campaign) {
  const world = campaign.world,
    run = campaign.progress.activeQuest
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
  const withinBudget = (!q.lossless || lost === 0) && (q.coalBudget === undefined || coal <= q.coalBudget)
  const complete =
    withinBudget &&
    shipped >= q.quantity &&
    (!q.deadline || elapsed <= q.deadline) &&
    (!q.minRate || rate >= q.minRate) &&
    (q.maxIdle === undefined || (furnaces.length >= 2 && idle <= q.maxIdle))
  const state = complete
    ? 'complete'
    : !withinBudget || (q.deadline !== undefined && elapsed >= q.deadline)
      ? 'failed'
      : 'active'
  return { id: q.id, state, elapsed, shipped, rate, idle, lost, coal } as const
}
/** Call once after a raw step, or use advanceCampaign. Returns the newly completed quest ID. */
export function updateQuests(campaign: Campaign): string | undefined {
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
  }
}
