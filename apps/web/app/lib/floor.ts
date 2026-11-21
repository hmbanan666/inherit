import { Container, Graphics, Text } from 'pixi.js'
import {
  MACHINES,
  RECIPES,
  type CampaignWorld,
  type CampaignBelt,
  type CampaignMachine,
  type Tile,
  type Plot,
} from '@inherit/sim'
import { machineArt, materialArt, itemPop, drawHiccup } from './machineArt'

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
  g.roundRect(x + 5, y + 9, w - 8, h - 8, 6).fill(0x17181a)
  g.roundRect(x + 2, y + 2, w - 6, h - 7, 5)
    .fill(owned ? 0x414247 : locked ? 0x25262a : 0x323338)
    .stroke({ color: owned ? 0x6a6b70 : 0x48494e, width: 2 })
  for (let i = 0; i < p.width; i++)
    for (let j = 0; j < p.height; j++) {
      const px = x + i * tile,
        py = y + j * tile
      if (owned) {
        // Cast floor plates with recessed joins, two rivets and fine aggregate.
        const shade = [0x414246, 0x45464a, 0x424347, 0x3e4044][(i * 7 + j * 3) % 4]!
        g.rect(px + 3, py + 3, tile - 6, tile - 6).fill(shade)
        g.moveTo(px + 4, py + tile - 4)
          .lineTo(px + tile - 4, py + tile - 4)
          .stroke({ color: 0x2f3034, width: 2 })
        for (const d of [8, tile - 9]) g.circle(px + d, py + (d === 8 ? 8 : tile - 9), 1.6).fill(0x65656a)
        for (let s = 0; s < 9; s++) {
          const dx = 9 + ((i * 19 + j * 3 + s * 73) % 77),
            dy = 9 + ((i * 7 + j * 31 + s * 41) % 77)
          g.moveTo(px + dx, py + dy)
            .lineTo(px + dx + 3, py + dy - 1)
            .stroke({ color: 0x25262b, width: 1, alpha: 0.26 })
        }
      } else {
        for (let s = 0; s < 9; s++) {
          const dx = 5 + ((i * 33 + j * 15 + s * 19) % 82),
            dy = 5 + ((j * 37 + i * 7 + s * 29) % 82)
          g.moveTo(px + dx, py + dy)
            .lineTo(px + dx + 2, py + dy - 4)
            .lineTo(px + dx + 3, py + dy - 1)
            .stroke({ color: locked ? 0x36373b : 0x4a4a4e, width: 1.5 })
        }
      }
    }
  if (owned) {
    // Corrugated sill, lamps, hazard paint and the old shop stencil.
    g.rect(x + 4, y + 3, w - 12, 13).fill(0x2a2b2e)
    for (let i = 12; i < w - 16; i += 12) g.rect(x + i, y + 4, 4, 10).fill(0x505157)
    for (let i = 36; i < w - 22; i += 144) {
      g.roundRect(x + i - 4, y + 9, 32, 7, 3).fill(0x242529)
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
        0xa3a298,
      ),
    )
    sign.position.set(x + 20, y + 25)
  } else {
    for (let i = 12; i < h - 12; i += 21) g.rect(x + 5, y + i, 2, 11).fill(locked ? 0x4d4e52 : 0x9c925a)
    for (let i = 12; i < w - 12; i += 21) g.rect(x + i, y + 5, 11, 2).fill(locked ? 0x4d4e52 : 0x9c925a)
    if (locked)
      for (let i = 20; i < w - 80; i += 36)
        g.moveTo(x + i, y + 25)
          .lineTo(x + i + 65, y + 90)
          .stroke({ color: 0x36373c, width: 12, alpha: 0.48 })
  }
}

