import type { Box, Shape } from './floorPick'

type Size = { w: number; h: number }
type Point = { x: number; y: number }
export const popupMargin = 8

export function sameBox(a: Box | undefined, b: Box | undefined) {
  if (!a || !b) return a === b
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}

export function popupPlace(target: Box, popup: Size, frame: Size, gap = 10) {
  const width = Math.min(popup.w, Math.max(0, frame.w - 2 * popupMargin))
  const maxHeight = Math.min(popup.h, Math.max(0, frame.h - 2 * popupMargin))
  let side: 'right' | 'left' | 'below' = 'right'
  let left = target.x + target.w + gap
  let top = target.y
  if (left + width > frame.w - popupMargin) {
    left = target.x - gap - width
    side = 'left'
    if (left < popupMargin) {
      left = target.x
      top = target.y + target.h + gap
      side = 'below'
    }
  }
  return {
    left: Math.max(popupMargin, Math.min(left, frame.w - popupMargin - width)),
    top: Math.max(popupMargin, Math.min(top, frame.h - popupMargin - maxHeight)),
    side, width, maxHeight,
  }
}

function bounds(shape: Shape): Box {
  if (shape.type === 'box') return shape.box
  const { cx, cy, rx, ry } = shape.ellipse
  return { x: cx - rx, y: cy - ry, w: 2 * rx, h: 2 * ry }
}

function shapeBounds(shapes: readonly Shape[]): Box {
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
