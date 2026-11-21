import { createProgram, type Program } from '@inherit/sandbox'
import { createWorld, levels, step, type Factory, type Layout, type World } from '@inherit/sim'

export type Request = { kind: 'init'; index: number; layout: Layout; code: string } | { kind: 'step' }
export type Reply =
  | { kind: 'ready' }
  | { kind: 'frame'; world: World; commands: Record<string, string> }
  | { kind: 'error'; message: string }

let stationIds: Set<string>
let world: World
let program: Program
self.onmessage ??= async ({ data }: MessageEvent<Request>) => {
  const send = (reply: Reply) => self.postMessage(reply)
  try {
    if (data.kind === 'init') {
      world = createWorld(levels[data.index], data.layout)
      stationIds = new Set(world.machines.map((m) => m.id))
      program = await createProgram(data.code)
      send({ kind: 'ready' })
    } else {
      const commands: Record<string, string> = Object.create(null)
      step(world, (ctx) => {
        function record<T>(name: string, id: string, result: T, arg?: string): T {
          if (stationIds.has(id)) {
            const argument = arg === undefined ? '' : ', ' + JSON.stringify(arg.slice(0, 48))
            commands[id] = name + '(' + JSON.stringify(id) + argument + ') → ' + result
          }
          return result
        }
        const traced: Factory = {
          tick: ctx.tick,
          dig: (id) => record('dig', id, ctx.dig(id)),
          work: (id) => record('work', id, ctx.work(id)),
          route: (id, target) => record('route', id, ctx.route(id, target), target),
          stock: (id, item) => record('stock', id, ctx.stock(id, item), item),
          space: (id, target) => record('space', id, ctx.space(id, target), target),
        }
        program.onTick(traced)
      })
      send({ kind: 'frame', world, commands })
    }
  } catch (error) {
    send({ kind: 'error', message: error instanceof Error ? error.message : 'Controller stopped.' })
    self.close()
  }
}
