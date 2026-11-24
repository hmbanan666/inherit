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

  // Shop entries from a single observation are consecutive. Measure the
  // purse before spending, both per item and for the simultaneous opening.
  const openings = []
  for (let i = 0; i < run.events.length; i++) {
    const first = run.events[i]
    if (first.kind !== 'unlock' || !first.listing) continue
    const listings = [first.listing]
    while (i + 1 < run.events.length) {
      const next = run.events[i + 1]
      if (next.kind !== 'unlock' || !next.listing || next.tick !== first.tick) break
      listings.push(next.listing)
      i++
    }
    const prices = [...listings]
    if (listings.length > 1) prices.push({
      id: listings.map(item => item.id).sort().join('+'),
      price: listings.reduce((total, item) => total + item.price, 0),
    })
    for (const { id, price } of prices) {
      const ratio = first.credits / price
      openings.push({ id, price, tick: first.tick, credits: first.credits, ratio })
      if (ratio < 1 || ratio > balance.maxHoardRatio) {
        const issue = ratio < 1 ? 'shortfall' : 'hoard'
        failures.set(`shop/${issue}/${id}`, `${first.credits} credits / ${price} price = ${ratio.toFixed(2)}× at tick ${first.tick} (target 1–${balance.maxHoardRatio}×).`)
      }
    }
  }
  return { failures, dead, idle, plateaus, openings }
}
