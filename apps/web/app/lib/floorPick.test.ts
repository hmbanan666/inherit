import { expect, test, vi } from 'vitest'
import { createWorld, kettlewick } from '@inherit/sim/v8'
import type { Cell } from '@inherit/sim/v8'
import { benchAt, createBench, createLathe, createPress, createSpare, latheAt, pressAt, spareAt } from '../../../../packages/sim/src/v8/modules/stock'
import { drawing, mountingPlate } from './art/shared'
import { depot, furnace, truck } from './art/floorMachines'
import { assembler, cutter, press } from './art/fabrication'
import { FloorScene, tile } from './floor'
import {
  buildingLabelHit, captionBox, cartDrawScale, floorCursor, floorPoint, footprintContains, hitPadding, hoverScale,
  panToCell, pickFloor, stationShapes, stationsOf, type MachineKind, type StationHit,
} from './floorPick'
import { screenBox } from './popupPlace'

function fitted() {
  const world = createWorld(kettlewick)
  world.press = createPress()
  world.spare = createSpare()
  world.lathe = createLathe()
  world.bench = createBench()
  return world
}

const works = fitted()
const placed = stationsOf(works)

function at(pos: Cell, x: number, y: number) {
  return { x: (pos.x + 0.5) * tile + x, y: (pos.y + 0.5) * tile + y }
}

function pick(pos: Cell, x: number, y: number, carts: { id: string; x: number; y: number }[] = []) {
  const point = at(pos, x, y)
  return pickFloor(point.x, point.y, tile, placed, carts)
}

function vein(name: string) {
  const found = kettlewick.veins.find(item => item.name === name)
  if (!found) throw new Error(name)
  return found
}

test('card anchors cover the furnace and its caption and disappear for missing stations', () => {
  const world = fitted()
  const scene = new FloorScene(world)
  expect(scene.anchorBox('furnace')).toEqual(screenBox(stationShapes('furnace', 'Furnace'), at(world.furnace.pos, 0, 0)))
  expect(scene.anchorBox('unknown')).toBeUndefined()
  expect(scene.anchorBox('press')).toBeDefined()
  world.press = null
  scene.update(world)
  expect(scene.anchorBox('press')).toBeUndefined()
})

test('the depot caption is hit above the tile, and the tile itself is not the caption', () => {
  const spots = [
    { id: 'depot', title: 'Depot', pos: kettlewick.depot.pos },
    { id: 'furnace', title: 'Furnace', pos: kettlewick.furnace.pos },
  ]
  const depotPos = kettlewick.depot.pos
  const cx = (depotPos.x + 0.5) * tile
  const cy = (depotPos.y + 0.5) * tile
  expect(buildingLabelHit(cx, cy - 50, tile, spots)).toBe('depot')
  expect(buildingLabelHit(cx, cy, tile, spots)).toBeUndefined()
  const furnacePos = kettlewick.furnace.pos
  const fx = (furnacePos.x + 0.5) * tile
  const fy = (furnacePos.y + 0.5) * tile
  expect(buildingLabelHit(fx, fy - 50, tile, spots)).toBe('furnace')
})

test('a point on each machine selects that machine', () => {
  const samples: [string, string, Cell, number, number][] = [
    ['furnace', 'furnace', works.furnace.pos, 3, -4],
    ['hopper', 'furnace', works.furnace.pos, 3, -22],
    ['press', 'press', works.press!.pos, 23, -25],
    ['spare', 'spare', works.spare!.pos, 23, -25],
    ['lathe', 'lathe', works.lathe!.pos, -25, -9],
    ['bench', 'bench', works.bench!.pos, 13, -23],
    ['depot', 'depot', works.depot.pos, 0, -34],
    ['Vein A', 'Vein A', vein('A').pos, 0, 4],
    ['Vein B', 'Vein B', vein('B').pos, 0, 4],
    ['Vein D', 'Vein D', vein('D').pos, 0, 4],
  ]
  for (const [name, id, pos, x, y] of samples) expect(pick(pos, x, y), name).toBe(id)
})

