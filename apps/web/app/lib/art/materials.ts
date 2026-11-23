import type { Graphics } from 'pixi.js'
import { drawing, ink } from './shared'

// UI glyphs stay usable in a text label. The corresponding belt icons are font-independent.
const ironOre = { color: 0x99b3bf, highlight: 0xd2e2df, glyph: '◆' }
const copperIngot = { color: 0xd79350, highlight: 0xffcf8c, glyph: '▰' }
export const materialStyles = {
  'iron-ore': ironOre,
  'copper-ore': { color: 0xc47851, highlight: 0xf9b188, glyph: '◆' },
  coal: { color: 0x525f69, highlight: 0x97a4a9, glyph: '◆' },
  'iron-ingot': { color: 0x8da6ab, highlight: 0xd6e0d8, glyph: '▰' },
  'copper-ingot': copperIngot,
  ore: ironOre,
  ingot: copperIngot,
} as const

export function materialStyle(kind: string) {
  return Object.hasOwn(materialStyles, kind)
    ? materialStyles[kind as keyof typeof materialStyles]
    : { color: 0x97998c, highlight: 0xd2d4bd, glyph: '◇' }
}

export function materialArt(kind: string, defect = false) {
  const { g, poly } = drawing()
  const { color, highlight } = materialStyle(kind)
  g.ellipse(1, 3, 7, 4).fill({ color: 0x0c1417, alpha: 0.6 })
  switch (kind) {
    case 'ore':
    case 'iron-ore':
    case 'copper-ore':
    case 'coal':
      poly([-7, 0, -3, -5, 3, -6, 7, -1, 4, 4, -2, 6], color, ink, 1.2)
      g.poly([-6, 0, -3, -4, 3, -5, 1, 0]).fill(highlight)
      break
    case 'ingot':
    case 'iron-ingot':
    case 'copper-ingot':
      poly([-7, -2, -3, -5, 7, -5, 8, 1, 4, 4, -7, 4], color, ink, 1.2)
      g.poly([-7, -2, -3, -5, 7, -5, 4, -2]).fill(highlight)
      break
    default:
      poly([-6, 0, 0, -5, 6, 0, 0, 5], color, ink, 1)
  }
  if (defect) {
    // A hanging red tag stays visible against both coal and copper.
    poly([2, -6, 6, -8, 9, -5, 5, 0, 2, -2], 0xde806e, ink, 1)
    g.circle(5, -5, 1).fill(ink)
  }
  return g
}
