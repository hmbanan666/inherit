import { type Drawing, copper, copperLight, edge, gold, ink, light, shade, steel } from './shared'

export type Deposit = 'iron' | 'copper' | 'coal'

export function miner({ g, poly, rect, line, wheel, box }: Drawing, deposit: Deposit) {
  const rock = { coal: 0x50585d, copper, iron: 0x89999f }[deposit]
  poly([-38, 11, -35, -1, -27, -8, -18, -4, -14, 9, -19, 14], rock)
  poly([-34, 0, -27, -8, -27, 1, -36, 8], { coal: 0x78858b, copper: copperLight, iron: 0xadb6b0 }[deposit])
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
