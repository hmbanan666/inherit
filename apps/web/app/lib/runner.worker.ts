import { createProgram, runVerb, type Program } from '@inherit/sandbox'
import {
  advanceGame,
  currentLesson,
  runBench,
  benchChecks,
  isStarterProject,
  deployGameProject,
  rollbackGameProject,
  getSurface,
  loadSave,
  townSnapshot,
  payInstallment,
  markMessageRead,
  snapshotProject,
  type Campaign,
  type GameTick,
  type ProjectFiles,
  type GameProgram,
} from '@inherit/sim'
import { commandSites } from './commandSites'
import type { Action, Frame } from './gameProtocol'

let campaign: Campaign
let program: Program | undefined
let sites = commandSites({})
let error = ''
let logs: string[] = []
let cpu = { calls: 0, interrupts: 0, used: 0, budget: 96 }

async function compile(files: ProjectFiles, allowStarter = false) {
  const { budget } = getSurface(campaign)
  const sites = commandSites(files)
  if (allowStarter && isStarterProject(files)) return { program: undefined, sites }
  const program = await createProgram({
    files: sites.compiledFiles,
    memory: campaign.memory,
    budget,
    chapterExports: getSurface(campaign).exports,
  })
  return { program, sites }
}
function install(next: Awaited<ReturnType<typeof compile>>) {
  program?.dispose()
  program = next.program
  error = ''
  // Module-level logs belong to deployment. Only a running tick advances Bram's lesson.
  if (program) logs.push(...program.drainLogs())
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
  }
  try {
    return advanceGame(campaign, traced)
  } catch (e) {
    error = message(e)
  } finally {
    cpu = live.stats
    const printed = sites.drainLogs(live.drainLogs())
    if (printed.length && campaign.town.beat === 1) campaign.progress.signals.printedTick = true
    logs.push(...printed)
  }
  live.dispose()
  program = undefined
}
let checked: { id: string; files: ProjectFiles } | undefined
let bench: Frame['bench']
async function apply(a: Action) {
  switch (a.kind) {
    case 'init':
      campaign = loadSave(a.campaign)
      install(await compile(campaign.project.deployed, true))
      return true
    case 'deploy':
    case 'rollback': {
      const files = a.kind === 'deploy' ? a.files : campaign.project.history.find((r) => r.id === a.id)?.files
      if (!files) return false
      const next = await compile(files, a.kind === 'rollback')
      try {
        if (a.kind === 'deploy') {
          campaign.project.working = files
          deployGameProject(campaign)
        } else if (!rollbackGameProject(campaign, a.id)) throw new Error('Unknown revision.')
      } catch (e) {
        next.program?.dispose()
        throw e
      }
      install(next)
      return true
    }
    case 'bench': {
      const task = currentLesson(campaign)
      checked = undefined
      if (!task?.cases.length || task.id !== a.id) return true
      try {
        const checks = await runBench(task, a.files, (api, args, files) =>
          runVerb(
            {
              files,
              entry: task.file,
              chapterExports: getSurface(campaign).exports,
            },
            task.name,
            api,
            args,
          ),
        )
        bench = { checks }
        if (checks.every((row) => row.state === 'done')) checked = a
      } catch (e) {
        bench = { checks: benchChecks(task), error: message(e) }
      }
      return true
    }
    case 'solve':
      if (
        currentLesson(campaign)?.id === a.id &&
        checked?.id === a.id &&
        JSON.stringify(checked.files) === JSON.stringify(a.files)
      )
        campaign.town.solved.push(a.id)
      checked = undefined
      return true
    case 'pay':
      return payInstallment(campaign, a.inFull)
    case 'snapshot':
      campaign.project.working = a.files
      return snapshotProject(campaign, a.name)
    case 'read':
      return markMessageRead(campaign, a.id)
  }
}
// The host waits for each reply before sending another mutation or tick.
self.onmessage ??= async ({ data }: MessageEvent<Action>) => {
  bench = undefined
  let feedback: GameTick | undefined, notice: string | undefined
  try {
    if (data.kind === 'step') feedback = step()
    else if (!(await apply(data))) notice = 'Could not complete that action.'
  } catch (e) {
    error = data.kind === 'deploy' ? 'Deploy failed · ' + message(e) : message(e)
  }
  // Deploy histories may contain many full projects. Tick frames only carry the live state.
  const { project, seenSections: _seenSections, ...live } = campaign
  const changed = ['init', 'deploy', 'rollback', 'snapshot'].includes(data.kind)
  self.postMessage({
    campaign: live,
    bench,
    town: townSnapshot(campaign),
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
