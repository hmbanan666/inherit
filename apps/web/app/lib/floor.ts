import { Container, Graphics, Text } from 'pixi.js'
import type { CampaignWorld, CampaignBelt, Tile, Plot } from '@inherit/sim'
import { machineArt, materialArt, itemPop } from './machineArt'

export const tile = 96
export const siteX = (site: string) => (site === 'yard' ? 18 : 0)
export function center(site: string, p: Tile) {
  return { x: (siteX(site) + p.x + 0.5) * tile, y: (p.y + 0.5) * tile }
}
const label = (text: string, size: number, color: number) =>
  new Text({
    text,
    style: {
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: size,
      fill: color,
      letterSpacing: 1.3,
    },
  })

function land(scene: Container, site: string, p: Plot) {
  const x = (siteX(site) + p.x) * tile,
    y = p.y * tile,
    w = p.width * tile,
    h = p.height * tile
  const g = scene.addChild(new Graphics())
  const owned = p.status === 'owned',
    locked = p.status === 'locked'
  g.roundRect(x + 5, y + 9, w - 8, h - 8, 6).fill(0x141a19)
  g.roundRect(x + 2, y + 2, w - 6, h - 7, 5)
    .fill(owned ? 0x41453e : locked ? 0x262d2a : 0x343c32)
    .stroke({ color: owned ? 0x6b7061 : 0x4b5446, width: 2 })
  for (let i = 0; i < p.width; i++)
    for (let j = 0; j < p.height; j++) {
      const px = x + i * tile,
        py = y + j * tile
      if (owned) {
        // Cast floor plates with recessed joins, two rivets and fine aggregate.
        const shade = [0x44483f, 0x484b42, 0x454a42, 0x40463e][(i * 7 + j * 3) % 4]!
        g.rect(px + 3, py + 3, tile - 6, tile - 6).fill(shade)
        g.moveTo(px + 4, py + tile - 4)
          .lineTo(px + tile - 4, py + tile - 4)
          .stroke({ color: 0x30372f, width: 2 })
        for (const d of [8, tile - 9]) g.circle(px + d, py + (d === 8 ? 8 : tile - 9), 1.6).fill(0x63675a)
        for (let s = 0; s < 9; s++) {
          const dx = 9 + ((i * 19 + j * 3 + s * 73) % 77),
            dy = 9 + ((i * 7 + j * 31 + s * 41) % 77)
          g.moveTo(px + dx, py + dy)
            .lineTo(px + dx + 3, py + dy - 1)
            .stroke({ color: 0x242b25, width: 1, alpha: 0.26 })
        }
      } else {
        for (let s = 0; s < 9; s++) {
          const dx = 5 + ((i * 33 + j * 15 + s * 19) % 82),
            dy = 5 + ((j * 37 + i * 7 + s * 29) % 82)
          g.moveTo(px + dx, py + dy)
            .lineTo(px + dx + 2, py + dy - 4)
            .lineTo(px + dx + 3, py + dy - 1)
            .stroke({ color: locked ? 0x363c35 : 0x4b5444, width: 1.5 })
        }
      }
    }
  if (owned) {
    // Corrugated sill, lamps, hazard paint and the old shop stencil.
    g.rect(x + 4, y + 3, w - 12, 13).fill(0x272e29)
    for (let i = 12; i < w - 16; i += 12) g.rect(x + i, y + 4, 4, 10).fill(0x52584b)
    for (let i = 36; i < w - 22; i += 144) {
      g.roundRect(x + i - 4, y + 9, 32, 7, 3).fill(0x252b24)
      g.roundRect(x + i, y + 10, 24, 3, 1).fill(0xd7c18d)
    }
    for (let i = 16; i < 105; i += 13)
      g.poly([x + i, y + h - 7, x + i + 7, y + h - 7, x + i + 13, y + h - 15, x + i + 6, y + h - 15]).fill(
        0xa38d4b,
      )
    for (const dx of [0, w - 31])
      for (const dy of [0, h - 31]) {
        g.rect(x + dx + 4, y + dy + 4, 22, 3).fill(0x99997e)
        g.rect(x + dx + 4, y + dy + 4, 3, 18).fill(0x99997e)
      }
    const sign = scene.addChild(
      label(
        p.id === 'shed-floor' ? 'INHERIT  /  MACHINE WORKS' : p.id.replaceAll('-', ' ').toUpperCase(),
        15,
        0x888c77,
      ),
    )
    sign.position.set(x + 20, y + 25)
  } else {
    for (let i = 12; i < h - 12; i += 21) g.rect(x + 5, y + i, 2, 11).fill(locked ? 0x51574a : 0x9c925a)
    for (let i = 12; i < w - 12; i += 21) g.rect(x + i, y + 5, 11, 2).fill(locked ? 0x51574a : 0x9c925a)
    if (locked)
      for (let i = 20; i < w - 80; i += 36)
        g.moveTo(x + i, y + 25)
          .lineTo(x + i + 65, y + 90)
          .stroke({ color: 0x384038, width: 12, alpha: 0.48 })
  }
}

