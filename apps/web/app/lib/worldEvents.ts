import type { World } from '@inherit/sim/v8'
import type { QuestDef } from '../../../../packages/sim/src/v8/quests'
import type { questCard } from './questNote'
import { grantHint } from './questStep'

export const dismissToastLabel = 'Dismiss notification'
const giverName = (quest: QuestDef) => quest.from.replace(/^Mayor /, '')
const newCall = (signature: string) => 'New: ' + signature.split(':')[0].trim()
const readyLine = (name: string) => 'Ready to hand over to ' + name
const rewardLine = (credits: number, xp: number) => `+${credits} credits · +${xp} XP`
const levelLine = (level: number) => 'Level ' + level
const installed = (name: string) => name + ' installed'
const joined = (name: string) => name + ' joined the works'
const bought = (name: string) => 'Bought ' + name
const machines = [
  ['press', 'Press'], ['lathe', 'Lathe'], ['bench', 'Assembly table'], ['spare', 'Spare press'],
] as const

export type WorldView = Pick<World, 'questId' | 'cleared' | 'bought' | 'level' | 'credits' | 'xp' |
  'drones' | 'press' | 'lathe' | 'bench' | 'spare' | 'tick'>
export type Row = NonNullable<ReturnType<typeof questCard>>['tests'][number]
type EventIcon = 'check' | 'coins' | 'level' | 'unlock' | 'machine' | 'drone' | 'ready'
export type GameEvent =
  | { kind: 'npc'; who: QuestDef['who']; name: string; text: string; key: string }
  | { kind: 'event'; icon: EventIcon; text: string; key: string }

function allPassing(rows: readonly Row[]) {
  return rows.length > 0 && rows.every(row => row.state === 'passing')
}

export function worldEvents(
  prev: WorldView | undefined,
  next: WorldView,
  quests: readonly QuestDef[],
  catalog: readonly { id: string; name: string }[],
  tests?: { prev: readonly Row[]; next: readonly Row[] },
): GameEvent[] {
  if (!prev || next.tick < prev.tick) return []
  const events: GameEvent[] = []
  function announce(icon: EventIcon, key: string, text: string) {
    events.push({ kind: 'event', icon, key, text })
  }
  function say(quest: QuestDef, key: string, text: string) {
    events.push({ kind: 'npc', who: quest.who, name: giverName(quest), key, text })
  }

  const quest = quests.find(item => item.id === next.questId)
  if (quest && quest.id !== prev.questId) {
    say(quest, 'taken:' + quest.id, quest.why)
    if (quest.unlock) announce('unlock', 'unlocked:' + quest.id, newCall(quest.unlock.signature))
  }

  if (quest && tests) {
    const before = prev.questId === quest.id ? tests.prev : []
    const changed = tests.next.filter(row => row.state !== before.find(old => old.id === row.id)?.state)
    for (const row of changed) {
      if (row.state === 'passing') announce('check', `passed:${quest.id}:${row.id}`, row.text)
    }
    for (const row of changed) {
      if (row.state === 'failed' && row.reason) say(quest, `stuck:${quest.id}:${row.id}:${row.reason}`, row.reason)
    }
    if (allPassing(tests.next) && !allPassing(before)) {
      announce('ready', 'ready:' + quest.id, readyLine(giverName(quest)))
    }
  }

  const handed = quests.filter(item => next.cleared.includes(item.id) && !prev.cleared.includes(item.id))
  for (const item of handed) {
    announce('coins', 'handed:' + item.id, rewardLine(item.pay, item.xp))
    say(item, 'change:' + item.id, item.change)
  }
  if (next.level > prev.level) announce('level', 'level:' + next.level, levelLine(next.level))
  for (const item of handed) {
    const hint = grantHint(item.trigger)
    if (hint) announce('unlock', 'trigger:' + item.id, hint)
  }
  for (const [id, name] of machines) {
    if (!prev[id] && next[id]) announce('machine', 'machine:' + id, installed(name))
  }
  if (next.drones.length > prev.drones.length) {
    const drone = next.drones.at(-1)!
    announce('drone', 'drone:' + drone.name, joined(drone.name))
  }
  for (const id of next.bought) {
    if (prev.bought.includes(id)) continue
    const item = catalog.find(item => item.id === id)
    if (item) announce('coins', 'bought:' + id, bought(item.name))
  }
  return events
}
