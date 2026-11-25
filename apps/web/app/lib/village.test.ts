import { acceptQuest, canTake, completeQuest, createWorld, kettlewick, questHold, questList, runTicks, settleTriggers } from '@inherit/sim/v8'
import { expect, test } from 'vitest'
import { containPlace } from './factoryLayout'
import { tile, type Box } from './floorPick'
import {
  fieldBounds, homeView, houseBox, houseScale, idleLine, journalRequests, propBox, villageGround, villageHomes, villageLots, villageProps,
  villagerBox, villagerDialog, villagerQuest, villagers, villageView,
} from './village'

test('only Bram offers a quest on a fresh field', () => {
  const view = villageView(createWorld(kettlewick), questList)
  expect(view.npcs.filter(npc => npc.mark || !npc.dim)).toMatchObject([{ id: 'npc:bram', mark: 'offer', dim: false }])
  expect(view.houses.every(house => house.state === 'broken')).toBe(true)
})

test('the field lists each giver once in first-quest order, without titles', () => {
  const people = villagers(questList)
  expect(people.map(person => person.who)).toEqual(['bram', 'ines', 'odile', 'elsie', 'harrow', 'tomas', 'pell', 'wen'])
  for (const person of people) {
    const quest = questList.find(quest => quest.who === person.who)!
    expect(person).toEqual({ who: quest.who, name: quest.from.replace(/^Mayor /, ''), role: quest.role, building: quest.building })
  }
  expect(people[2]!.name).toBe('Odile')
})

test('the home view gives the village over 40% of the width and keeps the depot, furnace and veins', () => {
  const grid = { width: 16, height: 6 }
  expect(fieldBounds(grid)).toEqual({ left: -1920, top: 0, width: 3456, height: 576 })
  const home = homeView(grid)
  expect(home).toEqual({ left: -1152, top: 0, width: 2592, height: 576 })
  const village = -home.left / home.width
  expect(village).toBeGreaterThanOrEqual(0.4)
  expect(village).toBeLessThanOrEqual(0.5)
  const right = home.left + home.width
  const world = createWorld(kettlewick)
  for (const cell of [world.depot.pos, world.furnace.pos, ...world.veins.map(vein => vein.pos)]) {
    expect(cell.x * tile).toBeGreaterThanOrEqual(0)
    expect((cell.x + 1) * tile).toBeLessThanOrEqual(right)
  }
  expect(houseScale).toBeGreaterThanOrEqual(1.4)
  // Signs stay about 8 screen px on a wide frame; zoom in for more.
  expect(containPlace(1904, 560, home.width, home.height).scale * houseScale * 8).toBeGreaterThanOrEqual(8)
})

test('the seven houses and eight villagers have their own places in the lots', () => {
  const { npcs, houses } = villageView(createWorld(kettlewick), questList)
  expect(new Set(houses.map(house => house.building))).toEqual(new Set(questList.map(quest => quest.building)))
  expect(villageHomes).toEqual({
    forge: { x: -616, y: 230 }, 'town-hall': { x: -1000, y: 230 }, bakery: { x: -1384, y: 230 },
    mill: { x: -616, y: 515 }, 'lamp-street': { x: -1000, y: 515 },
    riverside: { x: -1384, y: 515 }, bridge: { x: -1768, y: 515 },
  })
  expect(Object.fromEntries(npcs.map(npc => [npc.who, npc.spot]))).toEqual({
    bram: { x: -424, y: 220 }, ines: { x: -808, y: 220 }, harrow: { x: -808, y: 110 }, elsie: { x: -1192, y: 220 },
    tomas: { x: -424, y: 505 }, wen: { x: -808, y: 505 }, pell: { x: -1192, y: 505 }, odile: { x: -1576, y: 505 },
  })
})

test('four lots on each side of the lanes leave the square beside the gate', () => {
  const layout = [...villageLots].sort((a, b) => a.y - b.y || a.x - b.x)
  expect(layout.map(lot => lot.building)).toEqual([
    'meadow', 'bakery', 'town-hall', 'forge', 'bridge', 'riverside', 'lamp-street', 'mill',
  ])
  layout.forEach((lot, i) => {
    expect(lot).toMatchObject({ x: -1920 + i % 4 * 384, y: i < 4 ? 0 : 288, w: 384, h: 288 })
  })
  expect(villageGround).toEqual({
    river: { x: -1828, y: 0, w: 120, h: 576 }, road: { x: -168, y: 0, w: 48, h: 576 },
    spur: { x: -144, y: 120, w: 144, h: 48 },
    lanes: [{ x: -1708, y: 238, w: 1564, h: 24 }, { x: -1920, y: 523, w: 1776, h: 24 }],
  })
})

