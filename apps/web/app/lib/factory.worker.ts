import { continueWithLoan, kettlewick } from '@inherit/sim/v8'
import { createSession } from '@inherit/sandbox/v8'
import type { FactoryCommand, FactoryFrame } from './factoryProtocol'

let session: Awaited<ReturnType<typeof createSession>> | undefined
let timer: ReturnType<typeof setInterval> | undefined
let paused = true
let speed = kettlewick.speeds[0]

function publish(deployed?: Record<string, string>) {
  if (!session) return
  const world = session.world
  if (world.messages.length > 20) world.messages.splice(0, world.messages.length - 20)
  self.postMessage({ world, deployed } satisfies FactoryFrame)
}

function schedule() {
  clearInterval(timer)
  if (session && !session.world.bankrupt && !paused) {
    timer = setInterval(() => {
      session!.step(1)
      if (session!.world.bankrupt) clearInterval(timer)
      publish()
    }, kettlewick.tickMs / speed)
  }
}

async function act(command: FactoryCommand) {
  if (command.kind === 'clock') {
    paused = command.paused
    speed = command.speed
  } else if (command.kind === 'continue') {
    if (session) continueWithLoan(session.world, kettlewick)
    publish()
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
