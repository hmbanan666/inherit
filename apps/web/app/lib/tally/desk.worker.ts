import { runDesk } from './run'
import type { DeskAction } from '@inherit/sim/tally-desk'

self.onmessage = async ({ data }: MessageEvent<{ source: string; actions: DeskAction[] }>) => {
  try {
    self.postMessage({ result: await runDesk(data.source, data.actions) })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Experiment failed.' })
  }
}
