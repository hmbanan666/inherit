import {
  deployProject, rollbackProject, townSnapshot, payInstallment, markMessageRead, snapshotProject,
  type Campaign, type ProjectFiles,
} from '@inherit/sim'
import { compileController, continueStep, idleTick, primaryButton, type CallRecord } from './lesson-flow'
import type { Action, Frame } from './gameProtocol'

let campaign: Campaign
type Controller = Awaited<ReturnType<typeof compileController>>
let live: Controller | undefined
let error = ''
let calls: CallRecord[] = []
let logs: string[] = []
let feedback: Frame['feedback']
let traces: Frame['traces'] = {}
async function install(files: ProjectFiles, resume: boolean) {
  const starter = campaign.project.history[0]?.files
  const idle = resume && JSON.stringify(files) === JSON.stringify(starter)
  const next = idle ? undefined : await compileController(campaign, files, resume ? 'resume' : 'deploy')
  live?.dispose()
  live = next
  calls = next?.initialCalls ?? []
  logs = next?.drainLogs() ?? []
  traces = next?.traces ?? {}
  error = ''
}
function execute(controller: Controller | undefined, mode: 'watched' | 'once' | 'tick' = 'tick') {
  if (!controller) {
    feedback = idleTick(campaign)
    return
  }
  try {
    const result = controller.step(campaign, mode)
    calls = result.calls
    feedback = result.feedback
    if (result.error) throw new Error(result.error)
  } finally {
    logs.push(...controller.drainLogs())
    traces = controller.traces
  }
}
async function apply(action: Action) {
  switch (action.kind) {
    case 'init':
      campaign = action.campaign
      await install(campaign.project.deployed, true)
      break
    case 'run': {
      error = ''
      const watched = primaryButton(campaign) === 'run'
      const once = await compileController(campaign, action.files, watched ? 'watched' : 'once')
      try { execute(once, watched ? 'watched' : 'once') } finally { once.dispose() }
      break
    }
    case 'step':
      try { execute(live) } catch (e) {
        live?.dispose()
        live = undefined
        throw e
      }
      break
    case 'continue':
      campaign = continueStep(campaign)
      break
    case 'deploy':
      await install(action.files, false)
      campaign.project.working = action.files
      deployProject(campaign)
      break
    case 'rollback': {
      const revision = campaign.project.history.find(r => r.id === action.id)
      if (revision) {
        await install(revision.files, true)
        rollbackProject(campaign, action.id)
      }
      break
    }
    case 'pay':
      payInstallment(campaign, action.inFull)
      break
    case 'snapshot':
      campaign.project.working = action.files
      snapshotProject(campaign, action.name)
      break
    case 'read':
      markMessageRead(campaign, action.id)
  }
}
self.onmessage ??= async ({ data }: MessageEvent<Action>) => {
  calls = []
  feedback = undefined
  logs = []
  try { await apply(data) } catch (e) { error = e instanceof Error ? e.message : 'Controller stopped.' }
  const { project, seenSections: _seenSections, ...state } = campaign
  self.postMessage({
    campaign: state, calls, town: townSnapshot(campaign),
    project: ['init', 'deploy', 'rollback', 'snapshot', 'continue'].includes(data.kind) ? project : undefined,
    active: !!live, feedback, error, logs, traces,
    cpu: live?.stats() ?? { calls: 0, interrupts: 0, used: 0, budget: 1024 },
  } satisfies Frame)
}