function rails(parent: Container, b: CampaignBelt) {
  const g = parent.addChild(new Graphics())
  const points = b.path.map((p) => center(b.siteId, p))
  for (const [width, color] of [
    [24, 0x202126],
    [20, 0x85858a],
    [16, 0x303136],
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
        .stroke({ color: 0x62646a, width: 2 })
    }
  }
  return g
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
  idle: 0x8a8a90,
  jammed: 0xf48360,
  broken: 0xe79355,
}
type FloorStatus = CampaignMachine['status'] | NonNullable<CampaignMachine['fault']>
type MachineArt = {
  art: Graphics
  ring: Graphics
  halo: Graphics
  status?: FloorStatus
  fire?: Graphics
  hiccup: Graphics
  stuck?: Graphics
  stuckKind?: string
  processed: number
  built: number
  pulse: number
}
const beltKey = (belt: CampaignBelt) => JSON.stringify([belt.siteId, belt.from, belt.to])
// The original floor component replaces its scene when the topology changes.
// Keep the last topology on that stage so only newly built equipment animates.
const stageTopology = new WeakMap<Container, { machines: Set<string>; belts: Set<string> }>()

export class FloorScene {
  root = new Container()
  private tracks = new Container()
  private cargo = new Container()
  private machines = new Map<string, MachineArt>()
  private belts = new Map<string, { art: Graphics; built: number }>()
  private items = new Map<string, { art: Graphics; x: number; y: number; fromX: number; fromY: number }>()
  private pops: { art: Graphics; x: number; y: number; birth: number; steam?: boolean }[] = []
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
        base.ellipse(x, y + 5, 31, 14).fill({ color: 0x202126, alpha: 0.42 })
        for (let i = 0; i < 7; i++) {
          const ore = this.root.addChild(
            materialArt(deposit.kind === 'coal' ? 'coal' : deposit.kind + '-ore'),
          )
          ore.position.set(x - 19 + ((i * 11) % 39), y - 7 + ((i * 8) % 16))
          ore.scale.set(1 + (i % 3) * 0.24)
        }
      }
    }
    this.root.addChild(this.tracks, this.cargo)
    this.syncEquipment(world, -Infinity)
    this.root.once('added', (stage: Container) => {
      const previous = stageTopology.get(stage)
      if (!previous) return
      const now = performance.now()
      for (const m of world.machines)
        if (m.builtByCode && !previous.machines.has(m.id)) this.machines.get(m.id)!.built = now
      for (const b of world.belts)
        if (b.builtByCode && !previous.belts.has(beltKey(b))) this.belts.get(beltKey(b))!.built = now
    })
  }
  private syncEquipment(world: CampaignWorld, now: number) {
    const machineIds = new Set(world.machines.map((m) => m.id))
    for (const [id, view] of this.machines) {
      if (machineIds.has(id)) continue
      view.ring.destroy({ children: true })
      view.art.destroy({ children: true })
      this.machines.delete(id)
    }
    const beltIds = new Set(world.belts.map(beltKey))
    for (const [id, view] of this.belts) {
      if (beltIds.has(id)) continue
      view.art.destroy()
      this.belts.delete(id)
    }
    for (const b of world.belts) {
      const id = beltKey(b)
      if (!this.belts.has(id))
        this.belts.set(id, { art: rails(this.tracks, b), built: b.builtByCode ? now : -Infinity })
    }
    for (const m of world.machines) {
      if (this.machines.has(m.id)) continue
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
      this.machines.set(m.id, {
        art,
        ring,
        halo: ring.addChild(new Graphics()),
        fire,
        hiccup: art.addChild(new Graphics()),
        processed: m.stats.processed,
        built: m.builtByCode ? now : -Infinity,
        pulse: -Infinity,
      })
    }
  }
  highlightMachine(id: string) {
    const machine = this.machines.get(id)
    if (machine) machine.pulse = performance.now()
  }
  update(world: CampaignWorld) {
    const now = performance.now()
    this.world = world
    this.syncEquipment(world, now)
    for (const m of world.machines) {
      const view = this.machines.get(m.id)!
      const status = m.fault ?? m.status
      if (view.fire) view.fire.visible = status === 'working'
      if (view.status !== status) {
        const color = statusColor[status]
        view.ring
          .clear()
          .ellipse(0, 8, 44, 17)
          .fill({ color, alpha: 0.14 })
          .stroke({ color, width: 2, alpha: status === 'idle' ? 0.35 : 0.9 })
        view.status = status
      }
      const recipe = m.recipe ?? MACHINES[m.kind].defaultRecipe
      const stuckKind =
        status === 'jammed'
          ? (
              m.queue.find((item) => recipe && !Object.hasOwn(RECIPES[recipe].inputs, item.kind)) ??
              m.queue[0]
            )?.kind
          : undefined
      if (stuckKind !== view.stuckKind) {
        view.stuck?.destroy()
        view.stuck = stuckKind ? view.art.addChild(materialArt(stuckKind)) : undefined
        view.stuck?.position.set(-25, -8)
        view.stuckKind = stuckKind
      }
      if (m.stats.processed > view.processed) {
        const p = center(m.siteId, m)
        const art = this.root.addChild(new Graphics())
        for (const [x, y, r] of [
          [-6, 1, 4],
          [-1, -2, 5],
          [4, 0, 4],
          [8, -3, 2],
        ])
          art.circle(x, y, r).fill({ color: 0xf2dac0, alpha: 0.85 })
        this.pops.push({ art, x: p.x + 15, y: p.y - 25, birth: now, steam: true })
      }
      view.processed = m.stats.processed
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
        const art = old?.art ?? this.cargo.addChild(materialArt(item.kind, item.defect))
        if (!old) art.position.set(pos.x, pos.y)
        art.scale.set(1.34)
        this.items.set(id, {
          art,
          ...pos,
          fromX: art.x,
          fromY: art.y,
        })
      }
    for (const [i, hop] of (world.hops ?? []).entries()) {
      const from = world.machines.find(m => m.id === hop.from)
      const to = world.machines.find(m => m.id === hop.to)
      if (!from || !to) continue
      const start = center(from.siteId, from), end = center(to.siteId, to)
      const art = this.cargo.addChild(materialArt(hop.item))
      const id = 'hop-' + world.tick + '-' + i
      art.position.set(start.x, start.y)
      art.scale.set(1.34)
      seen.add(id)
      this.items.set(id, {art, ...end, fromX:start.x, fromY:start.y})
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
      item.art.position.set(item.fromX + (item.x - item.fromX) * t, item.fromY + (item.y - item.fromY) * t - 12 * Math.sin(Math.PI * t))
    for (const view of this.belts.values()) {
      const build = Math.min(1, Math.max(0, (now - view.built) / 420))
      view.art.alpha = 0.12 + build * 0.88
      view.art.tint = build < 0.75 ? 0xffdfa4 : 0xffffff
    }
    for (const m of this.world.machines) {
      const view = this.machines.get(m.id)!
      const { art: a, fire, halo, hiccup } = view
      const p = center(m.siteId, m)
      const status = m.fault ?? m.status
      const pulse = Math.max(0, (now - view.pulse) / 750)
      if (pulse < 1) {
        halo
          .clear()
          .ellipse(0, 8, 42 + 9 * pulse, 20 + 4 * pulse)
          .stroke({ color: 0xffd888, width: 3, alpha: 1 - pulse })
      }
      halo.visible = pulse < 1
      const build = Math.min(1, Math.max(0, (now - view.built) / 420))
      const lift = (1 - build) ** 2
      a.scale.set(1 - 0.35 * lift + 0.045 * Math.sin(Math.PI * build))
      a.alpha = 1 - 0.7 * lift
      if (status === 'broken' || status === 'jammed') drawHiccup(hiccup, status, paused ? 600 : now)
      else if (hiccup.visible) hiccup.clear()
      hiccup.visible = status === 'broken' || status === 'jammed'
      if (fire?.visible) fire.alpha = paused ? 0.85 : 0.8 + Math.sin(now / 100) * 0.18
      a.position.set(
        p.x,
        p.y - 15 * lift + (status === 'working' && !paused ? Math.sin(now / 58) * 1.6 : 0),
      )
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
      if (p.steam) {
        p.art.x += t * 9
        p.art.scale.set(0.55 + t * 1.1)
        p.art.alpha = (1 - t) ** 1.4
      }
      return true
    })
  }
  destroy() {
    if (this.root.parent)
      stageTopology.set(this.root.parent, {
        machines: new Set(this.machines.keys()),
        belts: new Set(this.belts.keys()),
      })
    this.root.destroy({ children: true })
  }
}
