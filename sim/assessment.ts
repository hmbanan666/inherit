import { questList, shop } from '../packages/sim/src/v8'
import { balance } from './config'
import { minutes, type Event, type Run } from './playthrough'

export interface Gap {
  start: number
  end: number
  quest?: string
}

const milestone = (e: Event) => ['start', 'finish', 'unlock', 'code change'].includes(e.kind)

function intervals(events: Event[], moved: (e: Event) => boolean) {
  const gaps: Gap[] = []
  let start = 0
  for (const event of events) {
    if (!moved(event)) continue
    if (event.tick > start) gaps.push({ start, end: event.tick, quest: event.quest })
    start = event.tick
  }
  const last = events.at(-1)
  if (last && start < last.tick) gaps.push({ start, end: last.tick, quest: last.quest })
  return gaps
}

export const gapMinutes = (gap: Gap) => minutes(gap.end - gap.start)
export const span = (gap: Gap) => `${gapMinutes(gap).toFixed(2)} min (ticks ${gap.start}–${gap.end})`

export function assess(run: Run) {
  const failures = new Map<string, string>()
  // A check can move or a delivery arrive during a long wait for a new decision.
  const dead = intervals(run.events, milestone)
  const idle = intervals(run.events, e => milestone(e) || e.kind === 'progress')
  let xp = run.events[0].xp
  let level = run.events[0].level
  const plateaus = intervals(run.events, e => {
    if (e.xp <= xp && e.level <= level) return false
    xp = e.xp
    level = e.level
    return true
  })
  if (xp === run.events[0].xp && level === run.events[0].level)
    failures.set('xp/advance', 'Neither XP nor level advanced during the run.')

  function checkGaps(prefix: string, gaps: Gap[], limit: number) {
    for (const gap of [...gaps].sort((a, b) => gapMinutes(a) - gapMinutes(b))) {
      if (gapMinutes(gap) > limit)
        failures.set(`${prefix}/${gap.quest}`, `${span(gap)}, above ${limit} min.`)
    }
  }
  checkGaps('milestone', dead, balance.maxDeadMinutes)
  checkGaps('xp', plateaus, balance.maxXpPlateauMinutes)

  for (const quest of run.quests) {
    const elapsed = minutes(quest.finish.tick - quest.start.tick)
    const { min, max } = balance.duration
    if (elapsed < min || elapsed > max)
      failures.set(`duration/${quest.id}`, `${elapsed.toFixed(2)} min, outside ${min}–${max} min.`)
    if (balance.exemptions[quest.id]) continue
    const edit = run.events.find(e => e.kind === 'code change' && e.quest === quest.id)
    const trial = run.probes.find(p => p.quest === quest.id)
    if (!edit)
      failures.set(`code/${quest.id}`, `Cleared with the unchanged ${quest.stage} program.`)
    else if (!trial || trial.clears)
      failures.set(`code/${quest.id}`, 'The edit has no failed previous-program trial.')
  }

  // Each convenience is priced against the purse at the hand-over that can
  // first afford it. A ratio under 1 is a shortfall. A ratio over the cap is
  // late hoarding. Cheap items are not scored against the final purse.
  const planned: [string, string][] = [
    ['cart', 'ines'],
    ['hopper', 'odile'],
    ['furnace', 'elsie'],
    ['racks', 'harrow'],
    ['cpu', 'tomas'],
    ['spare', 'pell'],
  ]
  const openings = []
  for (const [id, questId] of planned) {
    const item = shop.find(entry => entry.id === id)
    const quest = run.quests.find(entry => entry.id === questId)
    const plan = questList.find(entry => entry.id === questId)
    if (!item || !quest || !plan) continue
    const ratio = quest.finish.credits / item.price
    openings.push({ id, price: item.price, tick: quest.finish.tick, credits: quest.finish.credits, ratio, quest: plan.title })
    if (ratio < 1 || ratio > balance.maxHoardRatio) {
      const issue = ratio < 1 ? 'shortfall' : 'hoard'
      failures.set(`shop/${issue}/${id}`, `${quest.finish.credits} credits / ${item.price} price = ${ratio.toFixed(2)}× at ${plan.title} (target 1–${balance.maxHoardRatio}×).`)
    }
  }
  return { failures, dead, idle, plateaus, openings }
}
