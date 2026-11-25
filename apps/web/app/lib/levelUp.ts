import type { QuestDef } from '../../../../packages/sim/src/v8/quests'
import { giverName, type GameEvent } from './worldEvents'

export const levelUpLabels = {
  reached: (level: number) => `You reached level ${level}.`,
  keepGoing: (next?: number) => next === undefined ? 'Keep going.' : `Keep going. New work opens at level ${next}.`,
  confirm: 'Got it',
}

export function levelUnlocks(level: number, quests: readonly QuestDef[]) {
  const lines: string[] = []
  let next: number | undefined
  for (const quest of quests) {
    if (quest.needLevel === level) lines.push(`New quest: ${quest.title} from ${giverName(quest)}`)
    if (quest.needLevel > level && (next === undefined || quest.needLevel < next)) next = quest.needLevel
  }
  return { lines, next }
}

export function isLevelEvent(event: GameEvent) {
  return event.kind === 'event' && event.icon === 'level'
}

export function pickLevelUp(events: readonly GameEvent[], seen: Set<string>) {
  let highest: number | undefined
  for (const event of events) {
    if (!isLevelEvent(event) || seen.has(event.key)) continue
    seen.add(event.key)
    const level = Number(event.key.slice('level:'.length))
    highest = Math.max(level, highest ?? level)
  }
  return highest
}

export function visibleLevelUp(level: number | undefined, surfaceOpen: boolean) {
  return surfaceOpen ? undefined : level
}