function rails(parent: Container, b: CampaignBelt) {
  const g = parent.addChild(new Graphics())
  const points = b.path.map((p) => center(b.siteId, p))
  for (const [width, color] of [
    [24, 0x232823],
    [20, 0x818372],
    [16, 0x2e3632],
  ] as const) {
    points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
    g.stroke({ color, width, join: 'round', cap: 'round' })
  }
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      z = points[i]!,
      dx = Math.sign(z.x - a.x),
      dy = Math.sign(z.y - a.y)
    for (let d = 5; d < tile; d += 12) {
      const x = a.x + dx * d,
        y = a.y + dy * d
      g.moveTo(x - 5 * dy, y + 5 * dx)
        .lineTo(x + 3 * dx, y + 3 * dy)
        .lineTo(x + 5 * dy, y - 5 * dx)
        .stroke({ color: 0x657067, width: 2 })
    }
  }
}
function road(parent: Container) {
  const g = parent.addChild(new Graphics()),
    y = 2.5 * tile,
    x = 14 * tile,
    width = 4 * tile
  g.rect(x, y - 22, width, 44).fill(0x59574a)
  g.rect(x, y - 18, width, 36).fill(0x414440)
  for (let i = 4; i < width; i += 29) g.rect(x + i, y, 15, 2).fill(0xbfad70)
}
const statusColor = {
  working: 0x92cfaa,
  ready: 0xc9ba7d,
  starved: 0xb78a54,
  blocked: 0xdd785b,
  idle: 0x85948a,
}
export class FloorScene {
  root = new Container()
  private cargo = new Container()
  private machines = new Map<string, { art: Graphics; ring: Graphics; fire?: Graphics }>()
  private items = new Map<string, { art: Graphics; x: number; y: number; fromX: number; fromY: number }>()
  private pops: { art: Graphics; x: number; y: number; birth: number }[] = []
  private arrivals = 0
  private lastTick = -1
  private world: CampaignWorld
  constructor(world: CampaignWorld, yard: boolean) {
    this.world = world
    if (yard) road(this.root)
    for (const site of world.sites.filter((s) => s.id === 'shed' || yard)) {
      for (const plot of site.plots) land(this.root, site.id, plot)
      for (const deposit of site.deposits) {
        const { x, y } = center(site.id, deposit)
        const base = this.root.addChild(new Graphics())
        base.ellipse(x, y + 5, 31, 14).fill({ color: 0x202820, alpha: 0.42 })
        for (let i = 0; i < 7; i++) {
          const ore = this.root.addChild(
            materialArt(deposit.kind === 'coal' ? 'coal' : deposit.kind + '-ore'),
          )
          ore.position.set(x - 19 + ((i * 11) % 39), y - 7 + ((i * 8) % 16))
          ore.scale.set(1 + (i % 3) * 0.24)
        }
      }
    }
    for (const b of world.belts) rails(this.root, b)
    this.root.addChild(this.cargo)
    for (const m of world.machines) {
      const p = center(m.siteId, m)
      const ring = this.root.addChild(new Graphics())
      ring.position.set(p.x, p.y)
      const art = this.root.addChild(machineArt(m.kind, m.deposit))
      art.position.set(p.x, p.y)
      const fire = m.kind === 'furnace' ? art.addChild(new Graphics()) : undefined
      if (fire) {
        fire.ellipse(3, -22, 15, 4.5).fill(0xf3a94d)
        fire.ellipse(3, -22, 9, 2.6).fill(0xffdb80)
        for (const x of [-1, 3, 7]) fire.roundRect(x - 0.8, -3, 1.6, 8, 1).fill(0xffb657)
      }
      this.machines.set(m.id, { art, ring, fire })
    }
  }
  update(world: CampaignWorld) {
    const now = performance.now()
    this.world = world
    for (const m of world.machines) {
      const view = this.machines.get(m.id)!
      if (view.fire) view.fire.visible = m.status === 'working'
      view.ring
        .clear()
        .ellipse(0, 8, 44, 17)
        .fill({ color: statusColor[m.status], alpha: 0.14 })
        .stroke({ color: statusColor[m.status], width: 2, alpha: m.status === 'idle' ? 0.35 : 0.9 })
    }
    if (this.lastTick === world.tick) return
    this.lastTick = world.tick
    this.arrivals = now
    const seen = new Set<string>()
    for (const b of world.belts)
      for (const item of b.items) {
        const id = JSON.stringify([b.from, b.to, item.id]),
          pos = center(b.siteId, b.path[item.position]!)
        seen.add(id)
        const old = this.items.get(id)
        this.items.set(id, {
          art: old?.art ?? this.cargo.addChild(materialArt(item.kind, item.defect)),
          ...pos,
          fromX: old?.x ?? pos.x,
          fromY: old?.y ?? pos.y,
        })
      }
    for (const [id, item] of this.items)
      if (!seen.has(id)) {
        item.art.destroy()
        this.items.delete(id)
      }
    for (const event of world.lastEvents)
      if (event.type === 'delivered') {
        const m = world.machines.find((m) => m.id === event.machineId)
        if (!m) continue
        const p = center(m.siteId, m),
          art = this.root.addChild(new Graphics())
        art.circle(0, 0, 7).fill(0xf6c861).stroke({ color: 0x70522b, width: 2 })
        art.roundRect(-1, -4, 2, 8, 1).fill(0xa97532)
        this.pops.push({ art, x: p.x + 18, y: p.y - 29, birth: now })
      }
  }
  animate(now: number, interval: number, paused: boolean) {
    const t = Math.min(1, (now - this.arrivals) / interval)
    for (const item of this.items.values())
      item.art.position.set(item.fromX + (item.x - item.fromX) * t, item.fromY + (item.y - item.fromY) * t)
    for (const m of this.world.machines) {
      const a = this.machines.get(m.id)!.art,
        p = center(m.siteId, m)
      const fire = this.machines.get(m.id)!.fire
      if (fire?.visible) fire.alpha = paused ? 0.85 : 0.8 + Math.sin(now / 100) * 0.18
      a.position.set(p.x, p.y + (m.status === 'working' && !paused ? Math.sin(now / 58) * 1.6 : 0))
      const trip = m.kind === 'truck' && this.world.trips.find((trip) => trip.truckId === m.id)
      if (trip) {
        const progress = Math.max(
          0,
          Math.min(1, (this.world.tick - trip.tick + (paused ? 0 : t)) / Math.max(1, trip.due - trip.tick)),
        )
        const origin = this.world.machines.find((d) => d.id === trip.from)
        a.position.set((14 + (origin?.siteId === 'yard' ? 1 - progress : progress) * 4) * tile, 2.5 * tile)
      }
    }
    this.pops = this.pops.filter((p) => {
      const t = (now - p.birth) / 700
      if (t >= 1) {
        p.art.destroy()
        return false
      }
      itemPop(p.art, p.x, p.y, t)
      return true
    })
  }
  destroy() {
    this.root.destroy({ children: true })
  }
}
