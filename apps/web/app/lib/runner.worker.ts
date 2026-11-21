import { createProgram, type Program } from '@inherit/sandbox'
import {
  OBJECTIVES,
  referenceActions,
  acceptOrder,
  advanceGame,
  deployGameProject,
  getSurface,
  markMessageRead,
  purchaseBelt,
  purchaseMachine,
  purchasePlot,
  purchaseRoad,
  research,
  retryObjective,
  rollbackGameProject,
  sellBelt,
  sellMachine,
  snapshotProject,
  type Campaign,
  type GameTick,
  type ProjectFiles,
  type GameProgram,
  type MachineKind,
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
  const sites = commandSites(files)
  const program = await createProgram({
    files: sites.compiledFiles,
    memory: campaign.memory,
    budget,
    unlockedEvents: events,
  })
  return { program, sites }
}
function install(next: Awaited<ReturnType<typeof compile>>) {
  program?.dispose()
  program = next.program
  error = ''
  sites = next.sites
  cpu = { calls: 0, interrupts: 0, used: 0, budget: getSurface(campaign).budget }
}
const message = (e: unknown) => (e instanceof Error ? e.message : 'Controller stopped.')
function step(): GameTick | undefined {
  const live = program
  if (!live) {
    cpu = { ...cpu, used: 0, calls: 0, interrupts: 0 }
    return advanceGame(campaign, () => {})
  }
  const machines = new Set(campaign.world.machines.map((m) => m.id))
  const traced: GameProgram = {
    onTick: (ctx) => live.onTick(sites.wrap(ctx, live.drainLogs, machines)),
    deliverEvent: (name, event, ctx) =>
      live.deliverEvent(name, event, sites.wrap(ctx, live.drainLogs, machines)),
    exportMemory: () => live.exportMemory(),
  }
  try {
    return advanceGame(campaign, traced)
  } catch (e) {
    error = message(e)
  } finally {
    cpu = live.stats
    logs.push(...sites.drainLogs(live.drainLogs()))
  }
  live.dispose()
  program = undefined
}
// The notebook examples use these equipment IDs. Prefer their names on matching
// deposits and sites, even when the player lays out a different floor.
function machineName(kind: MachineKind, site: string, x: number, y: number) {
  const deposits = campaign.world.sites.find((s) => s.id === site)?.deposits
  const seam = (x: number, y: number) => deposits?.find((d) => d.x === x && d.y === y)?.kind
  const names = OBJECTIVES.flatMap((o) => referenceActions(o.id)).filter(
    (a) =>
      a[0] === 'machine' &&
      a[1] === kind &&
      a[2] === site &&
      (kind !== 'miner' || seam(a[3], a[4]) === seam(x, y)) &&
      !campaign.world.machines.some((m) => m.id === a[5]),
  )
  const match = names.find((a) => a[0] === 'machine' && a[3] === x && a[4] === y) ?? names[0]
  return match?.[0] === 'machine' ? match[5] : undefined
}
async function apply(a: Action) {
  switch (a.kind) {
    case 'init':
      campaign = a.campaign
      install(await compile(campaign.project.deployed))
      return true
    case 'deploy':
    case 'rollback': {
      const files = a.kind === 'deploy' ? a.files : campaign.project.history.find((r) => r.id === a.id)?.files
      if (!files) return false
      const next = await compile(files)
      try {
        if (a.kind === 'deploy') {
          campaign.project.working = files
          deployGameProject(campaign)
        } else if (!rollbackGameProject(campaign, a.id)) throw new Error('Unknown revision.')
      } catch (e) {
        next.program.dispose()
        throw e
      }
      install(next)
      return true
    }
    case 'research': {
      const before = getSurface(campaign)
      if (!research(campaign, a.id)) return false
      const after = getSurface(campaign)
      if (before.budget !== after.budget || before.events.length !== after.events.length)
        install(await compile(campaign.project.deployed))
      return true
    }
    case 'snapshot':
      campaign.project.working = a.files
      return snapshotProject(campaign, a.name)
    case 'machine':
      return purchaseMachine(campaign, a.machine, a.site, a.x, a.y, machineName(a.machine, a.site, a.x, a.y))
    case 'plot':
      return purchasePlot(campaign, a.site, a.id)
    case 'road':
      return purchaseRoad(campaign)
    case 'belt':
      return purchaseBelt(campaign, a.from, a.to)
    case 'sellBelt':
      return sellBelt(campaign, a.from, a.to)
    case 'sellMachine': {
      const sold = sellMachine(campaign, a.id)
      if (sold) delete sites.traces[a.id]
      return sold
    }
    case 'read':
      return markMessageRead(campaign, a.id)
    case 'accept':
      return acceptOrder(campaign, a.id)
    case 'retry':
      return retryObjective(campaign)
  }
}
// The host waits for each reply before sending another mutation or tick.
self.onmessage ??= async ({ data }: MessageEvent<Action>) => {
  let feedback: GameTick | undefined, notice: string | undefined
  try {
    if (data.kind === 'step') feedback = step()
    else if (!(await apply(data))) notice = 'Could not complete that action.'
  } catch (e) {
    error = message(e)
  }
  // Deploy histories may contain many full projects. Tick frames only carry the live state.
  const { project, ...live } = campaign
  const changed = ['init', 'deploy', 'rollback', 'snapshot'].includes(data.kind)
  self.postMessage({
    campaign: live,
    project: changed ? project : undefined,
    active: !!program,
    feedback,
    notice,
    error,
    logs,
    cpu,
    traces: sites.traces,
  } satisfies Frame)
  logs = []
}
