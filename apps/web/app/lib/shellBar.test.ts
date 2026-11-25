import { expect, test } from 'vitest'
import { emptyToasts, expireToasts, pushToasts } from './toasts'
import { welcomeToast, xpProgress, xpRing } from './shellBar'

test('the account keeps the level bar labels and width at each part of the curve', () => {
  expect(xpProgress(0)).toEqual({ level: 1, fraction: 0, width: '0%', label: 'XP 0/10', title: 'Level 1. 0 / 10 XP.' })
  expect(xpProgress(32)).toEqual({ level: 3, fraction: 0.6, width: '60%', label: 'XP 12/20', title: 'Level 3. 12 / 20 XP.' })
  expect(xpProgress(140)).toEqual({ level: 6, fraction: 0, width: '0%', label: 'XP 0/30', title: 'Level 6. 0 / 30 XP.' })
  expect(xpProgress(180)).toEqual({ level: 7, fraction: 1, width: '100%', label: 'XP 180', title: 'Level 7. 180 XP.' })
})

test('the ring offsets a full circumference at zero and none at full XP', () => {
  const ring = xpRing(0.25, 10)
  expect(ring.circumference).toBeCloseTo(62.83185)
  expect(ring.dashArray).toBe(ring.circumference)
  expect(ring.dashOffset).toBeCloseTo(47.12389)
  for (const empty of [-1, 0]) expect(xpRing(empty, 10).dashOffset).toBeCloseTo(62.83185)
  for (const full of [1, 2]) expect(xpRing(full, 10).dashOffset).toBe(0)
})

test('the first visit names the available villager and gives the player seven seconds once', () => {
  const welcome = welcomeToast({ cleared: [] }, 'Talk to Ines')!
  expect(welcome).toEqual({ key: 'welcome', kind: 'event', icon: 'talk', text: 'Talk to Ines. Click the gold ! next to the house.' })
  const seen = new Set<string>()
  const list = pushToasts(emptyToasts(), [welcome], 0, seen)
  expect(expireToasts(list, 6999).visible).toHaveLength(1)
  const expired = expireToasts(list, 7000)
  expect(expired.visible).toHaveLength(0)
  expect(pushToasts(expired, [welcome], 7100, seen).visible).toHaveLength(0)
})

test('an open quest, a past hand-over or the end of the chain needs no welcome', () => {
  expect(welcomeToast({ questId: 'bram', cleared: [] }, 'Talk to Bram')).toBeUndefined()
  expect(welcomeToast({ cleared: ['bram'] }, 'Talk to Ines')).toBeUndefined()
  expect(welcomeToast({ cleared: [] }, 'More is coming.')).toBeUndefined()
})
