import { type Drawing, copper, copperLight, edge, gold, ink, light, shade, steel } from './shared'
import { enamelLight, enamel, enamelShade } from "./shared"

function crate({ box, line, rect, poly }: Drawing, x: number, y: number, w: number, h: number) {
  box(x, y, w, 9, h, 0xc6ae7a, 0xab9063, 0x806e4e)
  for (let j = 5; j < h; j += 5) line([x + 2, y + j, x + w - 1, y + j], 0x8b744d, 0.9)
  for (const n of [3, w - 6]) {
    rect(x + n, y, 3, h, 0x626b63, 0x50564e)
    poly([x + n, y, x + n + 3, y, x + n + 12, y - 6, x + n + 9, y - 6], 0x82897a, 0x555d53, 0.8)
  }
  rect(x + w * 0.45, y + 3, 6, 4, 0xdad4b7, 0xb3ad93)
}

export function depot(d: Drawing) {
  const { box, line, poly, wheel } = d
  box(-33, 1, 24, 9, 10, enamelLight, enamel, enamelShade)
  // Lattice jib and counterweight. The reeved line suspends a shipping case.
  box(-25, -31, 8, 5, 32, light, steel, edge)
  poly([-22, -13, -18, -12, 19, -32, 16, -35], shade)
  box(-33, -36, 59, 5, 6, 0xe8c47a, gold, shade)
  box(-34, -32, 11, 5, 10, light, steel, edge)
  line([-19, -30, -19, -21, -6, -30, -3, -24, 7, -30], gold, 2)
  wheel(20, -33, 3.8, steel)
  line([19, -30, 19, -16, 21, -14, 23, -16], ink, 2.8)
  line([18.5, -29, 18.5, -17], light, 1.2)
  line([10, -4, 21, -15, 28, -5], gold, 1.6)
  crate(d, 7, -4, 21, 12)
}

export function truck(d: Drawing) {
  const { g, box, poly, rect, line, wheel } = d
  g.ellipse(2, 17, 40, 8).fill({ color: ink, alpha: 0.45 })
  box(-35, 3, 63, 9, 8, 0x758484, 0x475253, 0x394547)
  crate(d, -30, -9, 22, 12)
  crate(d, -8, -8, 16, 11)
  crate(d, -23, -19, 19, 10)
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
}

export function furnace({ g, rect, line, box }: Drawing) {
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
}
