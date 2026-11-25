import { acceptQuest, canTake, completeQuest, createWorld, kettlewick, questHold, questList, runTicks, settleTriggers } from '@inherit/sim/v8'
import { expect, test } from 'vitest'
import { fieldBounds, idleLine, journalRequests, villagerDialog, villagerQuest, villagers, villageHomes, villageView } from './village'

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

test('the four columns fit every house and villager in a distinct cell', () => {
  expect(fieldBounds({ width: 16, height: 6 })).toEqual({ left: -384, top: 0, width: 1920, height: 576 })
  const { npcs, houses } = villageView(createWorld(kettlewick), questList)
  expect(new Set(houses.map(house => house.building))).toEqual(new Set(questList.map(quest => quest.building)))
  expect(villageHomes).toEqual({
    forge: { x: -4, y: 0 }, bakery: { x: -2, y: 0 }, 'town-hall': { x: -4, y: 2 },
    mill: { x: -2, y: 2 }, 'lamp-street': { x: -4, y: 4 }, riverside: { x: -2, y: 4 }, bridge: { x: -1, y: 5 },
  })
  expect(Object.fromEntries(npcs.map(npc => [npc.who, npc.spot]))).toEqual({
    bram: { x: -4, y: 1 }, elsie: { x: -2, y: 1 }, ines: { x: -4, y: 3 }, harrow: { x: -3, y: 3 },
    tomas: { x: -2, y: 3 }, wen: { x: -4, y: 5 }, pell: { x: -2, y: 5 }, odile: { x: -1, y: 4 },
  })
  const cells = [...Object.values(villageHomes), ...npcs.map(npc => npc.spot)]
  expect(new Set(cells.map(cell => `${cell.x},${cell.y}`)).size).toBe(cells.length)
  for (const { x, y } of cells) {
    expect(x).toBeGreaterThanOrEqual(-4)
    expect(x).toBeLessThanOrEqual(-1)
    expect(y).toBeGreaterThanOrEqual(0)
    expect(y).toBeLessThanOrEqual(5)
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
