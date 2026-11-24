import type { Cell } from '@inherit/sim/v8'

export interface LabelSpot {
  id: string
  title: string
  pos: Cell
}

/** Kinds the floor can pick. The spare press uses the press drawing. The bench is the assembly table. */
export type MachineKind = 'furnace' | 'press' | 'spare' | 'lathe' | 'bench' | 'depot' | 'vein'

export interface StationHit {
  id: string
  kind: MachineKind
  pos: Cell
  title: string
}

export interface CartHit {
  id: string
  /** Sprite origin in world pixels. The truck is drawn here, 20px below its cell. */
  x: number
  y: number
  waiting?: boolean
}

export interface Box { x: number; y: number; w: number; h: number }
export interface Ellipse { cx: number; cy: number; rx: number; ry: number }
export type Shape = { type: 'box'; box: Box } | { type: 'ellipse'; ellipse: Ellipse }

/** IBM Plex Mono at 16px is 0.6em wide, plus the caption's letter spacing. */
const advance = 9.6
const tracking = 1.3

/** Extra pixels around the drawn footprint. Small enough that neighbours keep their own edge. */
export const hitPadding = 8
/** The cart is tested first, so its pad stays tighter than a station's. */
export const cartPadding = 4
/** Hover grows the sprite in place. The anchor does not move, so the grid stays put. */
export const hoverScale = 1.05
/** Same gold the old selection ring used. */
export const selectionColor = 0xeabe50
export const selectionStroke = { width: 2, alpha: 0.92, grow: 3 }
export const hoverStroke = { width: 6, alpha: 0.35, grow: 2 }
/** The truck graphic is drawn at this scale inside the cart container. */
export const cartDrawScale = 0.54

export interface StationSource {
  veins: readonly { name: string; pos: Cell; purity?: string; hidden?: boolean }[]
  depot: { pos: Cell }
  furnace: { pos: Cell }
  press?: { pos: Cell } | null
  spare?: { pos: Cell } | null
  lathe?: { pos: Cell } | null
  bench?: { pos: Cell } | null
}

/**
 * Local bounds of mountingPlate plus the station drawing, rounded outward.
 * Furnace is extended to the steel mark placed at (46, 18), which crosses the cell.
 * Vein is the ore ellipse, including its stroke.
 */
const pressBody: Shape = { type: 'box', box: { x: -40, y: -40, w: 84, h: 72 } }
const bodies: Record<MachineKind, Shape> = {
  furnace: { type: 'box', box: { x: -40, y: -40, w: 97, h: 72 } },
  depot: { type: 'box', box: { x: -40, y: -41, w: 84, h: 73 } },
  press: pressBody,
  spare: pressBody,
  lathe: { type: 'box', box: { x: -40, y: -33, w: 84, h: 65 } },
  bench: { type: 'box', box: { x: -40, y: -40, w: 84, h: 72 } },
  vein: { type: 'ellipse', ellipse: { cx: 0, cy: 4, rx: 38, ry: 18 } },
}

/** Truck, cargo badge, and name, in the cart container's space. */
const cartParts: Box[] = [
  { x: -22, y: -15, w: 46, h: 30 },
  { x: -22, y: -48, w: 44, h: 20 },
  { x: -40, y: 9, w: 80, h: 22 },
]

/** Badge and truck, the mark drawn around a selected cart. The name stays clickable without widening it. */
export const cartMark: Box = { x: -22, y: -48, w: 46, h: 63 }
/** Backing for the two pause bars above a waiting cart's cargo badge. */
export const pauseMark: Box = { x: -7, y: -58, w: 14, h: 12 }

export function captionBox(title: string, top: number): Box {
  const n = title.length
  const text = n * advance + Math.max(0, n - 1) * tracking
  const w = Math.max(72, text + 8)
  return { x: -w / 2, y: top, w, h: 22 }
}

export function stationShapes(kind: MachineKind, title: string): Shape[] {
  const top = kind === 'vein' ? 22 : -63
  return [bodies[kind], { type: 'box', box: captionBox(title, top) }]
}

export function cartShapes(): Shape[] {
  return cartParts.map(box => ({ type: 'box', box }))
}

