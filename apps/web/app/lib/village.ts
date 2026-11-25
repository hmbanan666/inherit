import { canTake, chainReady, questHold, type Cell, type World } from '@inherit/sim/v8'
import type { QuestDef } from '../../../../packages/sim/src/v8/quests'
import { questSummary } from './questNote'
import { tile } from './floorPick'

type Who = QuestDef['who']
type Building = QuestDef['building']
type Quests = readonly QuestDef[]
type VillagerMark = 'offer' | 'active' | 'ready'

export const villageLabels = { goal: 'Goal', take: 'Take quest', handOver: 'Hand over', close: 'Close' }
export const villageCols = 4
export function fieldBounds(grid: World['grid']) {
  return { left: -villageCols * tile, top: 0, width: (grid.width + villageCols) * tile, height: grid.height * tile }
}

export const villageHomes = {
  forge: { x: -4, y: 0 },
  bakery: { x: -2, y: 0 },
  'town-hall': { x: -4, y: 2 },
  mill: { x: -2, y: 2 },
  'lamp-street': { x: -4, y: 4 },
  riverside: { x: -2, y: 4 },
  bridge: { x: -1, y: 5 },
} satisfies Record<Building, Cell>

const spots: Record<Who, Cell> = {
  bram: { x: -4, y: 1 }, elsie: { x: -2, y: 1 },
  ines: { x: -4, y: 3 }, harrow: { x: -3, y: 3 }, tomas: { x: -2, y: 3 },
  wen: { x: -4, y: 5 }, pell: { x: -2, y: 5 }, odile: { x: -1, y: 4 },
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
    npcs: people.map(({ who, name }) => ({
      id: `npc:${who}`, who, name, spot: spots[who],
      ...appearance(world, quests, who),
    })),
    houses: [...new Set(quests.map(quest => quest.building))].map(building => ({
      building, state: buildingState(world, quests, building),
    })),
  }
}

export type VillageView = ReturnType<typeof villageView>
