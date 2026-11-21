import { blueprintCommands } from './blueprints'
import type { MaterialId, RecipeId } from './campaign-api'
import { recordStats } from './engine'
import { hasRoom, produce } from './transport'
import { lessons } from './lessons'
import { placeNames, type CallRecord } from './lesson-flow'
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

export function primitiveTick(c: Campaign, mode: 'run' | 'tick' | 'idle' | 'deploy' = 'tick') {
  const w = c.world
  const calls: CallRecord[] = []
  let site: Pick<CallRecord, 'file' | 'line' | 'within'> = { file: 'main.ts', line: 1 }
  const machine = (id: string) => w.machines.find((m) => m.id === id)
  function returnHand() {
    if (!w.hand) return
    const { origin, item, jam } = w.hand
    const m = machine(origin)!
    if (jam) {
      m.queue.push({ kind: item })
      m.fault = 'jammed'
    } else m.output = { kind: item }
    delete w.hand
  }
  if (mode !== 'idle') returnHand()
  w.tick++
  w.lastEvents = []
  const hops: NonNullable<typeof w.hops> = (w.hops = [])
  const mine = machine('mine')!
  const interval = c.town.beat === 1 && c.town.wired && c.town.filled ? 64 : 4
  if (!mine.output && w.hand?.origin !== 'mine' && w.tick % interval === 1) {
    w.seed = (Math.imul(1664525, w.seed) + 1013904223) >>> 0
    const lesson = lessons[c.lesson.index]?.id
    // This part of the vein supplies paired samples; the cutter for excess copper comes later.
    const mixedOre = lesson === 'vein-sort' ? mine.stats.processed % 2 === 0 : w.seed % 3 === 0
    const copper = c.town.beat >= 4 && (lesson === 'vein-sample' || mixedOre)
    mine.output = { kind: copper ? 'copper-ore' : 'iron-ore' }
  }
  function record<T>(fn: CallRecord['fn'], args: string[], result: T, message?: string): T {
    calls.push({ ...site, fn, args, ok: !message, result, message, hand: w.hand?.item ?? null })
    return result
  }
  const unknown = (place: string) =>
    `There is no place called "${place}". Places: ${placeNames(c).join(', ')}.`
  const api = {
    tick: w.tick,
    traceSite(next: typeof site) {
      site = next
    },
    look(place: string) {
      const m = machine(place)
      return record(
        'look',
        [place],
        {
          status: m?.fault ?? m?.status ?? 'missing',
          inside: m?.queue.map((i) => i.kind) ?? [],
          ready: m?.fault === 'jammed' ? m.queue.at(-1)?.kind : m?.output?.kind,
          ...(place === 'cart' ? { wanted: wanted(c), waiting: { ...c.town.waiting } } : {}),
        },
        m ? undefined : unknown(place),
      )
    },
    take(place: string): MaterialId | undefined {
      const m = machine(place)
      if (!m) return record('take', [place], undefined, unknown(place))
      if (w.hand) return record('take', [place], undefined, 'The hand is full. Put down the item first.')
      const jam = m.fault === 'jammed'
      const item = jam ? m.queue.pop() : m.output
      if (!item || m.fault === 'broken')
        return record('take', [place], undefined, `Nothing ready yet at ${place}.`)
      if (jam) delete m.fault
      else delete m.output
      w.hand = { origin: place, item: item.kind, jam }
      hops.push({ from: place, to: place, item: item.kind })
      if (m === mine) {
        produce(w, m)
        w.extracted[item.kind] = (w.extracted[item.kind] ?? 0) + 1
      }
      return record('take', [place], item.kind)
    },
    put(place: string) {
      const m = machine(place)
      const held = w.hand
      if (!m) return record('put', [place], false, unknown(place))
      if (!held) return record('put', [place], false, 'The hand is empty. Pick something up first.')
      const { item } = held
      if (m.kind === 'dock') {
        if (c.town.beat === 1 && c.town.wired && item === 'iron-ingot') machine('furnace')!.batchTicks = 64
        produce(w, m)
        c.town.waiting[item] = (c.town.waiting[item] ?? 0) + 1
        w.delivered[item] = (w.delivered[item] ?? 0) + 1
      } else {
        const recipe = recipeFor(m, item)
        if (!recipe || m.fault || !hasRoom(w, m, { kind: item })) {
          returnHand()
          return record(
            'put',
            [place],
            false,
            `The ${place} cannot accept ${item.replaceAll('-', ' ')} right now.`,
          )
        }
        if (
          m.kind === 'furnace' &&
          ((m.id === 'furnace' && c.town.beat >= 4 && item === 'copper-ore') ||
            (m.queue[0] && m.queue[0].kind !== item) ||
            ((m.remaining || m.output) && m.recipe !== recipe))
        )
          m.fault = 'jammed'
        m.queue.push({ kind: item })
      }
      hops[hops.length - 1].to = place
      delete w.hand
      return record('put', [place], true)
    },
    buy(kind: ChapterMachine, name?: string) {
      const commands = blueprintCommands(c)
      const ok = availableMachines(c).includes(kind) && !!commands.build(kind, { name })
      return record(
        'buy',
        name === undefined ? [kind] : [kind, name],
        ok,
        ok ? undefined : (commands.lastError() ?? 'That machine is not for sale yet.'),
      )
    },
    repair(place: string) {
      const m = machine(place)
      if (!m) return record('repair', [place], false, unknown(place))
      if (c.town.beat < 6 || m.fault !== 'broken')
        return record('repair', [place], false, 'This machine does not need a repair.')
      delete m.fault
      delete m.coolAt
      c.progress.signals.recovered = true
      return record('repair', [place], true)
    },
  }
  function finish() {
    if (mode === 'tick' || mode === 'deploy') returnHand()
    for (const m of w.machines) {
      if (w.hand?.origin === m.id) continue
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
  return { api, finish, calls }
}
export type ChapterFactory = ReturnType<typeof primitiveTick>['api']
