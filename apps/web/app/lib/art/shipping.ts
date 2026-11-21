import { type Drawing, edge, enamel, enamelLight, enamelShade, gold, ink, light, shade, steel } from './shared'

export function crate({ box, line, rect, poly }: Drawing, x: number, y: number, w: number, h: number) {
  box(x, y, w, 9, h, 0xc6ae7a, 0xab9063, 0x806e4e)
  for (let j = 5; j < h; j += 5) line([x + 2, y + j, x + w - 1, y + j], 0x8b744d, 0.9)
  for (const n of [3, w - 6]) {
    rect(x + n, y, 3, h, 0x626b63, 0x50564e)
    poly([x + n, y, x + n + 3, y, x + n + 12, y - 6, x + n + 9, y - 6], 0x82897a, 0x555d53, 0.8)
  }
  rect(x + w * 0.45, y + 3, 6, 4, 0xdad4b7, 0xb3ad93)
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

export function storage(d: Drawing) {
  const { box, rect, line } = d
  // Two stacked bins and an open rack bay with a graduated sight glass.
  box(-33, 6, 57, 9, 5, light, steel, edge)
  crate(d, -31, -9, 27, 15)
  crate(d, -28, -24, 24, 15)
  box(-2, -18, 24, 9, 24, enamelLight, enamel, enamelShade)
  box(-4, -21, 28, 9, 4, enamelLight, steel, enamelShade)
  rect(3, -14, 6, 16, edge)
  rect(4.5, -6, 3, 7, gold, shade)
  for (const y of [-12, -7, -2]) line([12, y, y === -7 ? 16 : 19, y], 0xd3d2ae)
}

export function dock(d: Drawing) {
  const { box, rect, line, poly } = d
  // Weigh platform with a dispatcher's dial and a striped bumper at the lip.
  rect(-26, -26, 5, 32, steel)
  box(-33, -31, 18, 5, 12, enamelLight, enamel, enamelShade)
  d.g.circle(-24, -25, 4.4).fill(0xe1d8b9).stroke({ color: ink, width: 1 })
  line([-24, -25, -22, -27], 0x994d35, 1.4)
  box(-29, 2, 54, 10, 9, light, steel, edge)
  crate(d, -18, -14, 25, 16)
  // Rubber dock fenders either side of the exit arrow.
  for (const x of [-26, 18]) rect(x, 4, 5, 6, edge)
  poly([-9, 5, 2, 5, 2, 3, 10, 7, 2, 11, 2, 9, -9, 9], gold, ink, 0.8)
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
