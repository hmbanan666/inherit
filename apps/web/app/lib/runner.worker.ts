import { createProgram, type Program } from '@inherit/sandbox'
import {
  acceptOrder, advanceGame, deployGameProject, getSurface, markMessageRead,
  purchaseBelt, purchaseMachine, purchasePlot, purchaseRoad, research, retryObjective,
  rollbackGameProject, sellBelt, sellMachine, snapshotProject,
  type Campaign, type GameTick, type ProjectFiles, type GameProgram,
} from '@inherit/sim'
import { commandSites } from './commandSites'
import type { Action, Frame } from './gameProtocol'

let campaign: Campaign
let program: Program | undefined
let sites = commandSites({})
let error = ''
let logs: string[] = []
let cpu = { calls: 0, interrupts: 0, used: 0, budget: 96 }

async function compile(files: ProjectFiles) {
  const { budget, events } = getSurface(campaign)
  return createProgram({ files, memory: campaign.memory, budget, unlockedEvents: events })
}
function install(next: Program, files: ProjectFiles) {
  program?.dispose()
  program = next
  error = ''
  sites = commandSites(files)
  cpu = { calls: 0, interrupts: 0, used: 0, budget: getSurface(campaign).budget }
}
const message = (e: unknown) => e instanceof Error ? e.message : 'Controller stopped.'
function step(): GameTick | undefined {
  const live = program
  if (!live) return advanceGame(campaign, () => {})
  const traced: GameProgram = {
    onTick: ctx => live.onTick(sites.wrap(ctx)),
    deliverEvent: (name, event, ctx) => live.deliverEvent(name, event, sites.wrap(ctx)),
    exportMemory: () => live.exportMemory(),
  }
  try {
    return advanceGame(campaign, traced)
  } catch (e) {
    error = message(e)
  } finally {
    cpu = live.stats
    logs.push(...live.drainLogs())
  }
  live.dispose()
  program = undefined
}
async function apply(a: Action) {
  switch (a.kind) {
    case 'init':
      campaign = a.campaign
      install(await compile(campaign.project.deployed), campaign.project.deployed)
      return true
    case 'deploy':
    case 'rollback': {
      const files = a.kind === 'deploy' ? a.files : campaign.project.history.find(r => r.id === a.id)?.files
      if (!files) return false
      const next = await compile(files)
      try {
        if (a.kind === 'deploy') {
          campaign.project.working = files
          deployGameProject(campaign)
        } else if (!rollbackGameProject(campaign, a.id)) throw new Error('Unknown revision.')
      } catch (e) {
        next.dispose()
        throw e
      }
      install(next, files)
      return true
    }
    case 'research': {
      const before = getSurface(campaign)
      if (!research(campaign, a.id)) return false
      const after = getSurface(campaign)
      if (before.budget !== after.budget || before.events.length !== after.events.length)
        install(await compile(campaign.project.deployed), campaign.project.deployed)
      return true
    }
    case 'snapshot':
      campaign.project.working = a.files
      return snapshotProject(campaign, a.name)
    case 'machine': return purchaseMachine(campaign, a.machine, a.site, a.x, a.y)
    case 'plot': return purchasePlot(campaign, a.site, a.id)
    case 'road': return purchaseRoad(campaign)
    case 'belt': return purchaseBelt(campaign, a.from, a.to)
    case 'sellBelt': return sellBelt(campaign, a.from, a.to)
    case 'sellMachine': return sellMachine(campaign, a.id)
    case 'read': return markMessageRead(campaign, a.id)
    case 'accept': return acceptOrder(campaign, a.id)
    case 'retry': return retryObjective(campaign)
  }
}
// The host waits for each reply before sending another mutation or tick.
self.onmessage ??= async ({ data }: MessageEvent<Action>) => {
  let feedback: GameTick | undefined, notice: string | undefined
  try {
    if (data.kind === 'step') feedback = step()
    else if (!await apply(data)) notice = 'Could not complete that action.'
  } catch (e) {
    error = message(e)
  }
  self.postMessage({ campaign, feedback, notice, error, logs, cpu, traces: sites.traces } satisfies Frame)
  logs = []
}
