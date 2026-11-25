import type { Box, Shape } from './floorPick'

type Point = { x: number; y: number }

export function sameBox(a: Box | undefined, b: Box | undefined) {
  if (!a || !b) return a === b
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}

function bounds(shape: Shape): Box {
  if (shape.type === 'box') return shape.box
  const { cx, cy, rx, ry } = shape.ellipse
  return { x: cx - rx, y: cy - ry, w: 2 * rx, h: 2 * ry }
}

export function shapeBounds(shapes: readonly Shape[]): Box {
  const first = shapes[0] ? bounds(shapes[0]) : { x: 0, y: 0, w: 0, h: 0 }
  let left = first.x, top = first.y, right = left + first.w, bottom = top + first.h
  for (const shape of shapes) {
    const box = bounds(shape)
    left = Math.min(left, box.x)
    top = Math.min(top, box.y)
    right = Math.max(right, box.x + box.w)
    bottom = Math.max(bottom, box.y + box.h)
  }
  return { x: left, y: top, w: right - left, h: bottom - top }
}

export function screenBox(shapes: readonly Shape[] | Box, origin: Point, camera: Point = { x: 0, y: 0 }, scale = 1): Box {
  const box = 'w' in shapes ? shapes : shapeBounds(shapes)
  return {
    x: camera.x + (origin.x + box.x) * scale,
    y: camera.y + (origin.y + box.y) * scale,
    w: box.w * scale,
    h: box.h * scale,
  }
}
