import { CanvasSource, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import type { Cell, World } from '@inherit/sim/v8'
import { grain, illustration, type Paint } from './art/townPaint'
import { drawBuilding, horse } from './art/townBuildings'
import { fields, fir, landColors, orchard, splitRail } from './art/townLandscape'
import { portrait } from './art/townPortrait'
import {
  fieldBounds, houseBox, housePrint, houseScale, propArt, villageGround, villageHomes, villageProps, type VillageView,
} from './village'
import { advanceWander, markerBob, wanderEnvelope, wanderFrozen, wanderOffset, type WanderClock } from './wander'
import { screenBox, shapeBounds } from './popupPlace'
import { drawing, mountingPlate } from './art/shared'
import { depot, furnace, truck } from './art/floorMachines'
import { assembler, cutter, press as pressDrawing } from './art/fabrication'
import { materialArt, type Material } from './art/materials'
import {
  cartDrawScale, cartMark, pauseMark, hoverScale, hoverStroke, selectionColor, selectionStroke, stationShapes, stationsOf,
  cameo, captionBox, markLook, npcCaptionY, npcMarker, npcShapes, tile, type CartHit, type QuestMark, type Shape,
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
}

function print(w: number, h: number, draw: (p: Paint) => void, resolution = 2) {
  const source = new CanvasSource({ resource: illustration(w, h, draw, resolution), resolution })
  return new Sprite(new Texture({ source }))
}

const drawProp = {
  fir: (p: Paint) => fir(p, 0, 0, propArt.fir.height, '#3e625b', '#628278'),
  orchard: (p: Paint) => orchard(p, 0, 0, propArt.orchard.height, false),
  fields: (p: Paint) => fields(p, 0, 0, propArt.fields.width, propArt.fields.height, false),
  rail: (p: Paint) => splitRail(p, 0, 0, propArt.rail.length, 0),
  horse,
}

function village(scene: Container, grid: World['grid']) {
  const { left, height } = fieldBounds(grid)
  const ground = print(-left, height, p => p.at(-left, 0, 1, () => {
    const [grass, lane, earth, water, ripple] = landColors.day
    const { road, spur, lanes, river } = villageGround
    p.box(grass, left, 0, -left, height)
    for (const { x, y, w, h } of [road, spur, ...lanes]) p.box(earth, x, y, w, h)
    p.box(lane, road.x + 2, road.y, road.w - 4, road.h)
    for (const { x, y, w, h } of [spur, ...lanes]) p.box(lane, x, y + 2, w, h - 4)

    p.box(water, river.x, river.y, river.w, river.h)
    for (let y = river.y + 9; y < river.y + river.h; y += 13) {
      const x = river.x + 8 + grain(y) * (river.w - 34)
      p.line(ripple, 1.2, x, y, x + 5 + grain(y + 1) * 12, y)
    }
    for (const { kind, x, y, size } of villageProps) p.at(x, y, size, () => drawProp[kind](p))
  }))
  scene.addChild(ground).x = left
  const road = scene.addChild(new Graphics())
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

type VillageNpc = VillageView['npcs'][number]
type House = VillageView['houses'][number]

function villagerToken(layer: Container, npc: VillageNpc, neighbours: VillageNpc[]) {
  const art = layer.addChild(new Container())
  art.position.set(npc.spot.x, npc.spot.y)
  const face = art.addChild(print(60, 64, p => portrait(p, npc.who, 'waiting')))
  face.anchor.set(0.5)
  face.y = cameo.y
  face.setSize(cameo.radius * 2, cameo.radius * 2)
  face.mask = art.addChild(new Graphics()).circle(0, cameo.y, cameo.radius).fill(0xffffff)
  art.addChild(new Graphics()).circle(0, cameo.y, cameo.radius).stroke({ width: 2, color: 0x2a2b2e })
  caption(art, npc.name, 0, npcCaptionY)
  const badge = art.addChild(new Container())
  badge.y = npcMarker.y
  const disc = badge.addChild(new Graphics())
  const glyph = badge.addChild(label('', 16, 0x242529))
  glyph.anchor.set(0.5)
  const clock: WanderClock = { ms: 0 }
  return { art, badge, disc, glyph, painted: undefined as QuestMark | undefined, name: npc.name, who: npc.who, spot: npc.spot, mark: npc.mark, clock,
    envelope: wanderEnvelope(npc, neighbours) }
}

type Token = ReturnType<typeof villagerToken>

function paintMark(token: Token, mark: QuestMark) {
  const look = markLook(mark)
  const disc = token.disc.clear()
  if (look.glow) disc.circle(0, 0, npcMarker.radius + 5).fill({ color: look.fill!, alpha: 0.28 })
  disc.circle(0, 0, npcMarker.radius)
  if (look.fill !== undefined) disc.fill(look.fill)
  else disc.fill({ color: 0x1c1d21, alpha: 0.7 }).stroke({ width: 1.5, color: look.line! })
  token.glyph.text = look.glyph
  token.glyph.style.fill = { color: look.text, alpha: mark === 'active' ? 0 : 1 }
  token.glyph.style.stroke = { color: look.text, width: mark === 'active' ? 1 : 0 }
  token.badge.alpha = look.alpha
  token.badge.scale.set(look.scale)
  token.painted = mark
}

function pose(token: Token, reducedMotion: boolean) {
  const offset = reducedMotion ? { x: 0, y: 0 } : wanderOffset(token.who, token.clock.ms, undefined, token.envelope)
  token.art.position.set(token.spot.x + offset.x, token.spot.y + offset.y)
  token.badge.y = npcMarker.y + markerBob(token.mark, token.clock.ms)
}

export class FloorScene {
  root = new Container()
  private readonly haulers: {
    art: Container
    truck: Graphics
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
  private readonly drawings = new Map<string, Container>()
  private readonly veinBars = new Map<string, Graphics>()
  private readonly stations = new Map<string, Container>()
  private readonly villageLayer = new Container({ label: 'village' })
  private readonly houses = new Map<House['building'], { state: House['state']; art: Sprite }>()
  private readonly npcLayer = new Container({ label: 'villagers' })
  private readonly npcs = new Map<string, Token>()
  private frozen?: string
  private readonly pressed = new Map<number, string>()
  private visible = true
  private reducedMotion = false
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
    const yard = this.placeEquipment('depot', world.depot.pos, depot)
    caption(yard, 'Depot', 0, -63)
    const smelter = this.placeEquipment('furnace', world.furnace.pos, furnace)
    caption(smelter, 'Furnace', 0, -63)
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
      const { w, h, baseX, baseY } = housePrint
      const art = print(w, h, p => p.at(baseX, baseY, 1, () => drawBuilding(p, building, state, 'day', undefined)), 3)
      const box = houseBox(villageHomes[building])
      art.position.set(box.x, box.y)
      art.scale.set(houseScale)
      this.villageLayer.addChild(art)
      this.houses.set(building, { state, art })
    }
    for (const npc of view.npcs) {
      let token = this.npcs.get(npc.id)
      if (!token) {
        token = villagerToken(this.npcLayer, npc, view.npcs)
        pose(token, this.reducedMotion)
        this.npcs.set(npc.id, token)
      }
      token.art.alpha = npc.dim ? 0.55 : 1
      token.mark = npc.mark
      token.badge.y = npcMarker.y + markerBob(npc.mark, token.clock.ms)
      token.badge.visible = !!npc.mark
      if (npc.mark && token.painted !== npc.mark) paintMark(token, npc.mark)
    }
  }

  npcAnchors() {
    return Array.from(this.npcs, ([id, { art, badge, name }]) => ({ id, x: art.x, y: art.y, name, marked: badge.visible, bob: badge.y - npcMarker.y }))
  }

  private placeEquipment(id: string, pos: Cell, paint: (d: ReturnType<typeof drawing>) => void) {
    const group = this.equipmentLayer.addChild(new Container())
    const point = center(pos)
    group.position.set(point.x, point.y)
    const d = drawing()
    mountingPlate(d)
    paint(d)
    this.drawings.set(id, group.addChild(d.g))
    this.stations.set(id, group)
    return group
  }

  artFor(id: string): Container | undefined {
    if (this.stations.get(id)?.visible) return this.drawings.get(id)
    const cart = this.latest.drones.findIndex(drone => drone.name === id)
    return this.haulers[cart]?.truck
  }

  private placeVein(vein: FloorWorld['veins'][number]) {
    const id = `Vein ${vein.name}`
    if (vein.hidden || this.stations.has(id)) return
    const { x, y } = center(vein.pos)
    const group = this.equipmentLayer.addChild(new Container())
    group.position.set(x, y)
    this.stations.set(id, group)
    group.addChild(new Graphics()).ellipse(0, 5, 31, 14).fill({ color: 0x202126, alpha: 0.42 })
    const rocks = group.addChild(new Container())
    this.drawings.set(id, rocks)
    const rock = vein.kind === 'coal' ? 'coal' : 'iron-ore'
    for (let i = 0; i < 7; i++) {
      const ore = rocks.addChild(materialArt(rock))
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
    this.haulers.push({ art, truck: d.g, cargo, load, badge, name, bar, pause, fromX: art.x, fromY: art.y, x: art.x, y: art.y })
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

  private suspend(id?: string) {
    const token = id && this.npcs.get(id)
    if (token) token.clock.previous = undefined
  }

  setFrozen(id?: string) {
    if (this.frozen === id) return
    this.frozen = id
    this.suspend(id)
  }

  setPressed(id?: string, pointerId = 0) {
    if (id) {
      this.pressed.set(pointerId, id)
      this.suspend(id)
    } else this.pressed.delete(pointerId)
  }

  setVisible(visible: boolean) {
    this.visible = visible
    if (!visible) for (const token of this.npcs.values()) token.clock.previous = undefined
  }

  setReducedMotion(reduce: boolean) {
    if (reduce === this.reducedMotion) return
    this.reducedMotion = reduce
    if (reduce) for (const token of this.npcs.values()) {
      token.clock = { ms: 0 }
      pose(token, true)
    }
  }

  highlight(id = '') {
    if (id === this.hover) return
    this.hover = id
    this.suspend(id)
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

  private footprint(world: FloorWorld, id: string, includeCartName = false): { origin: { x: number; y: number }; shapes: Shape[] } | undefined {
    const drone = world.drones.findIndex(item => item.name === id)
    if (drone >= 0) {
      const hauler = this.haulers[drone]
      if (!hauler?.art.visible) return
      const { art, pause } = hauler
      const top = pause.visible ? pauseMark.y : cartMark.y
      const box = { ...cartMark, y: top, h: cartMark.h + cartMark.y - top }
      const shapes: Shape[] = [{ type: 'box', box }]
      // The cart anchor covers the badge and truck. Its outline also encloses the name.
      if (includeCartName) shapes.push({ type: 'box', box: captionBox(id, hauler.name.y) })
      return { origin: art.position, shapes }
    }
    const npc = this.npcs.get(id)
    if (npc) return { origin: npc.art.position, shapes: npcShapes(npc.name, npc.badge.visible, npc.badge.y - npcMarker.y) }
    const spot = stationsOf(world).find(item => item.id === id)
    if (!this.stations.has(id) || !spot) return
    return { origin: center(spot.pos), shapes: stationShapes(spot.kind, spot.title) }
  }

  anchorBox(id: string) {
    const footprint = this.footprint(this.latest, id)
    if (footprint) return screenBox(footprint.shapes, footprint.origin)
  }

  private strokeId(world: FloorWorld, id: string, style: { width: number; alpha: number; grow: number }) {
    const footprint = this.footprint(world, id, true)
    if (!footprint) return
    const { origin, shapes } = footprint
    this.strokeBox(origin.x, origin.y, shapeBounds(shapes), style)
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
      this.pressArt = this.placeEquipment('press', press.pos, pressDrawing)
      caption(this.pressArt, 'Press', 0, -63)
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
      this.latheArt = this.placeEquipment('lathe', machine.pos, cutter)
      caption(this.latheArt, 'Lathe', 0, -63)
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
      this.benchArt = this.placeEquipment('bench', machine.pos, assembler)
      caption(this.benchArt, 'Assembly', 0, -63)
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
      this.spareArt = this.placeEquipment('spare', press.pos, pressDrawing)
      caption(this.spareArt, 'Spare', 0, -63)
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
    const pressed = [...this.pressed.values()]
    for (const [id, token] of this.npcs) {
      const frozen = wanderFrozen({
        hovered: this.hover === id, pressed: pressed.includes(id), dialog: this.frozen === id,
        reducedMotion: this.reducedMotion, hidden: !this.visible, paused,
      })
      token.clock = advanceWander(token.clock, now, frozen)
      if (!frozen) pose(token, false)
    }
    const t = paused ? 1 : Math.min(1, (now - this.arrivals) / interval)
    for (const item of this.haulers)
      item.art.position.set(item.fromX + (item.x - item.fromX) * t, item.fromY + (item.y - item.fromY) * t)
    if (this.hover || this.selected) this.paintRing(this.latest)
    if (this.fire.visible) this.fire.alpha = paused ? 0.85 : 0.8 + Math.sin(now / 100) * 0.18
  }
}
