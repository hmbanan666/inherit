import { expect, test, vi } from 'vitest'
import { createWorld, kettlewick, questList } from '@inherit/sim/v8'
import { FloorScene } from './floor'
import { cameo, captionBox, hitPadding, hoverScale, npcCaptionY, npcMarker, pickFloor, tile, type Box } from './floorPick'
import { houseBox, propBox, villageGround, villageHomes, villageLots, villageProps, villagers, villagerBox, villageView } from './village'
import { wanderEnvelope, wanderFrozen, wanderOffset } from './wander'

const radius = 0.3 * tile

test('each villager eases between repeatable local stops on their own schedule', () => {
  let previous = wanderOffset('bram', 0, radius)
  let stopped = 0, transitions = 0, largestStep = 0, maxX = 0, maxY = 0
  let changedAt = 0
  for (let ms = 16; ms <= 600_000; ms += 16) {
    const next = wanderOffset('bram', ms, radius)
    const distance = Math.hypot(next.x - previous.x, next.y - previous.y)
    largestStep = Math.max(largestStep, distance)
    maxX = Math.max(maxX, Math.abs(next.x))
    maxY = Math.max(maxY, Math.abs(next.y))
    if (next.walking !== previous.walking) {
      if (transitions) {
        const [min, max] = previous.walking ? [1200, 1800] : [4000, 8000]
        expect(ms - changedAt).toBeGreaterThanOrEqual(min! - 16)
        expect(ms - changedAt).toBeLessThanOrEqual(max! + 16)
      }
      changedAt = ms
      transitions++
    }
    if (ms <= 60_000 && !next.walking && !previous.walking && distance === 0) stopped += 16
    previous = next
  }
  expect(transitions).toBeGreaterThan(100)
  expect(stopped).toBeGreaterThanOrEqual(0.6 * 60_000)
  expect(maxX).toBeLessThanOrEqual(radius)
  expect(maxY).toBeLessThanOrEqual(radius / 2)
  expect(largestStep).toBeGreaterThan(0)
  expect(largestStep).toBeLessThanOrEqual(radius / 4)
  expect(wanderOffset('bram', 60_000)).toEqual(wanderOffset('bram', 60_000))
  expect(wanderOffset('ines', 60_000)).not.toEqual(wanderOffset('bram', 60_000))
})

test('hover, a dialog or reduced motion each hold the token still', () => {
  const free = { hovered: false, dialog: false, reducedMotion: false }
  expect(wanderFrozen(free)).toBe(false)
  for (const flag of Object.keys(free)) expect(wanderFrozen({ ...free, [flag]: true })).toBe(true)
})

function overlap(a: Box, b: Box) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

const world = createWorld(kettlewick)
const view = villageView(world, questList)

test('ten active minutes stay in each lot, including the raised mark and hover scale', () => {
  const people = villagers(questList)
  const obstacles = [
    ...Object.values(villageHomes).map(houseBox), ...villageProps.map(propBox),
    villageGround.river, villageGround.road, villageGround.spur, ...villageGround.lanes,
    { x: -7, y: 0, w: 7, h: world.grid.height * tile }, // Include the entire fence, even its open gate.
  ]
  const traces = view.npcs.map(npc => {
    const building = people.find(person => person.who === npc.who)!.building
    const lot = villageLots.find(lot => lot.building === building)!
    expect([lot.w, lot.h]).toEqual([384, 288])
    const footprint = villagerBox({ x: 0, y: 0 }, npc.name)
    const envelope = wanderEnvelope(npc, view.npcs)
    return { npc, base: villageHomes[building], lot, footprint, envelope,
      previous: wanderOffset(npc.who, 0, radius, envelope), travelled: 0 }
  })

  for (let ms = 0; ms <= 600_000; ms += 16) {
    const boxes: Box[] = []
    for (const trace of traces) {
      const { npc, base, lot, footprint, envelope, previous } = trace
      const offset = wanderOffset(npc.who, ms, radius, envelope)
      const x = npc.spot.x + offset.x, y = npc.spot.y + offset.y
      // Reserve the maximum extent even when a specific mark or hover is currently absent.
      const box = { x: x + footprint.x * hoverScale, y: y + (footprint.y - 2) * hoverScale,
        w: footprint.w * hoverScale, h: (footprint.h + 2) * hoverScale }
      const step = Math.hypot(offset.x - previous.x, offset.y - previous.y)
      if (box.x < lot.x || box.y < lot.y || box.x + box.w > lot.x + lot.w || box.y + box.h > lot.y + lot.h ||
          Math.hypot(x - base.x, y - base.y) > 240 || step > radius / 4 ||
          obstacles.some(other => overlap(box, other)) || boxes.some(other => overlap(box, other))) {
        throw new Error(`${npc.name} at ${ms} ms: ${JSON.stringify({ x, y, box, step })}`)
      }
      boxes.push(box)
      trace.travelled += step
      trace.previous = offset
    }
  }
  for (const { npc, travelled } of traces) expect(travelled, npc.who).toBeGreaterThan(0)
})

