import { Container, Graphics } from 'pixi.js'
import { BELT_LENGTH, type Belt, type Machine, type Station, type World } from '@inherit/sim'
import { machineArt } from './machineArt'

export const WIDTH = 760,
  HEIGHT = 324
export const point = (s: Station) => ({ x: 60 + s.x * 80, y: 66 + s.y * 60 })
export interface Point {
  x: number
  y: number
}
export function path(belt: Belt, machines: Station[]): Point[] {
  const a = point(machines.find((m) => m.id === belt.from)!)
  const b = point(machines.find((m) => m.id === belt.to)!)
  const start = { x: a.x + 37, y: a.y }
  const end = { x: b.x - 37, y: b.y }
  const mid = (start.x + end.x) / 2
  return [start, { x: mid, y: start.y }, { x: mid, y: end.y }, end]
}
function along(points: Point[], fraction: number) {
  const segments = points.slice(1).map((p, i) => Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y))
  let distance = Math.max(0, Math.min(1, fraction)) * segments.reduce((a, b) => a + b, 0)
  for (const [i, length] of segments.entries()) {
    if (length && distance <= length) {
      const t = distance / length,
        a = points[i]!,
        b = points[i + 1]!
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    distance -= length
  }
  return points[points.length - 1]!
}
function line(g: Graphics, points: Point[], color: number, width: number) {
  g.moveTo(points[0]!.x, points[0]!.y)
  for (const p of points.slice(1)) g.lineTo(p.x, p.y)
  g.stroke({ color, width, cap: 'round', join: 'round' })
}
export function nearBelt(world: World, p: Point) {
  return world.belts.find((b) => {
    const pts = path(b, world.machines)
    return pts.slice(1).some((end, i) => {
      const start = pts[i]!,
        dx = end.x - start.x,
        dy = end.y - start.y
      const t = Math.min(
        1,
        Math.max(0, ((p.x - start.x) * dx + (p.y - start.y) * dy) / (dx * dx + dy * dy || 1)),
      )
      return Math.hypot(p.x - start.x - t * dx, p.y - start.y - t * dy) < 10
    })
  })
}
const material = { ore: 0xa6b8c0, ingot: 0xe0a467, coal: 0x69757f, part: 0x87bbad }
export function drawPlant(scene: Container, world: World, selected: string) {
  scene.removeChildren().forEach((child) => child.destroy({ children: true }))
  const g = scene.addChild(new Graphics())
  for (const b of world.belts) {
    const pts = path(b, world.machines)
    const active = selected === b.from + ' → ' + b.to
    line(g, pts, active ? 0xe3bc60 : 0x535d5c, 18)
    line(g, pts, 0x15191a, 14)
    line(g, pts, 0x353d3e, 10)
    const length = pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y), 0)
    for (let d = 6; d < length - 3; d += 9) {
      const p = along(pts, d / length),
        q = along(pts, (d + 1) / length)
      const nx = (q.y - p.y) * 4,
        ny = (p.x - q.x) * 4
      line(
        g,
        [
          { x: p.x - nx, y: p.y - ny },
          { x: p.x + nx, y: p.y + ny },
        ],
        0x566060,
        1.6,
      )
    }
  }
  for (const m of world.machines) {
    const p = point(m)
    g.roundRect(p.x - 45, p.y - 28, 90, 58, 6)
      .fill({ color: 0x343b3a, alpha: 0.55 })
      .stroke({ color: selected === m.id ? 0xe3ba53 : 0x4a5351, width: 1 })
    for (let i = 0; i < 4; i++)
      g.poly([
        p.x - 37 + i * 6,
        p.y + 26,
        p.x - 34 + i * 6,
        p.y + 26,
        p.x - 31 + i * 6,
        p.y + 22,
        p.x - 34 + i * 6,
        p.y + 22,
      ]).fill(0x9b834b)
    const art = scene.addChild(machineArt(m.kind))
    art.position.set(p.x, p.y)
    art.scale.set(1.08)
  }
}
export function animateFloor(
  g: Graphics,
  world: World,
  previous: World | undefined,
  mix: number,
  time: number,
  drag?: { from: Machine; to: Point },
) {
  g.clear()
  for (const [i, b] of world.belts.entries()) {
    const pts = path(b, world.machines)
    for (const item of b.items) {
      const old = previous?.belts[i]?.items.find((it) => it.id === item.id)
      const progress = old ? old.position + (item.position - old.position) * mix : item.position
      const { x, y } = along(pts, (progress + 0.4) / BELT_LENGTH)
      const c = material[item.kind]
      if (item.kind === 'part') {
        const teeth = Array.from({ length: 24 }, (_, i) => {
          const radius = i % 3 === 0 ? 3.8 : 5.5,
            angle = (i * Math.PI) / 12
          return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]
        }).flat()
        g.poly(teeth).fill(c).stroke({ color: 0x345048, width: 1 })
        g.circle(x, y, 1.8).fill(0x394446)
      } else if (item.kind === 'ingot') {
        g.roundRect(x - 6, y - 3.5, 12, 7, 2)
          .fill(c)
          .stroke({ color: 0x342e26, width: 1.2 })
        g.rect(x - 4, y - 2, 7, 1).fill(0xefc69d)
      } else {
        g.poly([x - 6, y, x - 2, y - 5, x + 4, y - 4, x + 6, y + 1, x + 1, y + 5, x - 4, y + 4])
          .fill(c)
          .stroke({ color: 0x303a3e, width: 1.5 })
        g.poly([x - 4, y, x - 1, y - 3, x + 3, y - 2, x, y + 1]).fill(
          item.kind === 'ore' ? 0xc1cdcd : 0x879399,
        )
      }
    }
  }
  for (const m of world.machines) {
    const { x, y } = point(m)
    if (m.status === 'blocked') {
      g.roundRect(x - 45, y - 28, 90, 58, 6).stroke({
        color: 0xd59960,
        alpha: 0.25 + 0.12 * Math.sin(time / 270),
        width: 1.3,
      })
    }
    if ((m.kind === 'mine' || m.kind === 'coal') && m.status === 'working') {
      for (let i = 0; i < 3; i++) {
        const t = (time / 650 + i * 0.32) % 1
        g.circle(x - 25 - t * 7, y - 3 - t * 10, 1.6 - t).fill({ color: 0xc8bfa1, alpha: (1 - t) * 0.65 })
      }
    }
    if (m.kind !== 'furnace' || m.status !== 'working') continue
    const heat = (Math.sin(time / 124) + 1) / 2
    for (let r = 4; r > 0; r--)
      g.ellipse(x + 3, y - 21, 13 + r * 4, 4 + r * 3).fill({ color: 0xff8d38, alpha: 0.038 })
    g.ellipse(x + 3, y - 21, 13, 4).fill({ color: 0xffad49, alpha: 0.7 + heat * 0.3 })
    g.ellipse(x + 2, y - 22, 8, 2).fill(0xffda83)
    for (let i = 0; i < 4; i++) {
      const t = (time / 850 + i * 0.23) % 1
      g.circle(x + 4 + Math.sin(i * 5 + t * 3) * 9, y - 23 - t * 19, 1.4 - t * 0.8).fill({
        color: 0xf7ba6a,
        alpha: 1 - t,
      })
    }
  }
  if (drag) {
    const p = point(drag.from)
    line(g, [{ x: p.x + 37, y: p.y }, { x: drag.to.x, y: p.y }, drag.to], 0xe3ba53, 2)
  }
}
