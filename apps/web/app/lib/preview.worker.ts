import { createProgram, sandboxDeclarations, runProjectTests, type PlayerTestResult } from '@inherit/sandbox'
import { commandSites } from './commandSites'
import { getSurface, type Campaign } from '@inherit/sim'
import { previewProject, type PreviewResult, type PreviewTicks } from './devtools/preview'

export type BenchRequest =
  | { kind: 'declarations' }
  | { kind: 'preview'; campaign: Campaign; ticks: PreviewTicks }
  | { kind: 'tests'; campaign: Campaign }

export type BenchReply =
  | { kind: 'declarations'; text: string }
  | { kind: 'preview'; result: PreviewResult }
  | { kind: 'tests'; result: PlayerTestResult[] }
  | { kind: 'error'; message: string }

self.onmessage = async ({ data }: MessageEvent<BenchRequest>) => {
  const send = (reply: BenchReply) => self.postMessage(reply)
  try {
    if (data.kind === 'declarations') send({ kind: 'declarations', text: sandboxDeclarations })
    else if (data.kind === 'preview') {
      const result = await previewProject(data.campaign, data.ticks, (options) =>
        createProgram({ ...options, files: commandSites(options.files).compiledFiles }),
      )
      send({ kind: 'preview', result })
    } else {
      const { budget, events } = getSurface(data.campaign)
      send({
        kind: 'tests',
        result: await runProjectTests({
          files: data.campaign.project.working,
          memory: data.campaign.memory,
          budget,
          unlockedEvents: events,
        }),
      })
    }
  } catch (error) {
    send({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}
