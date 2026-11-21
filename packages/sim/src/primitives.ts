import { blueprintCommands } from './blueprints'
import type { MaterialId, RecipeId } from './campaign-api'
import { recordStats } from './engine'
import { hasRoom, produce } from './transport'
import { RECIPES } from './catalog'
import type { Campaign, CampaignMachine } from './model'
import { finishProduction, work } from './production'
import { availableMachines, type ChapterMachine } from './research'
import { wanted } from './town'

function recipeFor(machine: CampaignMachine, item?: MaterialId): RecipeId | undefined {
  switch (machine.kind) {
    case 'furnace':
      return item === 'iron-ore' ? 'iron-ingot' : item === 'copper-ore' ? 'copper-ingot' : undefined
    case 'press':
      return item === 'iron-ingot' || item === 'copper-ingot' ? 'plate' : undefined
    case 'cutter':
      return item === 'plate' ? 'gear' : item === 'copper-ingot' ? 'wire' : undefined
    case 'assembler':
      return item === 'plate' || item === 'wire' ? 'bracket' : undefined
  }
}


export function primitiveTick(c: Campaign) {
  const w = c.world
  w.tick++
  w.lastEvents = []
  const hops: NonNullable<typeof w.hops> = (w.hops = [])
  const machine = (id: string) => w.machines.find((m) => m.id === id)
  const mine = machine('mine')!
  if (!mine.output && w.tick % 4 === 1) {
    w.seed = (Math.imul(1664525, w.seed) + 1013904223) >>> 0
    mine.output = { kind: c.town.beat >= 4 && w.seed % 3 === 0 ? 'copper-ore' : 'iron-ore' }
  }
  const held: { origin: CampaignMachine; kind: MaterialId; jam: boolean; hop: (typeof hops)[number] }[] = []
  const api = {
    tick: w.tick,
    look(place: string) {
      const m = machine(place)
      return {
        status: m?.fault ?? m?.status ?? 'missing',
        inside: m?.queue.map((i) => i.kind) ?? [],
        ready: m?.fault === 'jammed' ? m.queue.at(-1)?.kind : m?.output?.kind,
        ...(place === 'cart' ? { wanted: wanted(c), waiting: { ...c.town.waiting } } : {}),
      }
    },
    take(place: string) {
      const m = machine(place)
      if (!m || m.fault === 'broken') return
      const jam = m.fault === 'jammed'
      const item = jam ? m.queue.pop() : m.output
      if (!item) return
      if (jam) delete m.fault
      else delete m.output
      const hop = { from: place, to: place, item: item.kind }
      hops.push(hop)
      held.push({ origin: m, kind: item.kind, jam, hop })
      if (m === mine) {
        produce(w, m)
        w.extracted[item.kind] = (w.extracted[item.kind] ?? 0) + 1
      }
      return item.kind
    },
    put(place: string, item: MaterialId | undefined) {
      const i = held.findIndex((h) => h.kind === item)
      const m = machine(place)
      if (!m || i < 0 || !item || m.fault) return false
      if (m.kind === 'dock') {
        produce(w, m)
        c.town.waiting[item] = (c.town.waiting[item] ?? 0) + 1
        w.delivered[item] = (w.delivered[item] ?? 0) + 1
      } else {
        const recipe = recipeFor(m, item)
        if (!recipe || !hasRoom(w, m, { kind: item })) return false
        if (
          m.kind === 'furnace' &&
          ((m.queue[0] && m.queue[0].kind !== item) || ((m.remaining || m.output) && m.recipe !== recipe))
        )
          m.fault = 'jammed'
        m.queue.push({ kind: item })
      }
      held[i].hop.to = place
      held.splice(i, 1)
      return true
    },
    buy(kind: ChapterMachine, name: string = kind) {
      if (!availableMachines(c).includes(kind)) return false
      return !!blueprintCommands(c).build(kind, { name })
    },
    repair(place: string) {
      const m = machine(place)
      if (c.town.beat < 6 || m?.fault !== 'broken') return false
      delete m.fault
      delete m.coolAt
      c.progress.signals.recovered = true
      return true
    },
  }
  function finish() {
    for (const { origin, kind, jam } of held.reverse()) {
      if (jam) {
        origin.queue.push({ kind })
        origin.fault = 'jammed'
      } else origin.output = { kind }
    }
    for (const m of w.machines) {
      if (m.coolAt && m.coolAt <= w.tick) {
        delete m.coolAt
        delete m.fault
      }
      if (m.fault) {
        m.status = 'blocked'
        recordStats(w, m)
        continue
      }
      const item = m.queue[0]?.kind
      const recipe =
        m.kind === 'cutter' &&
        item === 'plate' &&
        m.queue.filter((i) => i.kind === 'plate').length < 2 &&
        m.queue.some((i) => i.kind === 'copper-ingot')
          ? 'wire'
          : recipeFor(m, item)
      if (!m.remaining && !m.output && recipe) {
        // Both metals can be flattened by the same die.
        if (recipe === 'plate' && item === 'copper-ingot') {
          m.queue.shift()
          m.recipe = recipe
          m.remaining = RECIPES.plate.ticks
        } else work(m, recipe)
      }
      if (m.remaining) finishProduction(w, m)
      m.status = m.output ? 'ready' : m.remaining ? 'working' : 'idle'
      recordStats(w, m)
      if (m.kind === 'furnace' && c.town.beat >= 6 && m.status === 'working') {
        m.heat = (m.heat ?? 0) + 1
        if (m.heat >= (m.heatLimit ?? 24)) {
          m.fault = 'broken'
          m.coolAt = w.tick + 240
          m.heat = 0
        }
      }
    }
  }
  return { api, finish }
}
export type ChapterFactory = ReturnType<typeof primitiveTick>['api']
