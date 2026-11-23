import { Container, Graphics, Text } from 'pixi.js'
import type { Cell, World } from '@inherit/sim/v8'
import { drawing, mountingPlate } from './art/shared'
import { depot, furnace, truck } from './art/floorMachines'
import { materialArt } from './art/materials'

export type FloorWorld = Omit<World, 'memory'>
export const tile = 96
function center(p: Cell) { return { x: (p.x + 0.5) * tile, y: (p.y + 0.5) * tile } }

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

function land(scene: Container, grid: World['grid']) {
  const g = scene.addChild(new Graphics())
  const x = 0, y = 0, w = grid.width * tile, h = grid.height * tile
  for (let i = 0; i < grid.width; i++)
    for (let j = 0; j < grid.height; j++) {
      const px = i * tile, py = j * tile
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
    }
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
  scene.addChild(label('INHERIT  /  MACHINE WORKS', 15, 0xa3a298)).position.set(20, 25)
}

function caption(parent: Container, title: string, x: number, y: number) {
  const text = parent.addChild(label(title, 16, 0xf2ead8))
  text.anchor.set(0.5, 0)
  text.position.set(x, y)
  return text
}

function equipment(parent: Container, pos: Cell, paint: (d: ReturnType<typeof drawing>) => void) {
  const d = drawing()
  mountingPlate(d)
  paint(d)
  const p = center(pos)
  parent.addChild(d.g).position.set(p.x, p.y)
  return d.g
}

export class FloorScene {
  root = new Container()
  private readonly haulers: {
    art: Container
    cargo: Graphics
    badge: Text
    bar: Graphics
    offset: number
    fromX: number
    fromY: number
    x: number
    y: number
  }[] = []
  private readonly seen = new Set<string>()
  private readonly veinBars = new Map<string, Graphics>()
  private readonly paths: Graphics
  private readonly ring: Graphics
  private readonly fire: Graphics
  private readonly ingot: Graphics
  private arrivals = 0
  private lastTick = -1
  private hover = ''
  private latest: FloorWorld

  constructor(world: FloorWorld) {
    this.latest = world
    land(this.root, world.grid)
    this.paths = this.root.addChild(new Graphics())
    for (const vein of world.veins) this.placeVein(vein)
    caption(equipment(this.root, world.depot.pos, depot), 'Depot', 0, -63)
    const smelter = equipment(this.root, world.furnace.pos, furnace)
    caption(smelter, 'Furnace', 0, -63)
    this.fire = smelter.addChild(new Graphics())
    this.fire.ellipse(3, -22, 15, 4.5).fill(0xf3a94d)
    this.fire.ellipse(3, -22, 9, 2.6).fill(0xffdb80)
    this.ingot = smelter.addChild(materialArt('iron-ingot'))
    this.ingot.position.set(31, 18)
    this.ring = this.root.addChild(new Graphics())
    for (const drone of world.drones) this.placeHauler(drone)
  }

  private placeVein(vein: FloorWorld['veins'][number]) {
    if (vein.hidden || this.seen.has(vein.name)) return
    this.seen.add(vein.name)
    const { x, y } = center(vein.pos)
    this.root.addChild(new Graphics()).ellipse(x, y + 5, 31, 14).fill({ color: 0x202126, alpha: 0.42 })
    const rock = vein.kind === 'coal' ? 'coal' : 'iron-ore'
    for (let i = 0; i < 7; i++) {
      const ore = this.root.addChild(materialArt(rock))
      ore.position.set(x - 19 + ((i * 11) % 39), y - 7 + ((i * 8) % 16))
      ore.scale.set(1 + (i % 3) * 0.24)
    }
    const tint = vein.purity === 'rich' ? 0xe0b15a : vein.purity === 'normal' ? 0x8d9a6a : 0x7a6558
    this.root.addChild(new Graphics()).ellipse(x, y + 4, 36, 16).stroke({ color: tint, width: 3, alpha: 0.9 })
    caption(this.root, `Vein ${vein.name}  ${vein.purity ?? 'poor'}`, x, y + 22)
    const bar = this.root.addChild(new Graphics())
    this.veinBars.set(vein.name, bar)
  }

  private placeHauler(drone: FloorWorld['drones'][number]) {
    const d = drawing()
    truck(d)
    const art = this.root.addChild(new Container())
    art.addChild(d.g).scale.set(0.54)
    const cargo = art.addChild(materialArt(drone.carrying === 'coal' ? 'coal' : 'iron-ore'))
    cargo.position.set(-7, -12)
    caption(art, drone.name, 0, 9)
    const badge = art.addChild(label(`${drone.cargo}/${drone.capacity}`, 13, 0xf2ead8))
    badge.anchor.set(0.5, 1)
    badge.position.set(0, -30)
    const bar = art.addChild(new Graphics())
    const { x, y } = center(drone.pos)
    art.position.set(x, y + 20)
    this.haulers.push({ art, cargo, badge, bar, offset: 0, fromX: art.x, fromY: art.y, x: art.x, y: art.y })
  }

