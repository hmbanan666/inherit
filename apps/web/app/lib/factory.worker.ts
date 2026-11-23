import { clearConsole, kettlewick, noteCheckReset } from '@inherit/sim/v8'
import { createSession } from '@inherit/sandbox/v8'
import type { FactoryCommand, FactoryFrame } from './factoryProtocol'

let session: Awaited<ReturnType<typeof createSession>> | undefined
let timer: ReturnType<typeof setInterval> | undefined

function publish(deployed?: Record<string, string>) {
  if (!session) return
  const world = session.world
  world.console ??= []
  world.depot.coal ??= 0
  if (world.messages.length > 20) world.messages.splice(0, world.messages.length - 20)
  self.postMessage({ world, deployed } satisfies FactoryFrame)
}

function schedule() {
  clearInterval(timer)
  if (!session) return
  // The works keep ticking when the tab is hidden. A later server owns this clock.
  timer = setInterval(() => {
    session!.step(1)
    publish()
  }, kettlewick.tickMs)
}

async function act(command: FactoryCommand) {
  if (command.kind === 'visibility') {
    return
  } else {
    clearInterval(timer)
    try {
      if (command.kind === 'restart') {
        const fresh = await createSession(kettlewick, command.files, command.saved)
        session?.dispose()
        session = fresh
        publish(command.files)
      } else if (command.kind === 'run') {
        await session!.deploy(command.files)
        noteCheckReset(session!.world)
        publish(command.files)
      } else if (command.kind === 'accept') {
        session!.accept(command.id)
        publish()
      } else if (command.kind === 'complete') {
        session!.complete()
        publish()
      } else if (command.kind === 'buy') {
        session!.buy(command.id)
        publish()
      } else if (command.kind === 'dump') {
        session!.dump(command.name)
        publish()
      } else if (command.kind === 'clear-console') {
        clearConsole(session!.world)
        publish()
      }
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