function intersects(a: Box, b: Box) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function expectInsideBand(box: Box) {
  const { left, top, height } = fieldBounds(kettlewick.grid)
  expect(box.x).toBeGreaterThanOrEqual(left)
  expect(box.x + box.w).toBeLessThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(top)
  expect(box.y + box.h).toBeLessThanOrEqual(top + height)
}

test('house prints and marked villagers fit beside one another and leave the road and river clear', () => {
  const { houses, npcs } = villageView(createWorld(kettlewick), questList)
  const forge = houseBox(villageHomes.forge)
  expect(forge.x).toBe(-763)
  expect(forge.y).toBeCloseTo(36.8)
  expect(forge.w).toBe(294)
  expect(forge.h).toBeCloseTo(246.4)
  expect(villagerBox({ x: -424, y: 220 }, 'Bram')).toEqual({ x: -460, y: 158, w: 72, h: 86 })

  const footprints = [
    ...houses.map(({ building }) => ({ id: building, box: houseBox(villageHomes[building]) })),
    ...npcs.map(({ who, name, spot }) => ({ id: who, box: villagerBox(spot, name) })),
  ]
  for (const [i, { id, box }] of footprints.entries()) {
    expectInsideBand(box)
    expect(footprints.slice(i + 1).filter(other => intersects(box, other.box)), id).toEqual([])
    expect(intersects(box, villageGround.road), id).toBe(false)
    expect(intersects(box, villageGround.river), id).toBe(id === 'bridge')
  }
  for (const { who, building } of villagers(questList)) {
    const { spot } = npcs.find(npc => npc.who === who)!
    const base = villageHomes[building]
    const box = houseBox(base)
    expect(spot.x, who).toBeGreaterThan(box.x + box.w)
    expect(Math.hypot(spot.x - base.x, spot.y - base.y), who).toBeLessThanOrEqual(240)
  }
})

test('prop boxes cover the scaled drawings including shadows, rail posts and hooves', () => {
  // Outermost painted coordinates in each native drawing, before the prop is placed.
  const extents = [
    ['fir', -13.332, -60, 13.332, 0.6],
    ['orchard', -14.864, -41.408, 16, 2.5],
    ['fields', -0.65, -18.65, 80, 5],
    ['rail', -2.45, -15.85, 67.85, 2.85],
    ['horse', -20, -19, 21, 13.4],
  ] as const
  for (const [kind, left, top, right, bottom] of extents) {
    const box = propBox({ kind, x: -700, y: 300, size: 2 })
    expect(box.x, kind).toBeLessThanOrEqual(-700 + 2 * left)
    expect(box.y, kind).toBeLessThanOrEqual(300 + 2 * top)
    expect(box.x + box.w, kind).toBeGreaterThanOrEqual(-700 + 2 * right)
    expect(box.y + box.h, kind).toBeGreaterThanOrEqual(300 + 2 * bottom)
  }
})

test('village scenery leaves each house, villager, waterway, road and fence clear', () => {
  const { npcs } = villageView(createWorld(kettlewick), questList)
  const obstacles = [
    ...Object.values(villageHomes).map(houseBox), ...npcs.map(npc => villagerBox(npc.spot, npc.name)),
    villageGround.river, villageGround.road, villageGround.spur, ...villageGround.lanes,
  ]
  for (const prop of villageProps) {
    const box = propBox(prop)
    expect(prop.size).toBeGreaterThan(0)
    expectInsideBand(box)
    expect(box.x + box.w).toBeLessThanOrEqual(-8)
    expect(obstacles.filter(obstacle => intersects(box, obstacle)), JSON.stringify(prop)).toEqual([])
  }
  for (const [kind, minimum] of Object.entries({ fir: 16, orchard: 8, fields: 2, rail: 6, horse: 1 })) {
    expect(villageProps.filter(prop => prop.kind === kind).length, kind).toBeGreaterThanOrEqual(minimum)
  }
  for (const horse of villageProps.filter(prop => prop.kind === 'horse')) {
    expect(Math.hypot(horse.x - villageHomes.forge.x, horse.y - villageHomes.forge.y)).toBeLessThanOrEqual(200)
  }
})

