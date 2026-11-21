import { type Drawing, edge, gold, ink, light, steel } from './shared'

export function scrap({ box, cog, line, poly, rect, wheel }: Drawing) {
  // Flared feed hopper tapers into two counter-rotating toothed drums.
  box(-24, -8, 43, 9, 20, light, steel, edge)
  poly([-30, -28, 13, -28, 26, -35, -18, -35], 0xa98069)
  poly([-25, -29, 13, -29, 19, -32, -18, -32], edge, ink, 1)
  poly([-20, -28, -22, -34, -18, -36, -12, -29], steel, ink, 1.2)
  poly([-9, -28, -6, -34, 0, -31, -1, -28], light, ink, 1.2)
  poly([-30, -28, 13, -28, 5, -12, -19, -12], 0xb97857)
  poly([13, -28, 26, -35, 17, -19, 5, -12], 0x865541)
  line([-27, -26, 10, -26], 0xe4ad83, 2)
  line([-19, -23, -14, -16], 0x865541)
  line([0, -23, -3, -16], 0x865541)
  rect(-21, -13, 34, 17, edge)
  cog(-12, -5, 8, light)
  cog(3, -5, 8, gold)
  // Motor and discharge slot.
  box(19, -6, 8, 5, 12, light, steel, edge)
  wheel(24, 1, 4.5, steel)
  rect(-14, 6, 23, 4, ink)
}