test('the furnace hopper mouth, the caption, and the steel mark are all the furnace', () => {
  expect(pick(kettlewick.furnace.pos, 3, -22)).toBe('furnace')
  expect(pick(kettlewick.furnace.pos, 0, -55)).toBe('furnace')
  // The steel mark is placed at local x=46, past the cell edge at 48.
  expect(50).toBeGreaterThan(tile / 2)
  expect(pick(kettlewick.furnace.pos, 50, 18)).toBe('furnace')
})

test('a vein name that hangs past the cell still selects the vein', () => {
  const label = captionBox(`Vein ${vein('A').name}  ${vein('A').purity}`, 22)
  expect(label.x + label.w).toBeGreaterThan(tile / 2)
  expect(pick(vein('A').pos, label.x + label.w - 4, 30)).toBe('Vein A')
  const wide = captionBox(`Vein ${vein('D').name}  ${vein('D').purity}`, 22)
  expect(wide.x + wide.w).toBeGreaterThan(tile / 2)
  expect(pick(vein('D').pos, wide.x + 4, 30)).toBe('Vein D')
})

test('the empty floor of a cell, and a hidden vein, select nothing', () => {
  expect(pick(kettlewick.furnace.pos, -48, 48)).toBeUndefined()
  expect(pick(vein('A').pos, 47, 4)).toBeUndefined()
  expect(pick({ x: 0, y: 0 }, 0, 0)).toBeUndefined()
  expect(pick(vein('C').pos, 0, 4)).toBeUndefined()
  expect(stationsOf(kettlewick).some(station => station.id === 'Vein C')).toBe(false)
})

test('padding around the silhouette selects the machine, and past that padding does not', () => {
  expect(pick(kettlewick.furnace.pos, -39 - (hitPadding - 2), 0)).toBe('furnace')
  expect(pick(kettlewick.furnace.pos, 0, -80)).toBeUndefined()
  expect(hoverScale).toBeGreaterThanOrEqual(1.04)
  expect(hoverScale).toBeLessThanOrEqual(1.06)
})

test('a cart parked on the depot does not take the building, and its sprite still selects the cart', () => {
  const pos = kettlewick.depot.pos
  const cart = { id: 'drone-1', x: (pos.x + 0.5) * tile, y: (pos.y + 0.5) * tile + 20 }
  expect(pick(pos, 0, -34, [cart])).toBe('depot')
  expect(pick(pos, -30, 18, [cart])).toBe('depot')
  const point = at(pos, 0, 20)
  expect(pickFloor(point.x, point.y, tile, placed, [cart])).toBe('drone-1')
  const name = at(pos, 0, 36)
  expect(pickFloor(name.x, name.y, tile, placed, [cart])).toBe('drone-1')
})

test('the pause mark stays on the waiting cart beside the occupied assembly table', () => {
  const world = fitted()
  const waiting = world.drones[0]!
  waiting.pos = { x: benchAt.x - 1, y: benchAt.y }
  waiting.route = [benchAt]
  waiting.wait = { ticks: 1, blocked: benchAt, place: 'bench', logged: 0 }
  world.drones.push({ ...waiting, name: 'drone-2', pos: benchAt, wait: null, route: [] })
  world.bench = null
  const scene = new FloorScene(world)
  world.bench = createBench()
  scene.update(world)
  scene.animate(0, 500, true)

  const anchors = scene.cartAnchors()
  expect(anchors[0]).toMatchObject(at(waiting.pos, 0, 20))
  expect(anchors[1]).toMatchObject(at(benchAt, 0, 20))
  expect(pick(benchAt, 0, 20, anchors)).toBe('drone-2')
  expect(pick(benchAt, 0, -34, anchors)).toBe('bench')
  const marks = scene.root.getChildrenByLabel('pause', true).filter(mark => mark.visible)
  expect(marks).toHaveLength(1)
  const routes = scene.root.getChildByLabel('routes')!
  const equipment = scene.root.getChildByLabel('equipment')!
  expect(scene.root.getChildIndex(routes)).toBeLessThan(scene.root.getChildIndex(equipment))
  expect(scene.root.getChildIndex(equipment)).toBeLessThan(scene.root.getChildIndex(marks[0]!.parent!))
  const bounds = marks[0]!.getBounds()
  const top = at(waiting.pos, 0, -38)
  expect(bounds.x + bounds.width / 2).toBe(top.x)
  expect(bounds.y).toBe(top.y)
  expect(bounds.height).toBe(12)
  // Both gold bars are selectable all the way to their top edge.
  for (const dx of [-3, 3]) expect(pickFloor(top.x + dx, top.y + 2, tile, placed, anchors)).toBe(waiting.name)

  waiting.wait = null
  scene.update(world)
  expect(marks[0]!.visible).toBe(false)
  expect(pickFloor(top.x, top.y + 2, tile, placed, scene.cartAnchors())).not.toBe(waiting.name)
})

