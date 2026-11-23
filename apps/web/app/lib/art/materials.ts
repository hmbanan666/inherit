import { drawing, ink } from './shared'

type Material = 'iron-ore' | 'iron-ingot'
const materialStyles = {
  'iron-ore': { color: 0x99b3bf, highlight: 0xd2e2df },
  'iron-ingot': { color: 0x8da6ab, highlight: 0xd6e0d8 },
}

export function materialArt(kind: Material) {
  const { g, poly } = drawing()
  const { color, highlight } = materialStyles[kind]
  g.ellipse(1, 3, 7, 4).fill({ color: 0x0c1417, alpha: 0.6 })
  switch (kind) {
    case 'iron-ore':
      poly([-7, 0, -3, -5, 3, -6, 7, -1, 4, 4, -2, 6], color, ink, 1.2)
      g.poly([-6, 0, -3, -4, 3, -5, 1, 0]).fill(highlight)
      break
    case 'iron-ingot':
      poly([-7, -2, -3, -5, 7, -5, 8, 1, 4, 4, -7, 4], color, ink, 1.2)
      g.poly([-7, -2, -3, -5, 7, -5, 4, -2]).fill(highlight)
      break
  }
  return g
}
