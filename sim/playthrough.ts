import { createSession } from '../packages/sandbox/src/v8'
import {
  canTake, factoryBricks, functionUnlocked, kettlewick, machineList, nextQuest, noteCheckReset,
  questList, shopFor, triggerDocs, triggerUnlocked, type World,
} from '../packages/sim/src/v8'
import { balance } from './config'
import { act, buyForGoal, edits, players, type Stage } from './policy'

export const minutes = (ticks: number) => ticks * kettlewick.tickMs / 60_000
const ready = (world: World) => !!world.questId && world.checks.every(row => row.status === 'green')
const state = (world: World) => ({ tick: world.tick, credits: world.credits, xp: world.xp, level: world.level })
type State = ReturnType<typeof state>
type EventData =
  | { kind: 'start'; detail: string; eligible: string[] }
  | { kind: 'finish' | 'progress'; detail: string }
  | { kind: 'unlock'; detail: string; listing?: { id: string; price: number } }
  | { kind: 'purchase'; detail: string; price: number }
  | { kind: 'code change'; from: Stage; to: Stage; detail: string }

export type Event = State & EventData & { quest?: string }
export interface QuestRun {
  id: string
  start: State
  finish: State
  stage: Stage
}
export interface Run {
  events: Event[]
  quests: QuestRun[]
  cleared: string[]
  probes: Probe[]
}

const bricks = factoryBricks(kettlewick)
function capabilities(world: World) {
  return [
    ...bricks.filter(b => functionUnlocked(world, b.name)).map(b => ({ detail: b.name })),
    ...triggerDocs.filter(t => triggerUnlocked(world, t.id)).map(t => ({ detail: t.name })),
    ...machineList(world).map(machine => ({ detail: 'Machine · ' + machine.id })),
    ...shopFor(world).map(item => ({ detail: 'Shop · ' + item.name, listing: { id: item.id, price: item.price } })),
  ]
}

interface Probe {
  quest: string
  stage: Stage
  ticks: number
  clears: boolean
  remaining: string[]
}

async function tryPrevious(world: World, quest: string, stage: Stage): Promise<Probe> {
  const replay = await createSession(kettlewick, players[stage], world)
  try {
    while (!ready(replay.world) && minutes(replay.world.tick - world.tick) < balance.previousPlayerMinutes) {
      act(replay, stage)
      replay.step(1)
      if (!ready(replay.world)) buyForGoal(replay)
    }
    const remaining = replay.world.checks.filter(c => c.status !== 'green').map(c => c.text)
    return { quest, stage, ticks: replay.world.tick - world.tick, clears: replay.complete(), remaining }
  } finally { replay.dispose() }
}

export async function playthrough(): Promise<Run> {
  const session = await createSession(kettlewick, kettlewick.files, undefined, { fresh: true })
  const { world } = session
  const events: Event[] = []
  const quests: QuestRun[] = []
  const probes: Probe[] = []
  let stage: Stage = 'manual'
  let quest: string | undefined
  const record = (event: EventData) => events.push({ ...state(world), quest, ...event })
  const seen = new Set<string>()
  function unlocks() {
    for (const cap of capabilities(world)) {
      if (seen.has(cap.detail)) continue
      seen.add(cap.detail)
      record({ kind: 'unlock', ...cap })
    }
  }
  function purchase() {
    const item = buyForGoal(session)
    if (!item) return
    record({ kind: 'purchase', detail: item.name, price: item.price })
  }

  try {
    unlocks()
    while (world.cleared.length < questList.length) {
      const eligible = questList.filter(q => canTake(world, q)).map(q => q.id)
      const offer = nextQuest(world, kettlewick)
      if (!offer || !session.accept(offer.id))
        throw new Error(`No Take at tick ${world.tick}, level ${world.level}. Cleared: ${world.cleared.join(', ')}`)
      quest = offer.id
      const start = state(world)
      record({ kind: 'start', detail: offer.title, eligible })
      unlocks()
      purchase()
      const edit = edits[quest]
      if (edit && edit.to !== stage) {
        const probe = await tryPrevious(world, quest, stage)
        probes.push(probe)
        if (!probe.clears || edit.practice) {
          await session.deploy(players[edit.to])
          noteCheckReset(world)
          record({ kind: 'code change', from: stage, to: edit.to, detail: edit.reason })
          stage = edit.to
        }
      }
      const order = world.orders.find(item => item.id === quest)!
      let delivered = order.shipped
      const passed = new Set(world.checks.filter(c => c.status === 'green').map(c => c.id))
      while (!ready(world)) {
        if (minutes(world.tick) >= balance.maxRunMinutes)
          throw new Error(`Run limit at tick ${world.tick} on ${quest} (${stage}). Delivered ${delivered}/${order.qty}. ${world.status}`)
        act(session, stage)
        session.step(1)
        const error = world.console.find(line => line.level === 'error' && line.tick === world.tick)
        if (error) throw new Error(`${quest} at tick ${world.tick} (${stage}): ${error.text}`)
        const green = world.checks.filter(c => c.status === 'green' && !passed.has(c.id))
        if (green.length || delivered < order.shipped) {
          green.forEach(c => passed.add(c.id))
          delivered = order.shipped
          record({ kind: 'progress', detail: [`${delivered}/${order.qty}`, ...green.map(c => c.text)].join(' · ') })
        }
        unlocks()
        if (!ready(world)) purchase()
      }
      if (!session.complete() || !world.cleared.includes(quest)) throw new Error(`Hand-over refused for ${quest} at tick ${world.tick}`)
      record({ kind: 'finish', detail: offer.title })
      unlocks()
      quests.push({ id: quest, start, finish: state(world), stage })
    }
    return { events, quests, probes, cleared: [...world.cleared] }
  } finally { session.dispose() }
}