test('a cart on a detour is picked at its interpolated sprite', () => {
  const world = fitted()
  const cart = world.drones[0]!
  cart.pos = { x: benchAt.x - 1, y: benchAt.y - 1 }
  const scene = new FloorScene(world)
  using now = vi.spyOn(performance, 'now')
  now.mockReturnValue(1000)
  scene.update(world)
  world.tick++
  cart.pos = { ...cart.pos, x: benchAt.x }
  scene.update(world)
  scene.animate(1250, 500, false)
  const anchors = scene.cartAnchors()
  expect(anchors[0]).toMatchObject(at(cart.pos, -tile / 2, 20))
  expect(scene.anchorBox(cart.name)).toEqual({ ...at(cart.pos, -tile / 2 - 22, 20 - 48), w: 46, h: 63 })
  expect(pick(cart.pos, -tile / 2, 20, anchors)).toBe(cart.name)
  expect(pick(cart.pos, 0, 20, anchors)).not.toBe(cart.name)
  scene.animate(1500, 500, false)
  expect(scene.anchorBox(cart.name)).toEqual({ ...at(cart.pos, -22, 20 - 48), w: 46, h: 63 })
  world.drones = []
  scene.update(world)
  expect(scene.anchorBox(cart.name)).toBeUndefined()
})

test('the selection footprint follows the drawing, not a circle at the cell centre', () => {
  // The old ring was a circle of radius 38 about the cell centre.
  expect(60 * 60).toBeGreaterThan(38 * 38)
  expect(footprintContains('furnace', 'Furnace', 0, -60)).toBe(true)
  expect(footprintContains('furnace', 'Furnace', 50, 18)).toBe(true)
  expect(footprintContains('vein', 'Vein A  poor', 0, 4)).toBe(true)
  expect(footprintContains('vein', 'Vein A  poor', 36, 4)).toBe(true)
  expect(footprintContains('lathe', 'Lathe', -25, -9)).toBe(true)
  expect(footprintContains('bench', 'Assembly', 13, -23)).toBe(true)
  expect(footprintContains('spare', 'Spare', 23, -25)).toBe(true)
})

test('each footprint covers the sprite that drawing paints, and not a margin past it', () => {
  const drawn: [Exclude<MachineKind, 'vein'>, (d: ReturnType<typeof drawing>) => void][] = [
    ['furnace', furnace],
    ['depot', depot],
    ['press', press],
    ['spare', press],
    ['lathe', cutter],
    ['bench', assembler],
  ]
  for (const [kind, paint] of drawn) {
    const d = drawing()
    mountingPlate(d)
    paint(d)
    const bounds = d.g.getLocalBounds()
    const corners = [
      [bounds.x, bounds.y],
      [bounds.x + bounds.width, bounds.y],
      [bounds.x, bounds.y + bounds.height],
      [bounds.x + bounds.width, bounds.y + bounds.height],
    ]
    for (const [x, y] of corners) expect(footprintContains(kind, kind, x!, y!), kind).toBe(true)
    expect(footprintContains(kind, kind, bounds.x - 20, (bounds.y + bounds.height) / 2), kind).toBe(false)
  }
  const d = drawing()
  truck(d)
  const bounds = d.g.getLocalBounds()
  const origin = { id: 'drone-1', x: 400, y: 300 }
  for (const [x, y] of [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ]) {
    const hit = pickFloor(origin.x + x! * cartDrawScale, origin.y + y! * cartDrawScale, tile, [], [origin])
    expect(hit).toBe('drone-1')
  }
})