// Rasterizing an illustration needs a browser canvas. Pixi uses only its dimensions here.
vi.mock(import('./art/townPaint'), async original => ({
  ...await original(),
  illustration: (w, h, _draw, density = 2) => ({ width: w * density, height: h * density }) as HTMLCanvasElement,
}))

const bram = 'npc:bram'
const anchor = (scene: FloorScene) => scene.npcAnchors().find(npc => npc.id === bram)!

function midWalk() {
  const scene = new FloorScene(world)
  scene.setVillage(view)
  scene.animate(0, 500, false)
  let previous = anchor(scene)
  for (let now = 16; now < 12_000; now += 16) {
    scene.animate(now, 500, false)
    const current = anchor(scene)
    if (current.x !== previous.x || current.y !== previous.y) return { scene, now }
    previous = current
  }
  throw new Error('Bram never took a step')
}

test.each(['hover', 'dialog', 'press', 'hidden', 'pause'])('%s freezes a moving token and its mark until resumed', reason => {
  const { scene, now } = midWalk()
  const set = (on: boolean) => {
    if (reason === 'hover') scene.highlight(on ? bram : '')
    if (reason === 'dialog') scene.setFrozen(on ? bram : undefined)
    if (reason === 'press') scene.setPressed(on ? bram : undefined)
    if (reason === 'hidden') scene.setVisible(!on)
  }
  const before = anchor(scene)
  const box = scene.anchorBox(bram)
  set(true)
  for (const time of [now + 16, now + 600_000]) {
    scene.animate(time, 500, reason === 'pause')
    expect(anchor(scene)).toEqual(before)
    expect(scene.anchorBox(bram)).toEqual(box)
  }
  set(false)
  scene.animate(now + 1_200_000, 500, false)
  const resumed = anchor(scene)
  expect(Math.hypot(resumed.x - before.x, resumed.y - before.y)).toBeLessThanOrEqual(radius / 4)
  expect(resumed.bob).toBeCloseTo(before.bob)
  scene.animate(now + 1_200_016, 500, false)
  const next = anchor(scene)
  expect(next).not.toEqual(before)
  expect(Math.hypot(next.x - resumed.x, next.y - resumed.y)).toBeLessThanOrEqual(radius / 4)
})

test('a tick can update the house and mark without restarting a walk', () => {
  const { scene, now } = midWalk()
  const before = anchor(scene)
  const changed = villageView(world, questList)
  changed.npcs.find(npc => npc.id === bram)!.mark = 'active'
  changed.houses[0]!.state = 'working'
  scene.setVillage(changed)
  scene.update({ ...world, tick: world.tick + 1 })
  expect(anchor(scene)).toMatchObject({ x: before.x, y: before.y, bob: 0 })
  scene.animate(now + 16, 500, false)
  const after = anchor(scene)
  const reference = midWalk().scene
  reference.animate(now + 16, 500, false)
  expect(after).toMatchObject({ x: anchor(reference).x, y: anchor(reference).y, bob: 0 })
  expect(after.x).not.toBe(before.x)
})

