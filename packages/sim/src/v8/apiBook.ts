import { exampleText, type Brick } from './core/bricks'
import type { World } from './core/world'
import { freshBrick, functionUnlocked, questList, rewardFresh, shop, triggerUnlocked, type WorksTrigger } from './quests'
import { triggerDocs } from './triggers'

export interface ApiEntry {
  id: string
  signature: string
  doc: string
  example: string
  locked?: string
  fresh?: boolean
}

export interface ApiSection {
  id: string
  title: string
  entries: ApiEntry[]
}

const groups: { id: string; title: string; match(name: string): boolean }[] = [
  { id: 'furnace', title: 'Furnace', match: name => name === 'furnace' || name.startsWith('furnace.') },
  { id: 'press', title: 'Press', match: name => name === 'press' || name.startsWith('press.') || name === 'spare' || name.startsWith('spare.') },
  { id: 'lathe', title: 'Lathe', match: name => name === 'lathe' || name.startsWith('lathe.') },
  { id: 'bench', title: 'Assembly table', match: name => name === 'bench' || name.startsWith('bench.') },
  { id: 'drone', title: 'Drone', match: name => name === 'drones' || name.startsWith('drone.') },
  { id: 'depot', title: 'Depot', match: name => name === 'depot' || name.startsWith('depot.') },
  { id: 'veins', title: 'Veins', match: name => name === 'veins' || name === 'prospect' || name === 'findPath' },
]

function shownSignature(name: string, signature: string) {
  if (!name.includes('.')) return signature
  const owner = name.slice(0, name.indexOf('.'))
  if (signature.startsWith('readonly ')) return `readonly ${owner}.${signature.slice('readonly '.length)}`
  return `${owner}.${signature}`
}

function lockTitle(brick: string) {
  if (brick === 'press.grate') return questList.find(quest => quest.unlock?.brick === 'press.grate')?.title
  if (brick === 'spare' || brick.startsWith('spare.')) return shop.find(item => item.id === 'spare')?.name
  if (brick === 'press' || brick.startsWith('press.')) return questList.find(quest => quest.install === 'press')?.title
  if (brick === 'lathe' || brick.startsWith('lathe.')) return questList.find(quest => quest.install === 'lathe')?.title
  if (brick === 'bench' || brick.startsWith('bench.')) return questList.find(quest => quest.install === 'assembly table')?.title
  return questList.find(quest => quest.unlock?.brick === brick)?.title
}

/** The API book. Every line comes from the brick list or the trigger docs. */
export function apiBook(bricks: readonly Brick[], world: Pick<World, 'questId' | 'cleared' | 'bought' | 'automation'>): ApiSection[] {
  const used = new Set<string>()
  const sections = groups.map(group => {
    const entries = bricks.filter(brick => group.match(brick.name)).map(brick => {
      used.add(brick.name)
      const title = lockTitle(brick.name)
      return {
        id: brick.name,
        signature: shownSignature(brick.name, brick.signature),
        doc: brick.doc,
        example: exampleText(brick.doc, brick.example),
        locked: functionUnlocked(world, brick.name) ? undefined : title,
        fresh: brick.name === 'press' || brick.name.startsWith('press.')
          ? rewardFresh(world, 'odile')
          : brick.name === 'lathe' || brick.name.startsWith('lathe.')
            ? rewardFresh(world, 'harrow')
            : brick.name === 'bench' || brick.name.startsWith('bench.')
              ? rewardFresh(world, 'tomas')
              : freshBrick(world, brick.name),
      }
    })
    return { id: group.id, title: group.title, entries }
  })
  const works = bricks.filter(brick => !used.has(brick.name)).map(brick => ({
    id: brick.name,
    signature: shownSignature(brick.name, brick.signature),
    doc: brick.doc,
    example: exampleText(brick.doc, brick.example),
    locked: undefined,
    fresh: false,
  }))
  const events: ApiEntry[] = triggerDocs.map(entry => {
    const quest = questList.find(item => item.trigger === entry.id)
    const open = triggerUnlocked(world, entry.id as WorksTrigger)
    return {
      id: entry.id,
      signature: entry.signature,
      doc: entry.doc,
      example: entry.example,
      locked: open ? undefined : quest?.title,
      fresh: !!quest && rewardFresh(world, quest.id),
    }
  })
  return [
    ...sections,
    { id: 'events', title: 'Events', entries: events },
    { id: 'works', title: 'Works', entries: works },
  ]
}
