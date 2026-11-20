import { Graphics } from 'pixi.js'
import type { Kind } from '@inherit/sim'

// Workshop sprites are drawn in local floor coordinates around the mounting plate.
type Color = number
export function machineArt(kind: Kind) {
  const g = new Graphics()
  const ink = 0x1a2022,
    edge = 0x353e40,
    steel = 0x778181,
    light = 0xa8ae9e
  const gold = 0xd2a44b,
    shade = 0x986b34
  function poly(points: number[], fill: Color, outline = ink, width = 1.6) {
    g.poly(points).fill(fill).stroke({ color: outline, width, join: 'round' })
  }
  function rect(x: number, y: number, w: number, h: number, color: Color, outline = ink) {
    g.rect(x, y, w, h).fill(color).stroke({ color: outline, width: 1.4 })
  }
  function line(points: number[], color: Color, width = 1.5) {
    g.moveTo(points[0]!, points[1]!)
    for (let i = 2; i < points.length; i += 2) g.lineTo(points[i]!, points[i + 1]!)
    g.stroke({ color, width, cap: 'round', join: 'round' })
  }
  function wheel(x: number, y: number, r: number, color: Color) {
    g.circle(x, y, r).fill(color).stroke({ color: ink, width: 2 })
    g.circle(x, y, r * 0.43).fill(ink)
    g.circle(x - 0.6, y - 1, r * 0.21).fill(light)
  }
  function box(x: number, y: number, w: number, d: number, h: number, top: Color, front: Color, side: Color) {
    poly([x, y, x + w, y, x + w + d, y - d * 0.65, x + d, y - d * 0.65], top)
    poly([x, y, x + w, y, x + w, y + h, x, y + h], front)
    poly([x + w, y, x + w + d, y - d * 0.65, x + w + d, y + h - d * 0.65, x + w, y + h], side)
  }
  // Cast feet, bevel and the four anchor bolts unify the different machines.
  if (kind !== 'dispatch') {
    g.ellipse(2, 20, 41, 11).fill({ color: 0x101315, alpha: 0.45 })
    box(-37, 13, 63, 12, 8, 0x657072, 0x414a4c, 0x323c40)
    line([-34, 16, 22, 16], 0x7d8581, 1)
    for (const x of [-31, 21]) g.circle(x, 18, 1.5).fill(0xaab1a6)
  }
  if (kind === 'mine' || kind === 'coal') {
    const rock = kind === 'coal' ? 0x50585d : 0x89999f
    poly([-38, 11, -35, -1, -27, -8, -18, -4, -14, 9, -19, 14], rock)
    poly([-34, 0, -27, -8, -27, 1, -36, 8], 0xadb6b0)
    poly([-26, 8, -19, -2, -11, 2, -8, 12, -18, 15], rock)
    // Crawler track and rollers.
    g.roundRect(-9, 2, 43, 13, 6).fill(0x353b3c).stroke({ color: ink, width: 2.5 })
    for (const x of [-2, 7, 16, 25]) wheel(x, 8, 4.2, steel)
    box(-7, -5, 29, 9, 9, 0xe0b563, gold, shade)
    box(9, -22, 13, 8, 17, 0xefc676, 0xc49442, 0x88612f)
    poly([11, -19, 20, -19, 20, -10, 11, -10], 0x566f74)
    line([12, -18, 18, -18], 0xabc2bd)
    rect(27, -17, 3, 9, ink)
    // Articulated boom, hydraulic piston and toothed bucket.
    poly([3, -7, -7, -33, -14, -31, -2, -3], gold)
    poly([-7, -33, -24, -22, -27, -9, -22, -8, -18, -20, -8, -26], 0xe1b352)
    line([0, -9, -9, -27, -20, -20], 0xf8d580, 2)
    line([-5, -9, -13, -25], steel, 2.4)
    wheel(-10, -29, 3.3, steel)
    wheel(1, -7, 3.4, steel)
    poly([-27, -12, -20, -9, -20, -3, -26, 0, -32, -3, -28, -3], shade)
  } else if (kind === 'furnace') {
    // Firebrick shell, cast-iron bands and a refractory-lined charging mouth.
    box(-30, -10, 10, 7, 21, steel, edge, ink)
    rect(-27, -35, 7, 25, 0x69716b)
    rect(-29, -38, 10, 5, 0x848b7e)
    line([-25, -32, -25, -16], light, 1.2)
    g.roundRect(-18, -23, 42, 37, 8).fill(0x975f3e).stroke({ color: ink, width: 2 })
    g.ellipse(3, 10, 21, 6).fill(0x815239).stroke({ color: ink, width: 1.6 })
    rect(-18, -11, 42, 5, 0x70746a)
    rect(-18, 3, 42, 5, 0x5a625b)
    for (const x of [-15, 20]) {
      rect(x, -22, 3, 34, 0x717368)
      for (const y of [-15, -8, 6]) g.circle(x + 1.5, y, 1).fill(0xc1b399)
    }
    g.ellipse(3, -22, 22, 9).fill(0xaaa58c).stroke({ color: ink, width: 2 })
    g.ellipse(3, -22, 16, 5.7).fill(0x5d3929).stroke({ color: 0x4a4b42, width: 2 })
    g.ellipse(3, -21, 12, 3.5).fill(0xaf6639)
    rect(-6, -8, 19, 18, 0x5b6159)
    g.roundRect(-3, -5, 13, 12, 2).fill(0x452d26).stroke({ color: ink, width: 1.5 })
    for (const x of [-1, 3, 7]) line([x, 4, x, -2], 0xc37940, 1.8)
    line([25, -9, 30, -9, 30, 5, 33, 5], ink, 5)
    line([25, -10, 30, -10, 30, 4, 33, 4], steel, 2.6)
  } else if (kind === 'dispatch') {
    // Timber shipping cases with metal straps, plank seams and stencil marks.
    const crate = (x: number, y: number, w: number, h: number) => {
      box(x, y, w, 9, h, 0xc6ae7a, 0xab9063, 0x806e4e)
      for (let j = 5; j < h; j += 5) line([x + 2, y + j, x + w - 1, y + j], 0x8b744d, 0.9)
      for (const n of [3, w - 6]) {
        rect(x + n, y, 3, h, 0x626b63, 0x50564e)
        poly([x + n, y, x + n + 3, y, x + n + 12, y - 6, x + n + 9, y - 6], 0x82897a, 0x555d53, 0.8)
      }
      rect(x + w * 0.45, y + 3, 6, 4, 0xdad4b7, 0xb3ad93)
    }
    g.ellipse(2, 17, 40, 8).fill({ color: ink, alpha: 0.45 })
    box(-35, 3, 63, 9, 8, 0x758484, 0x475253, 0x394547)
    crate(-30, -9, 22, 12)
    crate(-8, -8, 16, 11)
    crate(-23, -19, 19, 10)
    poly([11, 4, 11, -17, 23, -17, 33, -4, 34, 8, 11, 8], 0x6fa59b)
    poly([11, -17, 18, -22, 29, -22, 23, -17], 0xb1ccc1)
    poly([23, -17, 29, -22, 39, -9, 33, -4], 0x789a9d)
    poly([33, -4, 39, -9, 39, 5, 34, 8], 0x476e68)
    poly([15, -14, 22, -14, 28, -5, 15, -5], 0x344c52)
    line([17, -13, 21, -13, 24, -9], 0xb2cfcc, 1.4)
    rect(14, -1, 4, 1, ink)
    line([34, 2, 38, 0], 0xf5ce82, 2.6)
    wheel(-22, 11, 6, steel)
    wheel(22, 11, 6, steel)
  } else if (kind === 'splitter') {
    box(-27, -11, 45, 12, 23, 0x919e98, 0x61706c, 0x434f4f)
    line([-16, -1, -4, -1, 6, -6, 13, -6], gold, 3)
    line([-4, -1, 6, 5, 13, 5], gold, 3)
    for (const x of [-22, 16]) g.circle(x, 9, 2).fill(ink)
  } else {
    box(-27, -3, 43, 12, 14, 0x748d80, 0x456f68, 0x355752)
    for (const x of [-22, 13]) {
      rect(x, -28, 6, 28, steel)
      line([x + 2, -26, x + 2, -6], light)
    }
    box(-27, -31, 44, 10, 8, 0x93b3a3, 0x649086, 0x40695d)
    rect(-9, -22, 15, 12, steel)
    box(-13, -11, 21, 4, 4, 0xa5b2a4, 0x58665f, edge)
    rect(-11, 1, 17, 3, gold)
  }
  return g
}
