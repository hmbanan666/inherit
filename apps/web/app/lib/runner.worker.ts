import { createProgram, type Program } from '@inherit/sandbox'
import { createWorld, levels, step, type Layout, type World } from '@inherit/sim'

export type Request = { kind: 'init'; index: number; layout: Layout; code: string } | { kind: 'step' }
export type Reply = { kind: 'ready' } | { kind: 'frame'; world: World } | { kind: 'error'; message: string }

let world: World
let program: Program
self.onmessage = async ({ data }: MessageEvent<Request>) => {
  const send = (reply: Reply) => self.postMessage(reply)
  try {
    if (data.kind === 'init') {
      world = createWorld(levels[data.index], data.layout)
      program = await createProgram(data.code)
      send({ kind: 'ready' })
    } else {
      step(world, program.onTick)
      send({ kind: 'frame', world })
    }
  } catch (error) {
    send({ kind: 'error', message: error instanceof Error ? error.message : 'Controller stopped.' })
    self.close()
  }
}
