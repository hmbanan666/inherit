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
  plate: { color: 0x92a6b1, highlight: 0xd2dfdc, glyph: '▱' },
  gear: { color: 0xd7b461, highlight: 0xf6d895, glyph: '⚙' },
  wire: { color: 0xd98355, highlight: 0xffc59b, glyph: '∿' },
  bracket: { color: 0x90b39d, highlight: 0xd2dcc4, glyph: '∟' },
  motor: { color: 0x688e89, highlight: 0xbad9c9, glyph: '▣' },
  part: { color: 0x85d2bb, highlight: 0xd3ead0, glyph: '⚙' },
  ore: ironOre,
  ingot: copperIngot,
} as const

export function materialStyle(kind: string) {
  return Object.hasOwn(materialStyles, kind)
    ? materialStyles[kind as keyof typeof materialStyles]
    : { color: 0x97998c, highlight: 0xd2d4bd, glyph: '◇' }
}

export function materialArt(kind: string, defect = false) {
  const { g, cog, rect, poly, line } = drawing()
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
    case 'plate':
      poly([-8, 1, 2, -5, 8, -3, 8, 0, -2, 6, -8, 4], color, ink, 1)
      line([-6, 1, -2, 3, 6, -2], highlight)
      break
    case 'gear':
    case 'part':
      cog(0, 0, 6.8, color)
      g.circle(0, 0, 2.8).stroke({ color: highlight, width: 1 })
      break
    case 'wire':
      for (const x of [-3, 0, 3]) {
        g.ellipse(x, 0, 3.5, 5.3).stroke({ color: ink, width: 3.2 })
        g.ellipse(x, 0, 3.5, 5.3).stroke({ color, width: 1.8 })
      }
      line([4, 4, 7, 5, 8, 3], highlight)
      break
    case 'bracket':
      poly([-6, -5, -2, -6, -2, 1, 6, 0, 7, 4, -6, 6], color, ink, 1.1)
      line([-4, -3, -4, 3, 4, 2], highlight)
      g.circle(3, 3, 1).fill(ink)
      break
    case 'motor':
      rect(4, -1, 4, 3, highlight)
      g.roundRect(-7, -5, 12, 10, 3).fill(color).stroke({ color: ink, width: 1.2 })
      for (const x of [-4, -1, 2]) line([x, -2, x, 2], highlight, 1)
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

// Animate a pooled materialArt at a fixed floor position. Progress runs from birth (0) to rest (1).
export function itemPop(sprite: Graphics, x: number, y: number, progress: number) {
  const t = Math.max(0, Math.min(progress, 1))
  const rise = 1 - (1 - t) ** 2
  sprite.position.set(x, y - 20 * rise)
  sprite.scale.set(1 + 0.28 * Math.sin(Math.PI * t))
  sprite.alpha = Math.min(1, (1 - t) * 2)
}