export function stationsOf(world: StationSource): StationHit[] {
  const stations: StationHit[] = []
  for (const vein of world.veins) {
    if (vein.hidden) continue
    stations.push({
      id: `Vein ${vein.name}`,
      kind: 'vein',
      pos: vein.pos,
      title: `Vein ${vein.name}  ${vein.purity ?? 'poor'}`,
    })
  }
  stations.push(
    { id: 'depot', kind: 'depot', pos: world.depot.pos, title: 'Depot' },
    { id: 'furnace', kind: 'furnace', pos: world.furnace.pos, title: 'Furnace' },
  )
  if (world.press) stations.push({ id: 'press', kind: 'press', pos: world.press.pos, title: 'Press' })
  if (world.spare) stations.push({ id: 'spare', kind: 'spare', pos: world.spare.pos, title: 'Spare' })
  if (world.lathe) stations.push({ id: 'lathe', kind: 'lathe', pos: world.lathe.pos, title: 'Lathe' })
  if (world.bench) stations.push({ id: 'bench', kind: 'bench', pos: world.bench.pos, title: 'Assembly' })
  return stations
}

function hitsBox(x: number, y: number, box: Box, pad: number) {
  return x >= box.x - pad && x <= box.x + box.w + pad && y >= box.y - pad && y <= box.y + box.h + pad
}

function hitsEllipse(x: number, y: number, ellipse: Ellipse, pad: number) {
  const rx = ellipse.rx + pad
  const ry = ellipse.ry + pad
  const dx = (x - ellipse.cx) / rx
  const dy = (y - ellipse.cy) / ry
  return dx * dx + dy * dy <= 1
}

export function footprintContains(kind: MachineKind, title: string, x: number, y: number, pad = 0) {
  return hitsShapes(x, y, stationShapes(kind, title), pad)
}

function hitsShapes(x: number, y: number, shapes: readonly Shape[], pad: number) {
  for (const shape of shapes) {
    if (shape.type === 'box' ? hitsBox(x, y, shape.box, pad) : hitsEllipse(x, y, shape.ellipse, pad)) return true
  }
  return false
}

/**
 * World pixel to station or cart.
 * Carts are painted above stations, so a point on the truck selects the cart
 * and a point on the building beside it selects the building.
 * Stations are back to front: a later station wins a shared edge.
 */
export function pickFloor(
  px: number,
  py: number,
  tile: number,
  stations: readonly StationHit[],
  carts: readonly CartHit[] = [],
) {
  for (let i = carts.length - 1; i >= 0; i--) {
    const cart = carts[i]!
    const x = px - cart.x, y = py - cart.y
    if (cart.waiting && hitsBox(x, y, pauseMark, cartPadding)) return cart.id
    if (hitsShapes(x, y, cartShapes(), cartPadding)) return cart.id
  }
  for (let i = stations.length - 1; i >= 0; i--) {
    const station = stations[i]!
    const x = px - (station.pos.x + 0.5) * tile
    const y = py - (station.pos.y + 0.5) * tile
    if (hitsShapes(x, y, stationShapes(station.kind, station.title), hitPadding)) return station.id
  }
}

/**
 * CSS pixels relative to the floor. The renderer stores device pixels in the
 * bitmap and maps the stage back to CSS pixels, so this does not apply devicePixelRatio.
 */
export function floorPoint(
  clientX: number,
  clientY: number,
  frame: { left: number; top: number; cameraX: number; cameraY: number; scale: number },
) {
  if (!(frame.scale > 0)) return
  return {
    x: (clientX - frame.left - frame.cameraX) / frame.scale,
    y: (clientY - frame.top - frame.cameraY) / frame.scale,
  }
}

export function floorCursor(id: string | undefined) {
  return id ? 'pointer' : 'default'
}

/**
 * The Depot and Furnace captions sit above the building.
 * A hit here selects the building even when a drone stands on the tile.
 */
export function buildingLabelHit(px: number, py: number, tile: number, spots: readonly LabelSpot[]) {
  for (const spot of spots) {
    const cx = (spot.pos.x + 0.5) * tile
    const cy = (spot.pos.y + 0.5) * tile
    const box = captionBox(spot.title, cy - 63)
    const left = cx + box.x
    if (px >= left && px <= left + box.w && py >= box.y && py <= box.y + box.h) return spot.id
  }
}
