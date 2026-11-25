import { kettlewick, levelSpan, type World } from '@inherit/sim/v8'
import type { QuestDef } from '../../../../packages/sim/src/v8/quests'
import type { SideTab } from './factoryLayout'
import { named, type questCard } from './questNote'
import type { GameEvent } from './worldEvents'

function clampFraction(value: number) {
  return Math.max(0, Math.min(1, value))
}

export function xpProgress(xp: number) {
  const { level, start, next } = levelSpan(xp)
  if (next === null) return { level, fraction: 1, width: '100%', label: `XP ${xp}`, title: `Level ${level}. ${xp} XP.` }
  const into = xp - start
  const size = next - start
  const fraction = clampFraction(into / size)
  return { level, fraction, width: `${fraction * 100}%`, label: `XP ${into}/${size}`, title: `Level ${level}. ${into} / ${size} XP.` }
}

export function xpRing(fraction: number, radius: number) {
  const circumference = 2 * Math.PI * radius
  return { circumference, dashArray: circumference, dashOffset: circumference * (1 - clampFraction(fraction)) }
}

export function welcomeToast(world: Pick<World, 'questId' | 'cleared'>, step: string): GameEvent | undefined {
  if (world.questId || world.cleared.length || !step.startsWith('Talk to ')) return
  return { kind: 'event', key: 'welcome', icon: 'talk', text: `${step}. Click the gold ! next to the house.` }
}

export const questTabHint = 'Go and talk to a villager with a gold ! over their head.'

export const shellLabels = {
  pane: { quest: 'Quest', tests: 'Quest tests', console: 'Console' },
  sideTabs: 'Quest, tests and console',
  seeTests: 'See Tests',
  level: (level: number) => `Level ${level}`,
}

export function questTabNotice(side: SideTab, ready: boolean) {
  if (ready && side !== 'quest') return 'Quest, ready to hand over'
}

export const portraits = new Map(kettlewick.questList?.map(({ who, from, role, building }) => [
  who, { id: who, name: from, role, buildingId: building, mood: 'waiting' as const },
]))

type Card = NonNullable<ReturnType<typeof questCard>>

export function questObjectives(card: Card) {
  const lines = card.lines?.length ? card.lines : [card]
  return lines.map(({ item, qty, shipped }) => {
    const received = Math.max(0, Math.min(shipped, qty))
    return { id: item, text: `Deliver ${named(item, qty)}`, count: `${received}/${qty}`, done: received === qty }
  })
}

export function questLog(quest?: QuestDef, card?: Card) {
  if (!quest || !card) return []
  return [{
    id: quest.id, who: quest.who, name: card.from.replace(/^Mayor /, ''), role: quest.role,
    title: card.title, quote: quest.quote, goal: card.goal, objectives: questObjectives(card),
    ready: card.ready, expanded: true,
  }]
}
