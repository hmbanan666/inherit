import { expect, test } from 'vitest'
import type { Shape } from './floorPick'
import { sameBox, screenBox, shapeBounds } from './popupPlace'

const target = { x: 60, y: 40, w: 30, h: 20 }

test('a footprint includes its box and ellipse at the sprite origin, then follows the camera and zoom', () => {
  const shapes: Shape[] = [
    { type: 'box', box: { x: -5, y: -4, w: 20, h: 8 } },
    { type: 'ellipse', ellipse: { cx: -3, cy: 2, rx: 7, ry: 8 } },
  ]
  expect(shapeBounds(shapes)).toEqual({ x: -10, y: -6, w: 25, h: 16 })
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
