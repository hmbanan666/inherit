import { createWorld, kettlewick, questList } from '@inherit/sim/v8'
import { expect, test } from 'vitest'
import { isLevelEvent, levelUnlocks, levelUpLabels, pickLevelUp, visibleLevelUp } from './levelUp'
import { emptyToasts, pushToasts } from './toasts'
import { worldEvents, type GameEvent } from './worldEvents'

test.each([
  [2, ['New quest: Ore from the normal cut from Ines']],
  [3, ['New quest: Steel for the bridge from Odile']],
  [4, ['New quest: A grate for the oven from Elsie', 'New quest: Iron from the hill from Harrow']],
  [5, ['New quest: Gears for the mill wheel from Tomas', 'New quest: Hinges for the barrels from Pell']],
  [6, ['New quest: Shutters for the lamps from Wen']],
  [7, ['New quest: Kits for the bridge crew from Odile']],
] as const)('level %i lists quests at that level in chain order', (level, lines) => {
  expect(levelUnlocks(level, questList).lines).toEqual(lines)
})

test('an empty level points to the nearest later quest if one exists', () => {
  const quests = [questList.at(-1)!, questList[2]!]
  expect(levelUnlocks(2, quests)).toEqual({ lines: [], next: 3 })
  expect(levelUnlocks(8, quests)).toEqual({ lines: [], next: undefined })
  expect(levelUpLabels.keepGoing(3)).toBe('Keep going. New work opens at level 3.')
  expect(levelUpLabels.keepGoing()).toBe('Keep going.')
})

test('loading a save is silent and each live level key is consumed only once', () => {
  const world = createWorld(kettlewick)
  world.level = 4
  const seen = new Set<string>()
  expect(pickLevelUp(worldEvents(undefined, world, questList, []), seen)).toBeUndefined()
  const events = worldEvents(world, { ...world, level: 5 }, questList, [])
  expect(pickLevelUp(events, seen)).toBe(5)
  expect(pickLevelUp(events, seen)).toBeUndefined()
})

test('a mixed batch selects the highest new level and leaves other keys for toasts', () => {
  const seen = new Set<string>(['level:2'])
  const events: GameEvent[] = [
    { kind: 'event', icon: 'level', key: 'level:4', text: 'Level 4' },
    { kind: 'event', icon: 'coins', key: 'handed:odile', text: '+80 credits' },
    { kind: 'event', icon: 'level', key: 'level:3', text: 'Level 3' },
  ]
  expect(pickLevelUp(events, seen)).toBe(4)
  expect(seen).toEqual(new Set(['level:2', 'level:3', 'level:4']))
  const toasts = pushToasts(emptyToasts(), events.filter(event => !isLevelEvent(event)), 0, seen)
  expect(toasts.visible.map(toast => toast.key)).toEqual(['handed:odile'])
  expect(pickLevelUp(events, seen)).toBeUndefined()
})

test('a level waits until the current surface closes', () => {
  expect(visibleLevelUp(3, true)).toBeUndefined()
  expect(visibleLevelUp(3, false)).toBe(3)
  expect(visibleLevelUp(undefined, false)).toBeUndefined()
})
