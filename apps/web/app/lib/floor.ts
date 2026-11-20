import { Container, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js'
import { BELT_LENGTH, type Belt, type Item, type Station, type World } from '@inherit/sim'
import { machineArt } from './machineArt'

export interface Point {
  x: number
  y: number
}
export const point = (s: Pick<Station, 'x' | 'y'>, row: number) => ({ x: s.x * 80, y: s.y * row })

// The canvas and DOM hit targets share this camera, including available placement tiles.
export function fit(stations: Station[], tiles: [number, number][], width: number, height: number) {
  const xs = [...stations.map((m) => m.x), ...tiles.map((t) => t[0])]
  const ys = [...stations.map((m) => m.y), ...tiles.map((t) => t[1])]
  const cols = Math.max(...xs) - Math.min(...xs),
    rows = Math.max(...ys) - Math.min(...ys)
  const innerW = Math.max(1, width - 36),
    innerH = Math.max(1, height - 36)
  const span = cols * 80 + 116
  const row = Math.max(56, Math.min(146, ((innerH * span) / innerW - 132) / (rows || 1)))
  const depth = rows * row + 132
  const scale = Math.min(innerW / span, innerH / depth)
  return {
    row,
    scale,
    x: (width - span * scale) / 2 + (58 - Math.min(...xs) * 80) * scale,
    y: (height - depth * scale) / 2 + (59 - Math.min(...ys) * row) * scale,
  }
}

function route(b: Belt, stations: Station[], row: number) {
  const a = point(stations.find((s) => s.id === b.from)!, row)
  const z = point(stations.find((s) => s.id === b.to)!, row)
  a.x += 37
  z.x -= 37
  const mid = (a.x + z.x) / 2
  const points = [a, { x: mid, y: a.y }, { x: mid, y: z.y }, z]
  const segments = points
    .slice(1)
    .map((end, i) => {
      const start = points[i]!,
        dx = end.x - start.x,
        dy = end.y - start.y
      return { start, dx: Math.sign(dx), dy: Math.sign(dy), length: Math.abs(dx) + Math.abs(dy) }
    })
    .filter((s) => s.length > 0)
  return { points, segments, length: segments.reduce((n, s) => n + s.length, 0) }
}
type Route = ReturnType<typeof route>
function position(display: Container, path: Route, fraction: number) {
  let d = path.length * Math.min(1, Math.max(0, fraction))
  for (const s of path.segments) {
    if (d <= s.length) {
      display.position.set(s.start.x + d * s.dx, s.start.y + d * s.dy)
      return
    }
    d -= s.length
  }
}
function texture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  paint(canvas.getContext('2d')!)
  return Texture.from(canvas)
}
function parcel(kind: Item) {
  const g = new Graphics()
  g.ellipse(1, 3, 7, 4).fill({ color: 0x0c1417, alpha: 0.6 })
  if (kind === 'part') {
    const teeth: number[] = []
    for (let i = 0; i < 24; i++) {
      const r = i % 3 ? 6 : 4.3
      teeth.push(r * Math.cos((i * Math.PI) / 12), r * Math.sin((i * Math.PI) / 12))
    }
    g.poly(teeth).fill(0x85d2bb).stroke({ color: 0x253e39, width: 1 })
    g.circle(0, 0, 2).fill(0x34514a)
  } else if (kind === 'ingot') {
    g.poly([-7, -2, -3, -5, 7, -5, 8, 1, 4, 4, -7, 4]).fill(0xd79350).stroke({ color: 0x483322, width: 1.2 })
    g.poly([-7, -2, -3, -5, 7, -5, 4, -2]).fill(0xffcf8c)
  } else {
    g.poly([-7, 0, -3, -5, 3, -6, 7, -1, 4, 4, -2, 6])
      .fill(kind === 'ore' ? 0x99b3bf : 0x525f69)
      .stroke({ color: 0x1b292e, width: 1.3 })
    g.poly([-6, 0, -3, -4, 3, -5, 1, 0]).fill(kind === 'ore' ? 0xd2e2df : 0x8c9ca2)
  }
  return g
}
function makeMachine(parent: Container, station: Station, row: number, glow: Texture) {
  const { x, y } = point(station, row)
  const base = parent.addChild(new Container())
  base.position.set(x, y)
  const pad = base.addChild(new Graphics())
  pad.roundRect(-46, -30, 92, 63, 5).fill(0x171e20)
  pad.roundRect(-46, -33, 92, 63, 5).fill(0x394344).stroke({ color: 0x657170, width: 1 })
  pad.roundRect(-42, -29, 84, 51, 3).fill(0x293233).stroke({ color: 0x454f50, width: 1 })
  for (let i = 0; i < 5; i++)
    pad.poly([-39 + i * 6, 26, -36 + i * 6, 26, -33 + i * 6, 22, -36 + i * 6, 22]).fill(0xb19758)
  for (const xx of [-41, 41]) for (const yy of [-28, 25]) pad.circle(xx, yy, 1.25).fill(0x96a09a)
  const heat = base.addChild(new Sprite(glow))
  heat.anchor.set(0.5)
  heat.position.set(2, -12)
  heat.visible = false
  const art = base.addChild(machineArt(station.kind))
  const fire = base.addChild(new Graphics())
  fire.ellipse(3, -22, 14, 4.4).fill(0xffb544)
  fire.ellipse(3, -22, 8, 2.6).fill(0xffe1a0)
  for (const xx of [-1, 3, 7]) fire.roundRect(xx - 0.8, -3, 1.8, 8, 0.6).fill(0xffa73e)
  fire.visible = false
  const sparks = Array.from({ length: station.kind === 'furnace' ? 5 : 0 }, () =>
    base.addChild(new Graphics()).circle(0, 0, 1.2).fill(0xffc16a),
  )
  const dust = Array.from({ length: station.kind === 'mine' || station.kind === 'coal' ? 3 : 0 }, () =>
    base.addChild(new Graphics()).circle(0, 0, 1.6).fill(0xcabf9f),
  )
  return { art, heat, fire, sparks, dust }
}

