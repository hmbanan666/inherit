import { type Drawing, copper, edge, enamel, enamelLight, enamelShade, gold, ink, light, steel } from './shared'

export function junction({ box, g, line, poly, wheel }: Drawing, merging: boolean) {
  // The enamel legend matches the number of physical roller-bed throats on each side.
  box(-27, -11, 45, 12, 23, 0x919e98, 0x61706c, 0x434f4f)
  const from = merging ? [-6, 5] : [0]
  const to = merging ? [0] : [-6, 5]
  for (const y of from) {
    box(-34, y, 8, 5, 4, light, steel, edge)
    line([-31, y - 1, -29, y - 2], ink)
  }
  for (const y of to) {
    box(22, y - 5, 9, 5, 4, light, steel, edge)
    line([26, y - 6, 28, y - 7], ink)
  }
  const color = merging ? 0xacd4c1 : gold
  const trunk = merging ? 12 : -16, branch = merging ? -15 : 11
  for (const y of [-6, 5])
    line([trunk, -1, -3, -1, branch, y], color, 2.8)
  for (const y of to) poly([11, y - 3.4, 16, y, 11, y + 3.4], color, color, 0.6)
  for (const x of [-23, 14]) g.circle(x, 9, 1.3).fill(ink)
  if (merging) {
    // Converging guide rails above the intake throats.
    poly([-23, -22, -17, -28, 12, -21, 7, -17], steel)
    poly([-27, -15, -23, -19, 7, -20, 3, -16], light)
    line([-16, -26, 7, -21], enamelLight, 2)
  } else {
    // Rotary gate, parked halfway between its two outlets.
    g.ellipse(1, -17, 11, 4).fill(edge).stroke({ color: ink, width: 1.4 })
    g.ellipse(1, -20, 9, 4).fill(steel).stroke({ color: ink, width: 1.4 })
    line([-11, -29, 5, -19], ink, 4.5)
    line([-11, -29, 5, -19], gold, 2.4)
    wheel(-11, -29, 2.8, steel)
  }
}

export function sorter({ g, box, line, poly, rect }: Drawing) {
  box(-32, -3, 55, 9, 14, enamelLight, enamel, enamelShade)
  // A part passes through the inspection arch; rejects slide out toward the player.
  rect(-23, -25, 5, 23, steel)
  box(-26, -30, 30, 7, 6, light, steel, edge)
  box(-2, -24, 6, 7, 21, light, steel, edge)
  rect(-18, -23, 12, 5, edge)
  g.ellipse(-12, -17, 4.4, 2.2).fill(0x97e4cb).stroke({ color: ink, width: 1 })
  g.poly([-14, -15, -10, -15, -6, -5, -18, -5]).fill({ color: 0x94e0c6, alpha: 0.28 })
  poly([-17, -5, -12, -9, -7, -7, -9, -3], copper, ink, 1)
  poly([11, -4, 23, -4, 31, 9, 16, 9], steel)
  line([11, -4, 16, 9, 31, 9], light, 2)
  line([23, -4, 31, 9], edge, 2)
  line([18, 3, 22, 6, 23, 2], 0xe19a77, 2)
  line([-24, 4, -21, 7, -16, 2], 0xafd2b3, 2.2)
}
