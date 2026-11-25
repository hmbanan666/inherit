import { expect, test } from 'vitest'
import type { Shape } from './floorPick'
import { popupPlace, sameBox, screenBox } from './popupPlace'

const frame = { w: 400, h: 250 }
const popup = { w: 120, h: 80 }
const target = { x: 60, y: 40, w: 30, h: 20 }

test('a card fits to the right, aligned with the top of its target', () => {
  expect(popupPlace(target, popup, frame)).toMatchObject({ side: 'right', left: 100, top: 40 })
})

test('a card flips left at the right edge and goes below when neither side fits', () => {
  expect(popupPlace({ ...target, x: 370 }, popup, frame, 12))
    .toMatchObject({ side: 'left', left: 238, top: 40 })
  expect(popupPlace({ ...target, w: 290 }, popup, frame))
    .toMatchObject({ side: 'below', left: 60, top: 70 })
})

test('the entire card stays inside the margin as a target pans across and past the frame', () => {
  for (let x = -100; x <= 500; x += 25) {
    for (let y = -50; y <= 300; y += 25) {
      const { left, top, width, maxHeight } = popupPlace({ ...target, x, y }, popup, frame)
      expect(width).toBe(120)
      expect(maxHeight).toBe(80)
      expect(left).toBeGreaterThanOrEqual(8)
      expect(top).toBeGreaterThanOrEqual(8)
      expect(left + width).toBeLessThanOrEqual(392)
      expect(top + maxHeight).toBeLessThanOrEqual(242)
    }
  }
})

test('a small frame constrains both card dimensions, down to zero', () => {
  expect(popupPlace(target, popup, { w: 100, h: 60 }))
    .toMatchObject({ left: 8, top: 8, width: 84, maxHeight: 44 })
  expect(popupPlace(target, popup, { w: 10, h: 14 }))
    .toMatchObject({ left: 8, top: 8, width: 0, maxHeight: 0 })
})

test('a footprint includes its box and ellipse at the sprite origin, then follows the camera and zoom', () => {
  const shapes: Shape[] = [
    { type: 'box', box: { x: -5, y: -4, w: 20, h: 8 } },
    { type: 'ellipse', ellipse: { cx: -3, cy: 2, rx: 7, ry: 8 } },
  ]
  const origin = { x: 50, y: 30 }
  const worldBox = screenBox(shapes, origin, { x: 0, y: 0 }, 1)
  expect(worldBox).toEqual({ x: 40, y: 24, w: 25, h: 16 })
  expect(screenBox(shapes, origin, { x: 10, y: 20 }, 2)).toEqual({ x: 90, y: 68, w: 50, h: 32 })
  expect(screenBox(worldBox, { x: 0, y: 0 }, { x: 10, y: 20 }, 2)).toEqual({ x: 90, y: 68, w: 50, h: 32 })
})

test('only a change in position, extent or presence needs a new anchor', () => {
  expect(sameBox(undefined, undefined)).toBe(true)
  expect(sameBox(undefined, target)).toBe(false)
  expect(sameBox(target, undefined)).toBe(false)
  expect(sameBox(target, { ...target })).toBe(true)
  for (const field of ['x', 'y', 'w', 'h'] as const) {
    expect(sameBox(target, { ...target, [field]: target[field] + 0.25 })).toBe(false)
  }
})
