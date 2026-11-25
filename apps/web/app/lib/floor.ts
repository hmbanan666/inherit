import { CanvasSource, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import type { Cell, World } from '@inherit/sim/v8'
import { illustration, type Paint } from './art/townPaint'
import { drawBuilding } from './art/townBuildings'
import { landscape } from './art/townLandscape'
import { portrait } from './art/townPortrait'
import { fieldBounds, villageHomes, type VillageView } from './village'
import { drawing, mountingPlate } from './art/shared'
import { depot, furnace, truck } from './art/floorMachines'
import { assembler, cutter, press as pressDrawing } from './art/fabrication'
import { materialArt, type Material } from './art/materials'
import {
  cartDrawScale, cartMark, pauseMark, hoverScale, hoverStroke, selectionColor, selectionStroke, stationShapes, stationsOf,
  cameo, npcCaptionY, npcMarker, npcShapes, tile, type CartHit, type Shape,
} from './floorPick'

export type FloorWorld = Omit<World, 'memory'>
export { tile } from './floorPick'
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

function loadArt(carrying: FloorWorld['drones'][number]['carrying']): Material {
  if (carrying === 'coal') return 'coal'
  if (carrying === 'ingot' || carrying === 'plate' || carrying === 'hinge' || carrying === 'lamp') return 'iron-ingot'
  if (carrying === 'steel' || carrying === 'grate' || carrying === 'blank' || carrying === 'gear' || carrying === 'pin' || carrying === 'cut' || carrying === 'shutter' || carrying === 'winch') return 'steel'
  return 'iron-ore'
}

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

function print(w: number, h: number, draw: (p: Paint) => void) {
  const source = new CanvasSource({ resource: illustration(w, h, draw), resolution: 2 })
  return new Sprite(new Texture({ source }))
}

function village(scene: Container, grid: World['grid']) {
  const { left, height } = fieldBounds(grid)
  const ground = print(-left, height, p => {
    // The ground in the archived 1000 × 420 landscape starts below the horizon.
    const scale = height / (420 - 176)
    p.at(-480 * scale, -176 * scale, scale, () => landscape(p, 'day'))
  })
  scene.addChild(ground).x = left
  const road = scene.addChild(new Graphics())
  road.rect(-tile * 0.75, 0, tile / 2, height).fill(0xd5c392)
  road.rect(-tile / 2, tile * 1.25, tile / 2, tile / 2).fill(0xd5c392)
  for (let row = 0; row < grid.height; row++) {
    if (row === 1) continue
    const y = row * tile
    road.rect(-5, y, 4, tile).fill(0x685c4c)
    road.rect(-7, y, 7, 7).rect(-7, y + tile - 7, 7, 7).fill(0xbdac87)
  }
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

type VillageNpc = VillageView['npcs'][number]
type House = VillageView['houses'][number]

function villagerToken(layer: Container, npc: VillageNpc) {
  const art = layer.addChild(new Container())
  const { x, y } = center(npc.spot)
  art.position.set(x, y)
  const face = art.addChild(print(60, 64, p => portrait(p, npc.who, 'waiting')))
  face.anchor.set(0.5)
  face.y = cameo.y
  face.setSize(cameo.radius * 2, cameo.radius * 2)
  face.mask = art.addChild(new Graphics()).circle(0, cameo.y, cameo.radius).fill(0xffffff)
  art.addChild(new Graphics()).circle(0, cameo.y, cameo.radius).stroke({ width: 2, color: 0x2a2b2e })
  caption(art, npc.name, 0, npcCaptionY)
  const badge = art.addChild(new Graphics()).circle(0, 0, npcMarker.radius).fill(0xffffff)
  badge.y = npcMarker.y
  const glyph = badge.addChild(label('', 16, 0x242529))
  glyph.anchor.set(0.5)
  return { art, badge, glyph, name: npc.name }
}

export class FloorScene {
  root = new Container()
  private readonly haulers: {
    art: Container
    cargo: Graphics
    load: Material
    badge: Text
    name: Text
    bar: Graphics
    pause: Graphics
    fromX: number
    fromY: number
    x: number
    y: number
  }[] = []
  private readonly seen = new Set<string>()
  private readonly veinBars = new Map<string, Graphics>()
  private readonly stations = new Map<string, Container>()
  private readonly villageLayer = new Container({ label: 'village' })
  private readonly houses = new Map<House['building'], { state: House['state']; art: Sprite }>()
  private readonly npcLayer = new Container({ label: 'villagers' })
  private readonly npcs = new Map<string, ReturnType<typeof villagerToken>>()
  private readonly equipmentLayer = new Container({ label: 'equipment' })
  private readonly paths: Graphics
  private readonly ring: Graphics
  private readonly fire: Graphics
  private readonly ingot: Graphics
  private readonly steelMark: Graphics
  private pressArt?: Container
  private pressWork?: Graphics
  private pressMark?: Container
  private spareArt?: Container
  private spareWork?: Graphics
  private spareMark?: Container
  private latheArt?: Container
  private latheWork?: Graphics
  private latheMark?: Container
  private benchArt?: Container
  private benchWork?: Graphics
  private benchMark?: Container
  private arrivals = 0
  private lastTick = -1
  private hover = ''
  private selected = ''
  private latest: FloorWorld

  constructor(world: FloorWorld) {
    this.latest = world
    land(this.root, world.grid)
    this.paths = this.root.addChild(new Graphics({ label: 'routes' }))
    this.root.addChild(this.villageLayer, this.equipmentLayer, this.npcLayer)
    for (const vein of world.veins) this.placeVein(vein)
    const yard = equipment(this.equipmentLayer, world.depot.pos, depot)
    caption(yard, 'Depot', 0, -63)
    this.stations.set('depot', yard)
    const smelter = equipment(this.equipmentLayer, world.furnace.pos, furnace)
    caption(smelter, 'Furnace', 0, -63)
    this.stations.set('furnace', smelter)
    this.fire = smelter.addChild(new Graphics())
    this.fire.ellipse(3, -22, 15, 4.5).fill(0xf3a94d)
    this.fire.ellipse(3, -22, 9, 2.6).fill(0xffdb80)
    this.ingot = smelter.addChild(materialArt('iron-ingot'))
    this.ingot.position.set(31, 18)
    this.steelMark = smelter.addChild(materialArt('steel'))
    this.steelMark.position.set(31, 18)
    this.steelMark.visible = false
    this.syncPress(world)
    this.syncSpare(world)
    this.syncLathe(world)
    this.syncBench(world)
    this.ring = this.root.addChild(new Graphics())
    for (const drone of world.drones) this.placeHauler(drone)
  }

  setVillage(view: VillageView) {
    if (!this.villageLayer.children.length) village(this.villageLayer, this.latest.grid)
    for (const { building, state } of view.houses) {
      const house = this.houses.get(building)
      if (house?.state === state) continue
      house?.art.destroy({ texture: true, textureSource: true })
      const art = print(210, 176, p => p.at(105, 138, 1, () => drawBuilding(p, building, state, 'day', undefined)))
      art.anchor.set(0.5)
      art.scale.set(tile / 210)
      const { x, y } = center(villageHomes[building])
      art.position.set(x, y)
      this.villageLayer.addChild(art)
      this.houses.set(building, { state, art })
    }
    for (const npc of view.npcs) {
      let token = this.npcs.get(npc.id)
      if (!token) {
        token = villagerToken(this.npcLayer, npc)
        this.npcs.set(npc.id, token)
      }
      token.art.alpha = npc.dim ? 0.55 : 1
      token.badge.visible = !!npc.mark
      if (npc.mark) {
        token.badge.tint = npc.mark === 'active' ? 0x8a8a8a : selectionColor
        token.glyph.text = npc.mark === 'offer' ? '!' : '?'
      }
    }
  }

  npcAnchors() {
    return Array.from(this.npcs, ([id, { art, badge, name }]) => ({ id, x: art.x, y: art.y, name, marked: badge.visible }))
  }

  private placeVein(vein: FloorWorld['veins'][number]) {
    if (vein.hidden || this.seen.has(vein.name)) return
    this.seen.add(vein.name)
    const { x, y } = center(vein.pos)
    const group = this.equipmentLayer.addChild(new Container())
    group.position.set(x, y)
    this.stations.set(`Vein ${vein.name}`, group)
    group.addChild(new Graphics()).ellipse(0, 5, 31, 14).fill({ color: 0x202126, alpha: 0.42 })
    const rock = vein.kind === 'coal' ? 'coal' : 'iron-ore'
    for (let i = 0; i < 7; i++) {
      const ore = group.addChild(materialArt(rock))
      ore.position.set(-19 + ((i * 11) % 39), -7 + ((i * 8) % 16))
      ore.scale.set(1 + (i % 3) * 0.24)
    }
    const tint = vein.purity === 'rich' ? 0xe0b15a : vein.purity === 'normal' ? 0x8d9a6a : 0x7a6558
    group.addChild(new Graphics()).ellipse(0, 4, 36, 16).stroke({ color: tint, width: 3, alpha: 0.9 })
    caption(group, `Vein ${vein.name}  ${vein.purity ?? 'poor'}`, 0, 22)
    const bar = group.addChild(new Graphics())
    this.veinBars.set(vein.name, bar)
  }

  private placeHauler(drone: FloorWorld['drones'][number]) {
    const d = drawing()
    truck(d)
    const art = this.root.addChild(new Container())
    art.addChild(d.g).scale.set(cartDrawScale)
    const load = loadArt(drone.carrying)
    const cargo = art.addChild(materialArt(load))
    cargo.position.set(-7, -12)
    const name = caption(art, drone.name, 0, 9)
    const badge = art.addChild(label(`${drone.cargo}/${drone.capacity}`, 13, 0xf2ead8))
    badge.anchor.set(0.5, 1)
    badge.position.set(0, -30)
    const bar = art.addChild(new Graphics())
    const pause = art.addChild(new Graphics({ label: 'pause' }))
    pause.position.set(pauseMark.x, pauseMark.y)
    pause.roundRect(0, 0, pauseMark.w, pauseMark.h, 2).fill(0x2a2b2e)
    pause.roundRect(2, 2, 3, 8, 1).roundRect(pauseMark.w - 5, 2, 3, 8, 1).fill(0xe7c56a)
    pause.visible = false
    const { x, y } = center(drone.pos)
    art.position.set(x, y + 20)
    this.haulers.push({ art, cargo, load, badge, name, bar, pause, fromX: art.x, fromY: art.y, x: art.x, y: art.y })
  }

  private showLoad(item: FloorScene['haulers'][number], drone: FloorWorld['drones'][number]) {
    const kind = loadArt(drone.carrying)
    if (item.load !== kind) {
      const index = item.art.getChildIndex(item.cargo)
      item.art.removeChild(item.cargo)
      item.cargo.destroy()
      item.cargo = item.art.addChildAt(materialArt(kind), index)
      item.cargo.position.set(-7, -12)
      item.load = kind
    }
    item.cargo.visible = drone.cargo > 0
  }

  highlight(id = '') {
    if (id === this.hover) return
    this.hover = id
    this.paintHover()
    this.paintRing(this.latest)
  }

  select(id = '') {
    if (id === this.selected) return
    this.selected = id
    this.paintRing(this.latest)
  }

  /** Live cart anchors, including the walk between cells. */
  cartAnchors() {
    const anchors: CartHit[] = []
    for (const [i, item] of this.haulers.entries()) {
      const id = this.latest.drones[i]?.name
      if (!id || !item.art.visible) continue
      anchors.push({ id, x: item.art.x, y: item.art.y, waiting: item.pause.visible })
    }
    return anchors
  }

  private paintHover() {
    const scale = (id: string | undefined) => id === this.hover ? hoverScale : 1
    for (const [id, { art }] of this.npcs) art.scale.set(scale(id))
    for (const [id, art] of this.stations) art.scale.set(scale(id))
    for (const [i, item] of this.haulers.entries()) item.art.scale.set(scale(this.latest.drones[i]?.name))
  }

  private paintRing(world: FloorWorld) {
    this.ring.clear()
    if (this.hover && this.hover !== this.selected) this.strokeId(world, this.hover, hoverStroke)
    if (this.selected) this.strokeId(world, this.selected, selectionStroke)
    this.root.addChild(this.ring)
  }

  private strokeId(world: FloorWorld, id: string, style: { width: number; alpha: number; grow: number }) {
    const drone = world.drones.findIndex(item => item.name === id)
    if (drone >= 0) {
      const hauler = this.haulers[drone]
      if (!hauler?.art.visible) return
      const { art, pause } = hauler
      const top = pause.visible ? pauseMark.y : cartMark.y
      this.strokeBox(art.x, art.y, { ...cartMark, y: top, h: cartMark.h + cartMark.y - top }, style)
      return
    }
    const npc = this.npcs.get(id)
    if (npc) {
      for (const shape of npcShapes(npc.name, npc.badge.visible)) this.strokeShape(npc.art.x, npc.art.y, shape, style)
      return
    }
    const spot = stationsOf(world).find(item => item.id === id)
    if (!this.stations.has(id) || !spot) return
    const origin = center(spot.pos)
    for (const shape of stationShapes(spot.kind, spot.title)) this.strokeShape(origin.x, origin.y, shape, style)
  }

  private strokeShape(x: number, y: number, shape: Shape, style: { width: number; alpha: number; grow: number }) {
    if (shape.type === 'ellipse') {
      const ellipse = shape.ellipse
      this.ring.ellipse(x + ellipse.cx, y + ellipse.cy, ellipse.rx + style.grow, ellipse.ry + style.grow)
        .stroke({ color: selectionColor, width: style.width, alpha: style.alpha })
      return
    }
    this.strokeBox(x, y, shape.box, style)
  }

  private strokeBox(x: number, y: number, box: { x: number; y: number; w: number; h: number }, style: { width: number; alpha: number; grow: number }) {
    const grow = style.grow
    this.ring.roundRect(x + box.x - grow, y + box.y - grow, box.w + grow * 2, box.h + grow * 2, 8)
      .stroke({ color: selectionColor, width: style.width, alpha: style.alpha })
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
  }

  private syncPress(world: FloorWorld) {
    const press = world.press
    if (!press) {
      if (this.pressArt) this.pressArt.visible = false
      return
    }
    if (!this.pressArt) {
      this.pressArt = equipment(this.equipmentLayer, press.pos, pressDrawing)
      caption(this.pressArt, 'Press', 0, -63)
      this.stations.set('press', this.pressArt)
      this.pressWork = this.pressArt.addChild(new Graphics())
      this.pressWork.ellipse(3, -22, 10, 3).fill(0xe7c56a)
      this.pressMark = this.pressArt.addChild(materialArt('steel'))
      this.pressMark.position.set(18, 8)
    }
    this.pressArt.visible = true
    if (this.pressWork) this.pressWork.visible = press.readyAt !== null
    const finished = (press.bin.qty.grate ?? 0) + (press.bin.qty.plate ?? 0) + (press.bin.qty.blank ?? 0) + (press.bin.qty.shutter ?? 0)
    if (this.pressMark) this.pressMark.visible = finished > 0
  }

  private syncLathe(world: FloorWorld) {
    const machine = world.lathe
    if (!machine) {
      if (this.latheArt) this.latheArt.visible = false
      return
    }
    if (!this.latheArt) {
      this.latheArt = equipment(this.equipmentLayer, machine.pos, cutter)
      caption(this.latheArt, 'Lathe', 0, -63)
      this.stations.set('lathe', this.latheArt)
      this.latheWork = this.latheArt.addChild(new Graphics())
      this.latheWork.ellipse(3, -22, 10, 3).fill(0xe7c56a)
      this.latheMark = this.latheArt.addChild(materialArt('steel'))
      this.latheMark.position.set(18, 8)
    }
    this.latheArt.visible = true
    if (this.latheWork) this.latheWork.visible = machine.readyAt !== null
    const finished = (machine.bin.qty.gear ?? 0) + (machine.bin.qty.pin ?? 0) + (machine.bin.qty.cut ?? 0)
    if (this.latheMark) this.latheMark.visible = finished > 0
  }

  private syncBench(world: FloorWorld) {
    const machine = world.bench
    if (!machine) {
      if (this.benchArt) this.benchArt.visible = false
      return
    }
    if (!this.benchArt) {
      this.benchArt = equipment(this.equipmentLayer, machine.pos, assembler)
      caption(this.benchArt, 'Assembly', 0, -63)
      this.stations.set('bench', this.benchArt)
      this.benchWork = this.benchArt.addChild(new Graphics())
      this.benchWork.ellipse(3, -22, 10, 3).fill(0xe7c56a)
      this.benchMark = this.benchArt.addChild(materialArt('iron-ingot'))
      this.benchMark.position.set(18, 8)
    }
    this.benchArt.visible = true
    if (this.benchWork) this.benchWork.visible = machine.readyAt !== null
    const finished = (machine.bin.qty.hinge ?? 0) + (machine.bin.qty.winch ?? 0) + (machine.bin.qty.lamp ?? 0)
    if (this.benchMark) this.benchMark.visible = finished > 0
  }

  private syncSpare(world: FloorWorld) {
    const press = world.spare
    if (!press) {
      if (this.spareArt) this.spareArt.visible = false
      return
    }
    if (!this.spareArt) {
      this.spareArt = equipment(this.equipmentLayer, press.pos, pressDrawing)
      caption(this.spareArt, 'Spare', 0, -63)
      this.stations.set('spare', this.spareArt)
      this.spareWork = this.spareArt.addChild(new Graphics())
      this.spareWork.ellipse(3, -22, 10, 3).fill(0xe7c56a)
      this.spareMark = this.spareArt.addChild(materialArt('steel'))
      this.spareMark.position.set(18, 8)
    }
    this.spareArt.visible = true
    if (this.spareWork) this.spareWork.visible = press.readyAt !== null
    const finished = (press.bin.qty.grate ?? 0) + (press.bin.qty.plate ?? 0) + (press.bin.qty.blank ?? 0) + (press.bin.qty.shutter ?? 0)
    if (this.spareMark) this.spareMark.visible = finished > 0
  }

  update(world: FloorWorld) {
    this.latest = world
    this.syncPress(world)
    this.syncSpare(world)
    this.syncLathe(world)
    this.syncBench(world)
    for (const vein of world.veins) this.placeVein(vein)
    while (this.haulers.length < world.drones.length) this.placeHauler(world.drones[this.haulers.length]!)
    const snap = new Set<number>()
    for (const item of this.haulers.slice(world.drones.length)) item.art.visible = false
    for (const [i, drone] of world.drones.entries()) {
      const item = this.haulers[i]!
      if (!item.art.visible) snap.add(i)
      item.art.visible = true
      item.name.text = drone.name
      item.badge.text = `${drone.cargo}/${drone.capacity}`
      item.bar.clear()
      item.pause.visible = (drone.wait?.ticks ?? 0) > 0
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
      const width = 40 * Math.min(1, digger.dig.ticks / vein.ticksPerUnit)
      bar.roundRect(-20, 42, 40, 4, 1).fill(0x2a2b2e)
      bar.roundRect(-20, 42, width, 4, 1).fill(0xe7c56a)
    }
    this.paintRoutes(world)
    this.paintHover()
    this.paintRing(world)
    for (const i of snap) {
      const item = this.haulers[i]!
      const drone = world.drones[i]!
      const pos = center(drone.pos)
      item.x = pos.x
      item.y = pos.y + 20
      item.fromX = item.x
      item.fromY = item.y
      item.art.position.set(item.x, item.y)
      this.showLoad(item, drone)
    }
    if (world.tick === this.lastTick) return
    const restart = world.tick < this.lastTick
    this.lastTick = world.tick
    this.arrivals = performance.now()
    this.fire.visible = world.furnace.readyAt !== null
    this.ingot.visible = world.furnace.output > 0
    this.steelMark.visible = world.furnace.steel > 0
    this.steelMark.position.set(world.furnace.output > 0 ? 46 : 31, 18)
    for (const [i, drone] of world.drones.entries()) {
      const item = this.haulers[i]!
      const pos = center(drone.pos)
      item.x = pos.x
      item.y = pos.y + 20
      item.fromX = restart ? item.x : item.art.x
      item.fromY = restart ? item.y : item.art.y
      this.showLoad(item, drone)
    }
  }

  animate(now: number, interval: number, paused: boolean) {
    const t = paused ? 1 : Math.min(1, (now - this.arrivals) / interval)
    for (const item of this.haulers)
      item.art.position.set(item.fromX + (item.x - item.fromX) * t, item.fromY + (item.y - item.fromY) * t)
    if (this.hover || this.selected) this.paintRing(this.latest)
    if (this.fire.visible) this.fire.alpha = paused ? 0.85 : 0.8 + Math.sin(now / 100) * 0.18
  }
}
