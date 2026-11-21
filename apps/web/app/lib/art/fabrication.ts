import { type Drawing, copper, copperLight, edge, enamel, enamelLight, enamelShade, gold, ink, light, shade, steel } from './shared'

export function press({ g, box, rect, line, wheel }: Drawing) {
  box(-27, -3, 43, 12, 14, 0x748d80, 0x456f68, 0x355752)
  for (const x of [-22, 13]) {
    rect(x, -28, 6, 28, steel)
    line([x + 2, -26, x + 2, -6], light)
  }
  box(-27, -31, 44, 10, 8, 0x93b3a3, 0x649086, 0x40695d)
  for (const x of [-23, 12]) g.circle(x, -27, 1.4).fill(light)
  line([-11, -27, -3, -27], enamelLight, 1.4)
  // A side flywheel drives the ram between the two guides.
  wheel(23, -25, 8.5, shade)
  g.circle(23, -25, 5.5).fill(edge)
  for (const [dx, dy] of [[0, -5], [4.5, 2.5], [-4.5, 2.5]] as const)
    line([23, -25, 23 + dx, -25 + dy], gold, 2)
  g.circle(23, -25, 1.7).fill(light)
  rect(-9, -22, 15, 12, steel)
  line([-6, -20, -6, -13], 0xc6cfbe, 2)
  rect(-10, -22, 17, 4, edge)
  box(-13, -11, 21, 4, 4, 0xa5b2a4, 0x58665f, edge)
  rect(-11, 1, 17, 3, gold)
}

export function cutter({ g, box, line, poly, rect, wheel }: Drawing) {
  // Cable pay-off reel, viewed nearly end-on. The free strand runs into the shear.
  box(-33, 4, 23, 7, 7, steel, edge, ink)
  g.ellipse(-12, -11, 10, 16).fill(enamelShade).stroke({ color: ink, width: 2 })
  g.roundRect(-26, -24, 21, 28, 6).fill(copper).stroke({ color: ink, width: 1.4 })
  for (const x of [-21, -17, -13, -9]) {
    g.moveTo(x, -23).bezierCurveTo(x + 6, -18, x + 6, -3, x, 3).stroke({ color: copperLight, width: 1.6 })
  }
  g.ellipse(-25, -9, 10, 16).fill(enamel).stroke({ color: ink, width: 2 })
  g.ellipse(-25, -9, 7, 12).fill(enamelShade).stroke({ color: enamelLight, width: 1.2 })
  for (const [dx, dy] of [[0, -10], [5, 6], [-5, 6]] as const)
    line([-25, -9, -25 + dx, -9 + dy], enamelLight, 2.2)
  wheel(-25, -9, 3.3, gold)
  box(0, -1, 25, 8, 11, enamelLight, enamel, enamelShade)
  line([-10, -3, -4, 0, 5, -3, 27, -3], ink, 4)
  line([-10, -3, -4, 0, 5, -3, 27, -3], copperLight, 2)
  rect(4, -23, 4, 20, steel)
  rect(22, -24, 4, 20, steel)
  poly([7, -20, 23, -20, 23, -12, 7, -5], light)
  line([9, -7, 21, -12], 0xd7ddd0, 1.6)
  box(1, -27, 27, 5, 8, 0xe5ba6b, gold, shade)
  line([4, 4, 15, 4], enamelLight)
}

export function assembler({ box, poly, line, wheel, cog }: Drawing) {
  // The shoulder turns on a pedestal. Leave daylight between the forearm, jaws and jig.
  box(-30, 1, 24, 9, 10, enamelLight, enamel, enamelShade)
  box(-25, -7, 15, 6, 8, light, steel, edge)
  box(3, 3, 23, 6, 7, enamelLight, enamel, enamelShade)
  cog(16, 0, 5.4, light)
  line([-21, -5, -29, -13, -19, -32, -11, -33], ink, 3.6)
  poly([-24, -10, -16, -33, -8, -35, -5, -28, -15, -5], enamel)
  line([-19, -13, -13, -28], enamelLight, 2.7)
  poly([-14, -34, -9, -38, 14, -27, 17, -21, 12, -17, -10, -27], gold)
  line([-7, -33, 10, -25], 0xf3ce7c, 2.4)
  wheel(-19, -8, 6, steel)
  wheel(-11, -31, 6.2, steel)
  wheel(13, -23, 4.2, steel)
  box(10, -18, 9, 3, 7, light, steel, edge)
  line([11, -11, 9, -7, 12, -5], ink, 3.4)
  line([18, -11, 21, -7, 19, -5], ink, 3.4)
  line([11, -11, 10, -8], light)
  line([18, -11, 20, -8], light)
}
