import { restartQuest } from './quests'
import { connectBelt, placeMachine } from './construction'
import type { Campaign, ProjectRevision, Site } from './model'

function sites(): Site[] {
  return [
    {
      id: 'shed',
      name: 'Uncle’s shed',
      plots: [
        { id: 'shed-floor', x: 0, y: 0, width: 8, height: 5, status: 'owned', price: 0 },
        { id: 'east-lot', x: 8, y: 0, width: 6, height: 5, status: 'sale', price: 80 },
        { id: 'south-lot', x: 0, y: 5, width: 8, height: 5, status: 'sale', price: 60 },
        { id: 'rail-spur', x: 8, y: 5, width: 6, height: 5, status: 'locked', price: 180 },
      ],
      deposits: [
        { x: 1, y: 2, kind: 'iron' },
        { x: 1, y: 4, kind: 'coal' },
        { x: 9, y: 2, kind: 'copper' },
        { x: 2, y: 7, kind: 'iron' },
      ],
      roads: ['yard'],
    },
    {
      id: 'yard',
      name: 'Freight yard',
      plots: [{ id: 'roadhead', x: 0, y: 0, width: 6, height: 5, status: 'owned', price: 0 }],
      deposits: [{ x: 4, y: 2, kind: 'copper' }],
      roads: ['shed'],
    },
  ]
}
export function createCampaign(seed = 1): Campaign {
  const files = {
    'main.ts':
      'import type { Factory } from "inherit"\n\nexport function onTick(ctx: Factory) {\n  if (ctx.space("mine")) ctx.dig("mine")\n  // Give furnace-a a job.\n}\n',
  }
  const campaign: Campaign = {
    version: 2,
    world: {
      tick: 0,
      seed: seed >>> 0,
      nextMachineId: 1,
      nextIncidentId: 1,
      sites: sites(),
      machines: [],
      belts: [],
      lost: 0,
      delivered: {},
      extracted: {},
      dockInterval: 1,
      defectsEnabled: false,
      trips: [],
      receipts: [],
      tripScript: ['breakdown', 'lostAck'],
      events: [],
      lastEvents: [],
      incidents: [],
    },
    economy: { money: 100, reputation: 0, research: [], orders: [] },
    progress: { completedQuests: [] },
    project: {
      working: { ...files },
      deployed: { ...files },
      history: [{ id: 0, tick: 0, name: 'Inherited program', files: { ...files } }],
      snapshots: [],
      nextRevision: 1,
    },
    memory: {},
  }
  placeMachine(campaign, 'miner', 'shed', 1, 2, 'mine')
  placeMachine(campaign, 'furnace', 'shed', 4, 2, 'furnace-a')!.batchTicks = 4
  placeMachine(campaign, 'dock', 'shed', 7, 2, 'dock')
  connectBelt(campaign, 'mine', 'furnace-a')
  connectBelt(campaign, 'furnace-a', 'dock')
  restartQuest(campaign)
  return campaign
}
export function cloneCampaign(campaign: Campaign): Campaign {
  return structuredClone(campaign)
}
function revision(campaign: Campaign, name: string): ProjectRevision {
  return {
    id: campaign.project.nextRevision++,
    tick: campaign.world.tick,
    name,
    files: { ...campaign.project.working },
  }
}
export function deployProject(campaign: Campaign): ProjectRevision {
  if (typeof campaign.project.working['main.ts'] !== 'string') throw new Error('Project requires main.ts.')
  const entry = revision(campaign, 'Deploy')
  campaign.project.history.push(entry)
  campaign.project.deployed = { ...entry.files }
  return entry
}
export function snapshotProject(campaign: Campaign, name: string): ProjectRevision {
  const entry = revision(campaign, name)
  campaign.project.snapshots.push(entry)
  return entry
}
export function rollbackProject(campaign: Campaign, revisionId: number): boolean {
  const entry = [...campaign.project.history, ...campaign.project.snapshots].find((r) => r.id === revisionId)
  if (!entry || typeof entry.files['main.ts'] !== 'string') return false
  campaign.project.working = { ...entry.files }
  deployProject(campaign).name = 'Restore ' + entry.name
  return true
}