test('reduced motion returns everyone to their pixel spot and starts again there after a long absence', () => {
  const { scene, now } = midWalk()
  scene.setReducedMotion(true)
  for (const time of [now, now + 16, now + 600_000]) {
    scene.animate(time, 500, false)
    for (const npc of view.npcs) {
      expect(scene.npcAnchors().find(hit => hit.id === npc.id)).toMatchObject({ ...npc.spot, bob: 0 })
    }
  }
  scene.setReducedMotion(false)
  scene.animate(now + 1_200_000, 500, false)
  for (const npc of view.npcs) {
    const hit = scene.npcAnchors().find(hit => hit.id === npc.id)!
    expect(Math.hypot(hit.x - npc.spot.x, hit.y - npc.spot.y)).toBeLessThanOrEqual(radius / 4 + 1e-9)
  }
  const start = anchor(scene)
  scene.animate(now + 1_200_400, 500, false)
  expect(anchor(scene).bob).toBeCloseTo(2)
  expect(start.bob).toBe(0)
})

test.each(['offer', 'ready'] as const)('the moving %s mark, portrait and caption are pickable at the live box', mark => {
  const { scene, now } = midWalk()
  const changed = villageView(world, questList)
  changed.npcs.find(npc => npc.id === bram)!.mark = mark
  scene.setVillage(changed)
  // At 1.2 seconds into a 1.6 second bob the upper edge is two pixels above its resting edge.
  const trough = Math.ceil(now / 1600) * 1600 + 1200
  scene.animate(trough, 500, false)
  const hits = scene.npcAnchors()
  const { x, y, bob, name } = anchor(scene)
  expect(bob).toBeCloseTo(-2)
  expect(x).not.toBe(view.npcs.find(npc => npc.id === bram)!.spot.x)
  const top = y + npcMarker.y - npcMarker.radius + bob
  const caption = captionBox(name, npcCaptionY)
  expect(scene.anchorBox(bram)).toEqual({ x: x + caption.x, y: top, w: caption.w, h: y + caption.y + caption.h - top })
  for (const [px, py] of [[x + cameo.radius, y + cameo.y], [x + caption.x, y + caption.y], [x, top - hitPadding]]) {
    expect(pickFloor(px!, py!, tile, [], [], hits)).toBe(bram)
  }
  const cart = { id: 'drone-1', x, y: y + cameo.y }
  expect(pickFloor(x, cart.y, tile, [], [cart], hits)).toBe(cart.id)
})

test('two captured tokens keep their own clocks while a third villager walks', () => {
  const { scene, now } = midWalk()
  const before = scene.npcAnchors()
  const ines = 'npc:ines'
  scene.setPressed(bram, 7)
  scene.setPressed(ines, 9)
  scene.animate(now + 20_000, 500, false)
  const held = scene.npcAnchors()
  for (const id of [bram, ines]) expect(held.find(npc => npc.id === id)).toEqual(before.find(npc => npc.id === id))
  expect(held.find(npc => npc.id === 'npc:odile')).not.toEqual(before.find(npc => npc.id === 'npc:odile'))
  scene.setPressed(undefined, 9)
  scene.animate(now + 20_016, 500, false)
  scene.animate(now + 40_000, 500, false)
  expect(anchor(scene)).toEqual(before.find(npc => npc.id === bram))
  expect(scene.npcAnchors().find(npc => npc.id === ines)).not.toEqual(before.find(npc => npc.id === ines))
})

test('hiding and showing the tab between frames excludes the whole missing interval', () => {
  const { scene, now } = midWalk()
  const before = scene.npcAnchors()
  scene.setVisible(false)
  scene.setVisible(true)
  scene.animate(now + 3_600_000, 500, false)
  expect(scene.npcAnchors()).toEqual(before)
})