test('Bram goes from active to ready and handing over lights the forge and offers Ines', () => {
  const world = createWorld(kettlewick)
  const view = () => villageView(world, questList)
  const marked = () => view().npcs.filter(npc => npc.mark)
  expect(acceptQuest(world, kettlewick, 'bram')).toBe(true)
  expect(villagerQuest(world, questList, 'bram')?.id).toBe('bram')
  expect(villagerDialog(world, questList, 'bram').state).toBe('active')
  const tick = () => runTicks(world, kettlewick, 1, () => {
    settleTriggers(world, kettlewick)
    return { used: 0 }
  })
  world.depot.ingots = 1
  tick()
  expect(marked()).toMatchObject([{ who: 'bram', mark: 'active' }])
  world.codedBatch = true
  tick()
  expect(marked()).toMatchObject([{ who: 'bram', mark: 'ready' }])
  expect(villagerDialog(world, questList, 'bram').state).toBe('ready')
  expect(completeQuest(world, kettlewick)).toBe(true)
  expect(villagerDialog(world, questList, 'bram')).toEqual({ state: 'none', line: questList[0]!.change })
  expect(view().houses.find(house => house.building === 'forge')?.state).toBe('working')
  expect(view().npcs.find(npc => npc.who === 'bram')?.dim).toBe(false)
  expect(idleLine(world, questList, 'bram')).toBe(questList[0]!.change)
  expect(marked()).toMatchObject([{ who: 'ines', mark: 'offer' }])
})

test('held Elsie stays listed in the Journal and at the bakery without an offer mark', () => {
  const world = createWorld(kettlewick)
  world.cleared = ['bram', 'ines', 'odile']
  world.level = 4
  const quest = villagerQuest(world, questList, 'elsie')!
  expect(quest.id).toBe('elsie')
  expect(journalRequests(world, questList)).toEqual([quest])
  expect(questHold(world, quest)).toContain('drone-2')
  expect(villagerDialog(world, questList, 'elsie')).toMatchObject({
    state: 'offer', canTake: false, hold: questHold(world, quest), summary: { goal: quest.goal },
  })
  expect(canTake(world, quest)).toBe(false)
  expect(villageView(world, questList).npcs.find(npc => npc.who === 'elsie')).toMatchObject({ mark: undefined, dim: true })
})

test('Odile recalls the bridge until the crew order is reachable', () => {
  const world = createWorld(kettlewick)
  world.cleared = ['bram', 'ines', 'odile', 'retired-quest']
  world.level = 7
  expect(villagerQuest(world, questList, 'odile')).toBeUndefined()
  expect(idleLine(world, questList, 'odile')).toBe(questList.find(quest => quest.id === 'odile')!.change)
  expect(villageView(world, questList).houses.find(house => house.building === 'bridge')?.state).toBe('working')
  world.cleared.push('elsie', 'harrow', 'tomas', 'pell', 'wen')
  world.level = 6
  expect(villagerQuest(world, questList, 'odile')).toBeUndefined()
  world.level = 7
  expect(villagerQuest(world, questList, 'odile')?.id).toBe('crew')
  world.cleared.push('crew')
  expect(idleLine(world, questList, 'odile')).toBe(questList.find(quest => quest.id === 'crew')!.change)
})

test('before a first hand-over, idle villagers name their next level', () => {
  const world = createWorld(kettlewick)
  expect(idleLine(world, questList, 'wen')).toBe('Come back at level 6.')
  expect(idleLine(world, [], 'wen')).toBe('Not yet.')
})

test('a gap in saved hand-overs can leave another request readable while Take waits', () => {
  const world = createWorld(kettlewick)
  world.cleared = ['bram']
  world.level = 2
  expect(acceptQuest(world, kettlewick, 'ines')).toBe(true)
  world.cleared = ['retired-quest']
  expect(villagerQuest(world, questList, 'bram')?.id).toBe('bram')
  expect(villagerDialog(world, questList, 'bram')).toMatchObject({ state: 'offer', canTake: false })
  expect(villageView(world, questList).npcs.filter(npc => npc.mark)).toMatchObject([{ who: 'ines', mark: 'active' }])
})
