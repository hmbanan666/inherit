import { levelSpan, type World } from '@inherit/sim/v8'
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

export const shellLabels = {
  level: (level: number) => `Level ${level}`,
}
