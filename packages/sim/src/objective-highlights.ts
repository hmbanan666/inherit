import type { Campaign, CampaignMachine } from './model'
import type { Objective } from './objectives'
import { RESEARCH } from './research'

type Highlight = Objective['highlight']
type MachineTarget = Extract<Highlight, { type: 'machine' }>

// Quoted station names in examples are roles. The player may have chosen different IDs.
const examples: Record<string, MachineTarget> = {
  mine: { type: 'machine', kind: 'miner', deposit: 'iron' },
  'furnace-a': { type: 'machine', kind: 'furnace' },
  'furnace-b': { type: 'machine', kind: 'furnace' },
  'coal-mine': { type: 'machine', kind: 'miner', deposit: 'coal' },
  copper: { type: 'machine', kind: 'miner', deposit: 'copper' },
  smelter: { type: 'machine', kind: 'furnace', recipe: 'copper-ingot' },
  draw: { type: 'machine', kind: 'cutter', recipe: 'wire' },
  teeth: { type: 'machine', kind: 'cutter', recipe: 'gear' },
  jig: { type: 'machine', kind: 'assembler', recipe: 'bracket' },
  press: { type: 'machine', kind: 'press' },
  splitter: { type: 'machine', kind: 'splitter' },
  buffer: { type: 'machine', kind: 'storage' },
  merge: { type: 'machine', kind: 'merger' },
  sorter: { type: 'machine', kind: 'sorter' },
  scrap: { type: 'machine', kind: 'scrap' },
  truck: { type: 'machine', kind: 'truck' },
  local: { type: 'machine', kind: 'depot' },
  remote: { type: 'machine', kind: 'depot' },
  'motor-jig': { type: 'machine', kind: 'assembler', recipe: 'motor' },
}
function station(c: Campaign, target: MachineTarget, sample?: string): CampaignMachine | undefined {
  let matches = c.world.machines.filter(
    (m) => m.kind === target.kind && (!target.deposit || m.deposit === target.deposit),
  )
  const exact = matches.find((m) => m.id === (target.id ?? sample))
  if (exact) return exact
  if (sample === 'furnace-b') matches = matches.filter((m) => m.id !== 'furnace-a')
  if (sample === 'local' || sample === 'remote')
    matches = matches.filter((m) => m.siteId === (sample === 'local' ? 'shed' : 'yard'))
  if (target.recipe) {
    const chosen = matches.filter((m) => m.recipe === target.recipe)
    if (chosen.length === 1) return chosen[0]
  }
  return matches.length === 1 ? matches[0] : undefined
}
function shopTarget(c: Campaign, target: Extract<Highlight, { type: 'shop' }>): Highlight {
  const { item } = target
  const license =
    item === 'road'
      ? 'road'
      : item === 'belt'
        ? undefined
        : RESEARCH.find((n) => n.machines?.includes(item))?.id
  if (license && !c.economy.research.includes(license)) return { type: 'research', id: license }
  return target
}
function focus(c: Campaign, target: Highlight): Highlight {
  if (target.type === 'shop') return shopTarget(c, target)
  if (target.type === 'machine') {
    const match = station(c, target, target.id)
    if (match) return { ...target, id: match.id }
    if (!c.world.machines.some((m) => m.kind === target.kind))
      return shopTarget(c, { type: 'shop', item: target.kind, siteId: 'shed' })
  }
  if (target.type === 'tile') {
    const plot = c.world.sites
      .find((s) => s.id === target.siteId)
      ?.plots.find(
        (p) => target.x >= p.x && target.x < p.x + p.width && target.y >= p.y && target.y < p.y + p.height,
      )
    if (plot?.status === 'sale') return { type: 'plot', siteId: target.siteId, id: plot.id }
  }
  return target
}
export function activeCard(c: Campaign, card: Objective): Objective {
  const hints = card.hints.map((line) =>
    line.replace(/"([^"]+)"/g, (quoted, name: string) => {
      const target = Object.hasOwn(examples, name) ? examples[name] : undefined
      const selected = target && station(c, target, name)
      return selected ? JSON.stringify(selected.id) : quoted
    }),
  )
  return { ...card, hints, highlight: focus(c, card.highlight) }
}