  highlight(id = '') {
    if (id === this.hover) return
    this.hover = id
    this.paintRing(this.latest)
  }

  private paintRing(world: FloorWorld) {
    this.ring.clear()
    if (!this.hover) return
    const spots = [
      ...world.drones.map(drone => ({ id: drone.name, pos: drone.pos })),
      ...world.veins.filter(vein => !vein.hidden).map(vein => ({ id: `Vein ${vein.name}`, pos: vein.pos })),
      { id: 'furnace', pos: world.furnace.pos },
      { id: 'depot', pos: world.depot.pos },
    ]
    const spot = spots.find(item => item.id === this.hover)
    if (!spot) return
    const point = center(spot.pos)
    this.ring.circle(point.x, point.y, 38).stroke({ color: 0xeabe50, width: 2, alpha: 0.85 })
  }

  private paintRoutes(world: FloorWorld) {
    this.paths.clear()
    let drawn = false
    for (const drone of world.drones) {
      const route = drone.route
      if (!route?.length) continue
      drawn = true
      const start = center(drone.pos)
      this.paths.moveTo(start.x, start.y)
      for (const step of route) {
        const point = center(step)
        this.paths.lineTo(point.x, point.y)
      }
    }
    if (drawn) this.paths.stroke({ color: 0xe7c56a, width: 8, alpha: 0.55 })
    this.root.addChild(this.paths)
  }

  update(world: FloorWorld) {
    this.latest = world
    for (const vein of world.veins) this.placeVein(vein)
    while (this.haulers.length < world.drones.length) this.placeHauler(world.drones[this.haulers.length]!)
    const count = world.drones.length
    for (const [i, item] of this.haulers.entries()) item.offset = (i - (count - 1) / 2) * 25
    for (const [i, drone] of world.drones.entries()) {
      const item = this.haulers[i]!
      item.badge.text = `${drone.cargo}/${drone.capacity}`
      item.bar.clear()
      const dig = drone.dig
      const vein = dig && world.veins.find(entry => entry.name === dig.vein)
      if (dig && vein && dig.ticks > 0) {
        const width = 36 * Math.min(1, dig.ticks / vein.ticksPerUnit)
        item.bar.roundRect(-18, -44, 36, 4, 1).fill(0x2a2b2e)
        item.bar.roundRect(-18, -44, width, 4, 1).fill(0xe7c56a)
      }
    }
    for (const [name, bar] of this.veinBars) {
      bar.clear()
      const vein = world.veins.find(entry => entry.name === name)
      const digger = world.drones.find(drone => drone.dig?.vein === name && (drone.dig?.ticks ?? 0) > 0)
      if (!vein || !digger?.dig) continue
      const { x, y } = center(vein.pos)
      const width = 40 * Math.min(1, digger.dig.ticks / vein.ticksPerUnit)
      bar.roundRect(x - 20, y + 42, 40, 4, 1).fill(0x2a2b2e)
      bar.roundRect(x - 20, y + 42, width, 4, 1).fill(0xe7c56a)
    }
    this.paintRoutes(world)
    this.paintRing(world)
    if (world.tick === this.lastTick) return
    const restart = world.tick < this.lastTick
    this.lastTick = world.tick
    this.arrivals = performance.now()
    this.fire.visible = world.furnace.readyAt !== null
    this.ingot.visible = world.furnace.output > 0 || world.furnace.steel > 0
    for (const [i, drone] of world.drones.entries()) {
      const item = this.haulers[i]!
      const pos = center(drone.pos)
      item.x = pos.x + item.offset
      item.y = pos.y + 20
      item.fromX = restart ? item.x : item.art.x
      item.fromY = restart ? item.y : item.art.y
      item.cargo.visible = drone.cargo > 0
    }
  }

  animate(now: number, interval: number, paused: boolean) {
    const t = paused ? 1 : Math.min(1, (now - this.arrivals) / interval)
    for (const item of this.haulers)
      item.art.position.set(item.fromX + (item.x - item.fromX) * t, item.fromY + (item.y - item.fromY) * t)
    if (this.fire.visible) this.fire.alpha = paused ? 0.85 : 0.8 + Math.sin(now / 100) * 0.18
  }
}