// Retain artwork across frames. Only world snapshots change cargo bindings.
export class FloorScene {
  readonly root = new Container()
  private tread = texture(12, 10, (ctx) => {
    ctx.fillStyle = '#354244'
    ctx.fillRect(0, 0, 12, 10)
    ctx.strokeStyle = '#657476'
    ctx.lineWidth = 1.65
    ctx.beginPath()
    ctx.moveTo(2, 0)
    ctx.lineTo(5, 5)
    ctx.lineTo(2, 10)
    ctx.stroke()
  })
  private glow = texture(130, 130, (ctx) => {
    const gradient = ctx.createRadialGradient(65, 65, 0, 65, 65, 65)
    gradient.addColorStop(0, 'rgba(255,187,75,.8)')
    gradient.addColorStop(0.4, 'rgba(248,125,41,.35)')
    gradient.addColorStop(1, 'rgba(236,105,27,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 130, 130)
  })
  private tracks: { path: Route; treads: TilingSprite[]; moving: boolean; phase: number }[]
  private machines: ReturnType<typeof makeMachine>[]
  private bins = new Map<Item, Graphics[]>()
  private moves: { art: Graphics; path: Route; from: number; to: number; leaving: boolean }[] = []
  private cargo = new Container()
  private world: World
  constructor(world: World, row: number) {
    this.world = world
    this.tracks = world.belts.map((b) => {
      const path = route(b, world.machines, row)
      const rail = this.root.addChild(new Graphics())
      for (const [width, color] of [
        [20, 0x171e20],
        [17, 0x657172],
        [14, 0x273030],
      ] as const) {
        for (const [i, p] of path.points.entries()) {
          if (!i) rail.moveTo(p.x, p.y)
          else rail.lineTo(p.x, p.y)
        }
        rail.stroke({ width, color, join: 'round', cap: 'round' })
      }
      const treads = path.segments.map((s) => {
        const tile = this.root.addChild(
          new TilingSprite({ texture: this.tread, width: s.length, height: 10 }),
        )
        tile.anchor.set(0, 0.5)
        tile.position.set(s.start.x, s.start.y)
        tile.rotation = Math.atan2(s.dy, s.dx)
        return tile
      })
      return { path, treads, moving: false, phase: 0 }
    })
    this.root.addChild(this.cargo)
    this.machines = world.machines.map((s) => makeMachine(this.root, s, row, this.glow))
  }
  beltAt(p: Point) {
    const i = this.tracks.findIndex(({ path }) =>
      path.segments.some((s) => {
        const dx = p.x - s.start.x,
          dy = p.y - s.start.y
        const distance = Math.max(0, Math.min(s.length, dx * s.dx + dy * s.dy))
        return Math.hypot(dx - distance * s.dx, dy - distance * s.dy) < 11
      }),
    )
    return this.world.belts[i]
  }
  update(world: World, previous?: World, selected = '') {
    this.world = world
    for (const m of this.moves) m.art.visible = false
    this.moves.length = 0
    const counts = new Map<Item, number>()
    for (const [i, b] of world.belts.entries()) {
      const track = this.tracks[i]!
      const old = previous?.belts[i]?.items
      const bind = (kind: Item, from: number, to: number, leaving: boolean) => {
        const n = counts.get(kind) ?? 0
        const pool = this.bins.get(kind) ?? []
        const art = pool[n] ?? (pool[n] = this.cargo.addChild(parcel(kind)))
        this.bins.set(kind, pool)
        counts.set(kind, n + 1)
        art.visible = true
        this.moves.push({ art, path: track.path, from, to, leaving })
      }
      track.moving = false
      for (const item of b.items) {
        const before = old?.find((o) => o.id === item.id)
        const from = before ? before.position + 0.5 : old ? 0 : item.position + 0.5
        const to = item.position + 0.5
        if (from !== to) track.moving = true
        bind(item.kind, from, to, false)
      }
      for (const item of old ?? [])
        if (!b.items.some((o) => o.id === item.id)) {
          bind(item.kind, item.position + 0.5, BELT_LENGTH, true)
          track.moving = true
        }
      const jam = b.items.length === BELT_LENGTH && !track.moving
      for (const tile of track.treads)
        tile.tint = selected === b.from + ' → ' + b.to ? 0xffda85 : jam ? 0xf6937b : 0xffffff
    }
  }
  frame(mix: number, time: number, delta: number, departure: number) {
    for (const track of this.tracks) {
      if (track.moving && delta) {
        track.phase = (track.phase + delta * 0.036) % 12
        for (const tile of track.treads) tile.tilePosition.x = track.phase
      }
    }
    for (const m of this.moves) {
      position(m.art, m.path, (m.from + (m.to - m.from) * mix) / BELT_LENGTH)
      m.art.visible = !m.leaving || mix < 1
    }
    for (let i = 0; i < this.machines.length; i++) {
      const m = this.world.machines[i]!,
        visual = this.machines[i]!
      if (m.kind === 'dispatch') {
        visual.art.x = departure * departure * 210
        visual.art.alpha = 1 - departure
      }
      for (let j = 0; j < visual.dust.length; j++) {
        const mote = visual.dust[j]!
        mote.visible = m.status === 'working'
        if (!mote.visible) continue
        const t = (time / 680 + j / 3) % 1
        mote.position.set(-26 - t * 9, -4 - t * 13)
        mote.alpha = (1 - t) * 0.75
      }
      if (m.kind !== 'furnace') continue
      const hot = m.status === 'working'
      visual.art.tint = hot ? 0xffffff : 0x93a3ac
      visual.fire.visible = visual.heat.visible = hot
      const flicker = 0.9 + 0.1 * Math.sin(time / 113 + i)
      visual.heat.alpha = flicker
      visual.fire.scale.y = flicker
      for (let j = 0; j < visual.sparks.length; j++) {
        const spark = visual.sparks[j]!
        spark.visible = hot
        if (!hot) continue
        const t = (time / 910 + j / 5) % 1
        spark.position.set(3 + Math.sin(j * 3.7 + t * 4) * 11, -24 - t * 27)
        spark.alpha = 1 - t
        spark.scale.set(1.3 - t)
      }
    }
  }
  destroy() {
    this.root.destroy({ children: true })
    this.tread.destroy(true)
    this.glow.destroy(true)
  }
}
