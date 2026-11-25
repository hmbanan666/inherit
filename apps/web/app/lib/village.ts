import { canTake, chainReady, questHold, type World } from '@inherit/sim/v8'
import type { QuestDef } from '../../../../packages/sim/src/v8/quests'
import { questSummary } from './questNote'
import { npcShapes, tile, type Box, type Point } from './floorPick'
import { screenBox } from './popupPlace'

type Who = QuestDef['who']
type Building = QuestDef['building']
type Quests = readonly QuestDef[]
type VillagerMark = 'offer' | 'active' | 'ready'

export const villageLabels = { goal: 'Goal', take: 'Take quest', handOver: 'Hand over', close: 'Close' }
export const villageCols = 20
export const homeCols = 8
export const houseScale = 1.4
export const housePrint = { w: 210, h: 176, baseX: 105, baseY: 138 }

export function fieldBounds(grid: World['grid']) {
  return { left: -villageCols * tile, top: 0, width: (grid.width + villageCols) * tile, height: grid.height * tile }
}

export function homeView(grid: World['grid']) {
  return { left: -homeCols * tile, top: 0, width: (grid.width + homeCols) * tile, height: grid.height * tile }
}

function lot(building: Building | 'meadow', x: number, y: number) {
  return { building, x, y, w: 4 * tile, h: 3 * tile }
}

export const villageLots = [
  lot('meadow', -1920, 0), lot('bakery', -1536, 0), lot('town-hall', -1152, 0), lot('forge', -768, 0),
  lot('bridge', -1920, 288), lot('riverside', -1536, 288), lot('lamp-street', -1152, 288), lot('mill', -768, 288),
]

export const villageHomes = Object.fromEntries(villageLots
  .filter(lot => lot.building !== 'meadow')
  .map(({ building, x, y }) => [building, { x: x + 152, y: y === 0 ? 230 : 515 }])) as Record<Building, Point>

function villagerSpot(building: Building, who: Who): Point {
  const base = villageHomes[building]
  return { x: base.x + 192, y: base.y - (who === 'harrow' ? 120 : 10) }
}

export function houseBox(base: Point): Box {
  return {
    x: base.x - housePrint.baseX * houseScale, y: base.y - housePrint.baseY * houseScale,
    w: housePrint.w * houseScale, h: housePrint.h * houseScale,
  }
}

export function villagerBox(spot: Point, name: string): Box {
  return screenBox(npcShapes(name, true), spot)
}

export const villageGround = {
  river: { x: -1828, y: 0, w: 120, h: 576 },
  road: { x: -168, y: 0, w: 48, h: 576 },
  spur: { x: -144, y: 120, w: 144, h: 48 },
  lanes: [{ x: -1708, y: 238, w: 1564, h: 24 }, { x: -1920, y: 523, w: 1776, h: 24 }],
}

export interface VillageProp extends Point {
  kind: 'fir' | 'orchard' | 'fields' | 'rail' | 'horse'
  size: number
}

// Native drawing dimensions and outward-rounded paint bounds. Each placement scales both by size.
export const propArt = {
  // At h=60 the widest tier spans ±(0.22 × 1.01 × h) and the trunk ends at 0.01h.
  fir: { height: 60, bounds: { x: -14, y: -60, w: 28, h: 61 } },
  // At h=40 the lit crown reaches x=-8-0.78×0.22h, the top is -0.6h-8-1.12×0.21h, and the shadow adds 16 right and 2.5 below.
  orchard: { height: 40, bounds: { x: -15, y: -42, w: 31, h: 45 } },
  // The 80×18 plot spans x=0..80 and y=-18..5, with 0.65px furrow caps at the left and top.
  fields: { width: 80, height: 18, bounds: { x: -1, y: -19, w: 81, h: 24 } },
  // A level 66px run has posts from (-0.6, -14) to (0, 1) at either end, plus a 1.85px cap.
  rail: { length: 66, bounds: { x: -3, y: -16, w: 71, h: 19 } },
  // Tail to muzzle is x=-20..21. The ear reaches -19 and the hooves reach 12+1.4.
  horse: { bounds: { x: -20, y: -19, w: 41, h: 33 } },
}

function prop(kind: VillageProp['kind'], x: number, y: number, size: number): VillageProp {
  return { kind, x, y, size }
}

