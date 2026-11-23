import { Graphics } from 'pixi.js'

export const ink = 0x1a2022, edge = 0x353e40, steel = 0x778181, light = 0xa8ae9e
export const gold = 0xd2a44b, shade = 0x986b34
export const enamel = 0x58867e, enamelLight = 0x97b4a3, enamelShade = 0x365b55
export const copper = 0xc6794e, copperLight = 0xe9a776

// Front elevations face the player; depth recedes up and to the right.
export function drawing() {
  const g = new Graphics()
  function poly(points: number[], fill: number, outline = ink, width = 1.6) {
    g.poly(points).fill(fill).stroke({ color: outline, width, join: 'round' })
  }
  function rect(x: number, y: number, w: number, h: number, color: number, outline = ink) {
    g.rect(x, y, w, h).fill(color).stroke({ color: outline, width: 1.4 })
  }
  function line(points: number[], color: number, width = 1.5) {
    g.moveTo(points[0]!, points[1]!)
    for (let i = 2; i < points.length; i += 2) g.lineTo(points[i]!, points[i + 1]!)
    g.stroke({ color, width, cap: 'round', join: 'round' })
  }
  function wheel(x: number, y: number, r: number, color: number) {
    g.circle(x, y, r).fill(color).stroke({ color: ink, width: 2 })
    g.circle(x, y, r * 0.43).fill(ink)
    g.circle(x - 0.6, y - 1, r * 0.21).fill(light)
  }
  function box(x: number, y: number, w: number, d: number, h: number, top: number, front: number, side: number) {
    poly([x, y, x + w, y, x + w + d, y - d * 0.65, x + d, y - d * 0.65], top)
    poly([x, y, x + w, y, x + w, y + h, x, y + h], front)
    poly([x + w, y, x + w + d, y - d * 0.65, x + w + d, y + h - d * 0.65, x + w, y + h], side)
  }
  function cog(x: number, y: number, radius: number, color: number) {
    const points: number[] = []
    for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI / 16
      const r = (i % 4 === 1 || i % 4 === 2) ? radius : radius * 0.76
      points.push(x + Math.cos(angle) * r, y + Math.sin(angle) * r)
    }
    poly(points, color, ink, 1)
    g.circle(x, y, radius * 0.28).fill(ink)
  }
  return { g, poly, rect, line, wheel, box, cog }
}

export type Drawing = ReturnType<typeof drawing>

export function mountingPlate({ g, box, line }: Drawing) {
  g.ellipse(2, 20, 41, 11).fill({ color: 0x101315, alpha: 0.45 })
  box(-37, 13, 63, 12, 8, 0x657072, 0x414a4c, 0x323c40)
  line([-34, 16, 22, 16], 0x7d8581, 1)
  for (const x of [-31, 21]) g.circle(x, 18, 1.5).fill(0xaab1a6)
}
