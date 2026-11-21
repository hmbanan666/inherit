import { PRICES } from './prices'
import { letter, newTown } from './town'
import { placeMachine } from './construction'
import type { Campaign, ProjectRevision, Site } from './model'

function sites(): Site[] {
  return [
    {
      id: 'shed',
      name: 'Uncle’s shed',
      plots: [
        { id: 'shed-floor', x: 0, y: 0, width: 8, height: 5, status: 'owned', price: 0 },
        { id: 'east-lot', x: 8, y: 0, width: 6, height: 5, status: 'sale', price: PRICES.plots['east-lot'] },
        {
          id: 'south-lot',
          x: 0,
          y: 5,
          width: 8,
          height: 5,
          status: 'sale',
          price: PRICES.plots['south-lot'],
        },
        {
          id: 'rail-spur',
          x: 8,
          y: 5,
          width: 6,
          height: 5,
          status: 'locked',
          price: PRICES.plots['rail-spur'],
        },
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
export const initialSignals = () => ({
  choseRecipe: false,
  inspectedParcel: false,
  arrival: false,
  idle: false,
  breakdown: false,
  recovered: false,
  confirmed: false,
})
export function createCampaign(seed = 1): Campaign {
  const files = {
    'main.ts':
      'import type { Factory } from "inherit"\n\nexport function onTick(ctx: Factory) {\n  // The shed is yours. So is my tab. — Uncle\n}\n',
  }
  const campaign: Campaign = {
    version: 4,
    town: newTown(),
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
    economy: {
      money: 100,
      reputation: 0,
      research: [],
      orders: [],
      researchPoints: 1,
      orderSeed: seed >>> 0,
      nextOrder: 1,
      road: false,
    },
    progress: { completedQuests: [], completedObjectives: [], messages: [], signals: initialSignals() },
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
  placeMachine(campaign, 'furnace', 'shed', 4, 2, 'furnace')!.batchTicks = 4
  placeMachine(campaign, 'dock', 'shed', 7, 2, 'cart')
  letter(
    campaign,
    'uncle',
    'Uncle',
    'The shed keys',
    'The shed is yours. So is my tab at the bank. Bram will come knocking.',
  )
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