export const villageProps = [
  // Meadow on both banks, with two orchard rows above the fields.
  prop('fir', -1896, 75, 1.05), prop('fir', -1861, 93, 1.25),
  prop('fir', -1900, 202, 0.9), prop('fir', -1855, 286, 1.05),
  prop('orchard', -1684, 69, 0.82), prop('orchard', -1645, 67, 0.85), prop('orchard', -1607, 72, 0.85),
  prop('orchard', -1685, 110, 0.95), prop('orchard', -1643, 110, 0.9), prop('orchard', -1602, 115, 0.9),
  prop('fields', -1914, 147, 0.9), prop('fields', -1694, 165, 1.5), prop('fields', -1680, 208, 1.35),
  prop('rail', -1695, 234, 1),
  // Lot boundaries and the horse beside the forge.
  prop('fir', -1193, 110, 1.2), prop('fir', -811, 42, 0.62),
  prop('fir', -1415, 31, 0.45), prop('fir', -1352, 32, 0.47),
  prop('fir', -1194, 407, 1.12), prop('fir', -808, 413, 0.85), prop('fir', -434, 400, 1.1),
  prop('rail', -1298, 28, 1.4), prop('rail', -1089, 306, 1.25), prop('rail', -744, 309, 1.35),
  prop('horse', -582, 304, 1),
  // Trees and rails around the square leave the gate spur open.
  prop('fir', -296, 99, 1.05), prop('fir', -244, 87, 0.82), prop('fir', -47, 83, 1.15),
  prop('fir', -322, 385, 1.05), prop('fir', -45, 305, 1.1), prop('fir', -279, 501, 1.15),
  prop('fir', -65, 560, 1.32), prop('orchard', -263, 348, 1.2), prop('orchard', -210, 361, 0.95),
  prop('orchard', -95, 228, 0.88), prop('rail', -368, 148, 1), prop('rail', -95, 423, 1),
  prop('rail', -356, 568, 1.1),
]

export function propBox({ kind, x, y, size }: VillageProp): Box {
  const box = propArt[kind].bounds
  return { x: x + box.x * size, y: y + box.y * size, w: box.w * size, h: box.h * size }
}

export function villagers(quests: Quests) {
  const seen = new Set<Who>()
  return quests.flatMap(({ who, from, role, building }) => {
    if (seen.has(who)) return []
    seen.add(who)
    return [{ who, name: from.replace(/^Mayor /, ''), role, building }]
  })
}

function listed(world: World, quest: QuestDef) {
  return !world.cleared.includes(quest.id) && world.level >= quest.needLevel && chainReady(world, quest)
}

export function journalRequests(world: World, quests: Quests) {
  return world.questId ? [] : quests.filter(quest => listed(world, quest))
}

export function villagerQuest(world: World, quests: Quests, who: Who) {
  const active = quests.find(quest => quest.id === world.questId && quest.who === who)
  return active ?? quests.find(quest => quest.who === who && listed(world, quest))
}

function activeMark(world: World) {
  return world.checks.length > 0 && world.checks.every(check => check.status === 'green') ? 'ready' : 'active'
}

export function villagerMark(world: World, quests: Quests, who: Who): VillagerMark | undefined {
  const quest = villagerQuest(world, quests, who)
  if (!quest) return
  if (world.questId === quest.id) return activeMark(world)
  if (!world.questId && canTake(world, quest)) return 'offer'
}

function appearance(world: World, quests: Quests, who: Who) {
  const mark = villagerMark(world, quests, who)
  const dim = !mark && !quests.some(quest => quest.who === who && world.cleared.includes(quest.id))
  return { mark, dim }
}

export function villagerDim(world: World, quests: Quests, who: Who) {
  return appearance(world, quests, who).dim
}

export function buildingState(world: World, quests: Quests, building: Building): 'working' | 'broken' {
  return quests.some(quest => quest.building === building && world.cleared.includes(quest.id)) ? 'working' : 'broken'
}

const comeBack = (level: number) => `Come back at level ${level}.`
const notYet = 'Not yet.'

export function idleLine(world: World, quests: Quests, who: Who) {
  const own = quests.filter(quest => quest.who === who)
  for (let i = world.cleared.length - 1; i >= 0; i--) {
    const latest = own.find(quest => quest.id === world.cleared[i])
    if (latest) return latest.change
  }
  return own[0] ? comeBack(own[0].needLevel) : notYet
}

export function villagerDialog(world: World, quests: Quests, who: Who) {
  const quest = villagerQuest(world, quests, who)
  const summary = quest && questSummary(world, quest)
  if (!quest || !summary) return { state: 'none', line: idleLine(world, quests, who) } as const
  if (world.questId === quest.id) return { state: activeMark(world), quest, summary } as const
  return { state: 'offer', quest, summary, canTake: !world.questId && canTake(world, quest), hold: questHold(world, quest) } as const
}

export function villageView(world: World, quests: Quests) {
  const people = villagers(quests)
  return {
    npcs: people.map(({ who, name, building }) => ({
      id: `npc:${who}`, who, name, spot: villagerSpot(building, who),
      ...appearance(world, quests, who),
    })),
    houses: [...new Set(quests.map(quest => quest.building))].map(building => ({
      building, state: buildingState(world, quests, building),
    })),
  }
}

export type VillageView = ReturnType<typeof villageView>
