import { startChapter, type Program } from '@inherit/sandbox'
import {
  advanceGame,
  ChapterRunError,
  rollbackGameProject,
  continueStep,
  isStarterProject,
  getSurface,
  loadSave,
  townSnapshot,
  payInstallment,
  markMessageRead,
  snapshotProject,
  type CallRecord,
  type Campaign,
  type GameTick,
} from '@inherit/sim'
import type { Action, Frame } from './gameProtocol'

let campaign: Campaign
let program: Program | undefined
let traces: Frame['traces'] = Object.create(null)
let error = ''

self.onmessage ??= async ({
  data,
}: MessageEvent<Action | { type: 'run'; files?: Campaign['project']['working'] }>) => {
  const action: Action = 'type' in data ? { kind: 'run', files: data.files } : data
  let calls: CallRecord[] = [],
    logs: string[] = [],
    feedback: GameTick | undefined,
    notice: string | undefined
  try {
    switch (action.kind) {
      case 'init':
        campaign = loadSave(action.campaign)
        program?.dispose()
        program = undefined
        if (!isStarterProject(campaign.project.deployed))
          program = (await startChapter(campaign, campaign.project.deployed, 'resume')).program
        error = ''
        break
      case 'step':
        feedback = advanceGame(campaign, program, program?.drainLogs)
        calls = feedback.calls
        logs = feedback.logs
        break
      case 'run':
      case 'deploy':
      case 'rollback': {
        const files =
          action.kind === 'rollback'
            ? campaign.project.history.find((r) => r.id === action.id)?.files
            : (action.files ?? campaign.project.working)
        if (!files) throw new Error('Unknown revision.')
        if (action.kind === 'rollback' && isStarterProject(files)) {
          rollbackGameProject(campaign, action.id)
          program?.dispose()
          program = undefined
          traces = Object.create(null)
          error = ''
          break
        }
        const next = await startChapter(campaign, files, action.kind === 'run' ? 'run' : 'deploy')
        if (action.kind !== 'run') {
          program?.dispose()
          program = next.program
          traces = Object.create(null)
          if (action.kind === 'rollback') campaign.project.history.at(-1)!.name = 'Restore #' + action.id
        }
        calls = next.calls
        logs = next.logs
        error = ''
        break
      }
      case 'continue':
        campaign = continueStep(campaign)
        break
      case 'pay':
        if (!payInstallment(campaign, action.inFull)) notice = 'The payment could not be made.'
        break
      case 'snapshot':
        campaign.project.working = action.files
        snapshotProject(campaign, action.name)
        break
      case 'read':
        markMessageRead(campaign, action.id)
        break
    }
  } catch (e) {
    if (e instanceof ChapterRunError) {
      calls = e.calls
      logs = e.logs
    }
    error =
      (action.kind === 'deploy' ? 'Deploy failed · ' : '') +
      (e instanceof Error ? e.message : 'Controller stopped.')
    if (action.kind === 'step') {
      program?.dispose()
      program = undefined
    }
  }
  for (const call of calls) {
    const id = call.fn === 'buy' ? (call.args[1] ?? call.args[0]) : call.args[0]
    if (!campaign.world.machines.some((m) => m.id === id)) continue
    const sites = (traces[id] ??= [])
    const fn = call.within ?? '(module)'
    if (!sites.some((s) => s.file === call.file && s.line === call.line && s.fn === fn))
      sites.push({ file: call.file, line: call.line, fn })
  }
  const { project, seenSections: _seenSections, ...live } = campaign
  self.postMessage({
    campaign: live,
    town: townSnapshot(campaign),
    active: !!program,
    calls,
    logs,
    error,
    notice,
    traces,
    feedback,
    project: ['init', 'run', 'deploy', 'rollback', 'snapshot'].includes(action.kind) ? project : undefined,
    cpu: program?.stats ?? {
      calls: calls.length,
      interrupts: 0,
      used: calls.length,
      budget: getSurface(campaign).budget,
    },
  } satisfies Frame)
}
