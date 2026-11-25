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
  if (next === null) return { level, fraction: 1, width: '100%', label: 'Max level', title: `Level ${level} · Max level · ${xp} XP` }
  const into = xp - start
  const size = next - start
  const fraction = clampFraction(into / size)
  const label = `${xp} / ${next} XP`
  return { level, fraction, width: `${fraction * 100}%`, label, title: `Level ${level} · ${label}` }
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
  codeJob: 'This job is done in code.',
  codeExample: '// Example: if (!drone.busy) drone.unload(depot)',
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

/**
 * The Quest tab goal in plain words. Quest text stays as written in quests.ts; code words move to a hint
 * under the next step. An old saved contract keeps its own goal.
 */
const questGoals: Record<string, { goal: string; hint?: string; codeJob?: true }> = {
  bram: { goal: 'Smelt an ingot and bring it to Bram.', hint: 'The batch has to be started by smeltOnce in your code.' },
  ines: {
    codeJob: true, goal: 'Write code to mine vein D and unload 3 ore at the depot.',
    hint: 'The Unload button only goes to the furnace. Use drone.unload(depot) in your code.',
  },
  odile: { goal: 'Smelt 2 steel and bring it to Odile.' },
  elsie: { goal: 'Press 2 grates and bring them to Elsie. Both carts have to haul.' },
  harrow: { goal: 'Make a plate and a blank and bring them to Harrow.' },
  tomas: { goal: 'Cut 2 gears on the lathe and bring them to Tomas.' },
  pell: { goal: 'Make 2 hinges and bring them to Pell.' },
  wen: { goal: 'Make 2 folding shutters and bring them to Wen.' },
  crew: { goal: 'Pack a winch crate, then a lamp crate, and hand both to Odile.' },
}

export function isCodeJob(questId: string) {
  return questGoals[questId]?.codeJob === true
}

export function hintParts(text: string) {
  const tokens = text.split(/([a-z]\w*\.\w+\([^)]*\)|\b[a-z]+[A-Z]\w*\b)/)
  return tokens.map((text, index) => ({ text, code: index % 2 === 1 })).filter(part => part.text.length > 0)
}

export function questGoal(quest: QuestDef, card: Pick<Card, 'goal'>) {
  const human = questGoals[quest.id]
  if (!human || card.goal !== quest.goal) return { goal: card.goal, hint: undefined }
  return { goal: human.goal, hint: human.hint }
}

export function questLog(quest?: QuestDef, card?: Card) {
  if (!quest || !card) return []
  return [{
    id: quest.id, who: quest.who, name: card.from.replace(/^Mayor /, ''), role: quest.role,
    title: card.title, quote: quest.quote, ...questGoal(quest, card), objectives: questObjectives(card),
    ready: card.ready, expanded: true,
  }]
}