test('screen points stay in CSS pixels', () => {
  const frame = { left: 100, top: 80, cameraX: 40, cameraY: 12, scale: 0.5 }
  const world = at(kettlewick.furnace.pos, 3, -22)
  const clientX = frame.left + frame.cameraX + world.x * frame.scale
  const clientY = frame.top + frame.cameraY + world.y * frame.scale
  expect(floorPoint(clientX, clientY, frame)).toEqual(world)
  expect(pickFloor(world.x, world.y, tile, placed)).toBe('furnace')
  const asDevicePixels = floorPoint(clientX, clientY, { ...frame, scale: frame.scale * 2 })
  expect(pickFloor(asDevicePixels!.x, asDevicePixels!.y, tile, placed)).not.toBe('furnace')
  expect(floorCursor('furnace')).toBe('pointer')
  expect(floorCursor(undefined)).toBe('default')
})

test('the live map lists the installed stations and not the machines still waiting', () => {
  const fresh = stationsOf(createWorld(kettlewick))
  expect(fresh.map(station => station.id)).toEqual(['Vein A', 'Vein B', 'Vein D', 'depot', 'furnace'])
  expect(works.press!.pos).toEqual(pressAt)
  expect(works.spare!.pos).toEqual(spareAt)
  expect(works.lathe!.pos).toEqual(latheAt)
  expect(works.bench!.pos).toEqual(benchAt)
  expect(placed.map(station => station.id)).toEqual([
    'Vein A', 'Vein B', 'Vein D', 'depot', 'furnace', 'press', 'spare', 'lathe', 'bench',
  ])
})

test('a later station wins a shared edge', () => {
  const overlap: StationHit[] = [
    { id: 'depot', kind: 'depot', pos: { x: 0, y: 0 }, title: 'Depot' },
    { id: 'furnace', kind: 'furnace', pos: { x: 0, y: 0 }, title: 'Furnace' },
  ]
  const point = at({ x: 0, y: 0 }, 0, 0)
  expect(pickFloor(point.x, point.y, tile, overlap)).toBe('furnace')
})

test('villager cameo, name and mark pick in reverse draw order under carts', () => {
  const bram = { id: 'npc:bram', x: -336, y: 144, name: 'Bram', marked: true }
  const ines = { ...bram, id: 'npc:ines', name: 'Ines' }
  for (const [dx, dy] of [[0, -22], [33, 14], [0, -60]]) {
    expect(pickFloor(bram.x + dx!, bram.y + dy!, tile, placed, [], [bram])).toBe('npc:bram')
  }
  expect(pickFloor(bram.x, bram.y - 60, tile, placed, [], [{ ...bram, marked: false }])).toBeUndefined()
  expect(pickFloor(bram.x, bram.y - 22, tile, placed, [], [bram, ines])).toBe('npc:ines')
  const cart = { id: 'drone-1', x: bram.x, y: bram.y - 22 }
  expect(pickFloor(cart.x, cart.y, tile, placed, [cart], [bram])).toBe('drone-1')
  const station = at(works.depot.pos, 0, 0)
  expect(pickFloor(station.x, station.y, tile, placed, [], [bram])).toBe('depot')
})

test('centering a villager puts its world spot at the viewport midpoint at any zoom', () => {
  const size = { w: 900, h: 400 }
  const spot = { x: -4, y: 1 }
  for (const scale of [0.4, 1.2]) {
    const camera = { x: 130 + 384 * scale, y: -25, scale }
    const pan = panToCell(spot, size, camera)
    const point = floorPoint(450, 200, {
      left: 0, top: 0, scale, cameraX: camera.x + pan.x, cameraY: camera.y + pan.y,
    })!
    expect(point.x).toBeCloseTo(-336)
    expect(point.y).toBeCloseTo(144)
  }
})
