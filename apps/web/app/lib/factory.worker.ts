import { kettlewick } from '@inherit/sim/v8'
import { createSession } from '@inherit/sandbox/v8'
import type { FactoryCommand, FactoryFrame } from './factoryProtocol'

let session: Awaited<ReturnType<typeof createSession>> | undefined
let timer: ReturnType<typeof setInterval> | undefined
let visible = false

function publish(deployed?: Record<string, string>) {
  if (!session) return
  const world = session.world
  if (world.messages.length > 20) world.messages.splice(0, world.messages.length - 20)
  self.postMessage({ world, deployed } satisfies FactoryFrame)
}

function schedule() {
  clearInterval(timer)
  if (session && visible) {
    timer = setInterval(() => {
      session!.step(1)
      publish()
    }, kettlewick.tickMs)
  }
}

async function act(command: FactoryCommand) {
  if (command.kind === 'visibility') {
    visible = command.visible
  } else {
    clearInterval(timer)
    try {
      if (command.kind === 'restart') {
        const fresh = await createSession(kettlewick, command.files, command.saved)
        session?.dispose()
        session = fresh
      } else {
        await session!.deploy(command.files)
      }
      publish(command.files)
    } catch (error) {
      self.postMessage({ error: error instanceof Error ? error.message : String(error) } satisfies FactoryFrame)
    }
  }
  schedule()
}

let pending = Promise.resolve()
self.onmessage = ({ data }: MessageEvent<FactoryCommand>) => {
  pending = pending.then(() => act(data))
}
