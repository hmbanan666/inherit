import { kettlewick } from '../packages/sim/src/v8'
import { assess, gapMinutes, span, type Gap } from './assessment'
import { balance } from './config'
import { humanMarkdown } from './humanEstimate'
import { minutes, type Event, type Run } from './playthrough'

function longest(gaps: Gap[]) {
  return gaps.reduce<Gap | undefined>((best, gap) => !best || gapMinutes(gap) > gapMinutes(best) ? gap : best, undefined)
}

function describe(event: Event) {
  if (event.kind === 'code change') return `${event.from} → ${event.to}. ${event.detail}`
  if (event.kind === 'purchase') return `${event.detail} (−${event.price})`
  return event.detail
}

export function report(run: Run) {
  const { quests, events } = run
  const { failures, dead, idle, plateaus, openings } = assess(run)
  const last = quests.at(-1)!.finish
  const number = (ticks: number) => minutes(ticks).toFixed(2)
  const rows = [
    '# Kettlewick balance report', '',
    `The reference player handed over ${quests.length} quests in **${last.tick} ticks (${number(last.tick)} minutes)** and finished with **${last.credits} credits, ${last.xp} XP, level ${last.level}**.`, '',
    `Each tick represents ${kettlewick.tickMs} ms on the [worker clock](../../apps/web/app/lib/factory.worker.ts), using [the site interval](../../packages/sim/src/v8/sites/kettlewick.ts). Actions are immediate. Reading, writing, debugging, and the shop are estimated under Human time.`, '',
    '## Balance findings', '',
    '| Status | Check | Measurement | Reason on record |', '|---|---|---|---|',
  ]
  for (const [id, text] of failures)
    rows.push(`| ${balance.expected[id] ? 'Expected failure' : '**New failure**'} | \`${id}\` | ${text} | ${balance.expected[id] ?? '—'} |`)
  for (const [id, why] of Object.entries(balance.expected))
    if (!failures.has(id)) rows.push(`| **Now passes** | \`${id}\` | Remove the resolved expectation. | ${why} |`)
  for (const [id, why] of Object.entries(balance.exemptions))
    rows.push(`| Exempt | \`code/${id}\` | Tutorial | ${why} |`)

  rows.push('', '## Quests', '',
    'Balances at Take precede any purchase for that quest. Hand-over includes its reward. Idle counts the time between a milestone, a newly passed check, or an increase in shipped goods.', '',
    '| Quest | Take tick (min) | Hand-over tick (min) | Duration (min) | Credits | XP | Level | Program | Longest idle (ticks) |',
    '|---|---:|---:|---:|---:|---:|---:|---|---|')
  for (const q of quests) {
    const { start, finish } = q
    const gap = longest(idle.filter(g => g.quest === q.id))
    rows.push(`| ${q.id} | ${start.tick} (${number(start.tick)}) | ${finish.tick} (${number(finish.tick)}) | ${number(finish.tick - start.tick)} | ${start.credits} → ${finish.credits} | ${finish.xp} | ${finish.level} | ${q.stage} | ${gap ? gap.start + '–' + gap.end : '—'} |`)
  }
  const widest = longest(dead)
  const still = longest(idle)
  const flat = longest(plateaus)
  if (widest && still && flat) rows.push('',
    `Longest gap between unlocks, quest boundaries, or edits was ${span(widest)}. Including quest progress, the longest idle stretch was ${span(still)} on ${still.quest}. The longest XP/level plateau was ${span(flat)}.`)

  rows.push('', ...humanMarkdown(run))

  rows.push('', '## Quest timeline and balances at hand-over', '',
    `The time column spans 0–${number(last.tick)} minutes. Credit bars share a scale. Each level block represents one level.`,
    '', '```text', 'Quest     Time along run                    Credits at hand-over       Level')
  const maxCredits = Math.max(...quests.map(q => q.finish.credits), 1)
  for (const q of quests) {
    const left = Math.round(q.start.tick / last.tick * 32)
    const width = Math.max(1, Math.round(q.finish.tick / last.tick * 32) - left)
    const time = ' '.repeat(left) + '━'.repeat(width)
    const credits = '█'.repeat(Math.round(q.finish.credits / maxCredits * 16))
    rows.push(`${q.id.padEnd(10)}${time.padEnd(34)}${credits.padEnd(17)}${String(q.finish.credits).padEnd(6)}${'█'.repeat(q.finish.level)} ${q.finish.level}`)
  }
  rows.push('```', '', '## Shop at the planned hand-over', '',
    'Each convenience is priced against the unspent purse at the hand-over that can first afford it. The reference run does not buy.',
    '', '| Item | Quest | Tick | Credits | Price | Purse / price |', '|---|---|---:|---:|---:|---:|')
  for (const entry of openings)
    rows.push(`| ${entry.id} | ${entry.quest} | ${entry.tick} | ${entry.credits} | ${entry.price} | ${entry.ratio.toFixed(2)}× |`)

  rows.push('', '## Previous program trials', '',
    'Each proposed edit gets a separate replay from Take with the same purchase policy. Trial ticks are excluded from player time. A failed trial deploys the next program. A successful previous program stays deployed.', '',
    '| Quest | Previous program | Trial ticks | Checks still open |', '|---|---|---:|---|')
  for (const p of run.probes) rows.push(`| ${p.quest} | ${p.stage} | ${p.ticks} | ${p.remaining.join(' · ') || 'Cleared'} |`)

  // Group capabilities that appeared together, preserving their position
  // relative to Take, Hand over and purchases on that same tick.
  rows.push('', '## Event ledger', '',
    '| Tick | Minute | Event | Detail | Credits | XP | Level |', '|---:|---:|---|---|---:|---:|---:|')
  const ledger = events.filter(e => e.kind !== 'progress')
  for (let i = 0; i < ledger.length; i++) {
    const e = ledger[i]
    const details = [describe(e)]
    while (e.kind === 'unlock' && ledger[i + 1]?.kind === 'unlock' && ledger[i + 1].tick === e.tick)
      details.push(describe(ledger[++i]))
    rows.push(`| ${e.tick} | ${number(e.tick)} | ${e.kind} | ${details.join(', ')} | ${e.credits} | ${e.xp} | ${e.level} |`)
  }
  rows.push('', '<details>', '<summary>All intervals between quest progress or milestones</summary>', '',
    '| Quest | Tick ranges |', '|---|---|')
  for (const q of quests) {
    const ranges = idle.filter(g => g.quest === q.id).map(g => `${g.start}–${g.end}`)
    rows.push(`| ${q.id} | ${ranges.join(', ')} |`)
  }
  rows.push('', '</details>')
  return rows.join('\n') + '\n'
}
