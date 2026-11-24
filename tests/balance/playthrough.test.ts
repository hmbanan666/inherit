import { beforeAll, expect, test } from 'vitest'
import { declarations, factoryBricks, kettlewick, questList } from '../../packages/sim/src/v8'
import { diagnostics } from '../v8/diagnostics'
import { report } from '../../sim/report'
import { assess } from '../../sim/assessment'
import { balance } from '../../sim/config'
import { humanTime } from '../../sim/human'
import { estimateHuman } from '../../sim/humanEstimate'
import { players } from '../../sim/policy'
import { playthrough, type Run } from '../../sim/playthrough'

let run: Run
beforeAll(async () => {
  const start = performance.now()
  run = await playthrough()
  const ticks = run.quests.at(-1)!.finish.tick
  const trials = run.probes.reduce((total, trial) => total + trial.ticks, 0)
  const rate = Math.round((ticks + trials) * 1000 / (performance.now() - start))
  const average = estimateHuman(run).profiles.find(profile => profile.id === humanTime.defaultProfile)
  console.info(`${ticks} playthrough ticks + ${trials} previous-program ticks, ${rate} ticks/s including deploys. Average human estimate ${average?.totals.total.toFixed(2)} min.`)
}, 120_000)

test('a fresh works hands over every quest before the run limit', () => {
  expect([...run.cleared].sort()).toEqual(questList.map(quest => quest.id).sort())
})

test('Loop and drone-2 arrive on hand-over, before the next Take', () => {
  const { events } = run
  function position(kind: string, quest: string, detail?: string) {
    const index = events.findIndex(e => e.kind === kind && e.quest === quest && (!detail || e.detail === detail))
    expect(index, [kind, quest, detail].join(' ')).toBeGreaterThanOrEqual(0)
    return index
  }
  for (const [reward, giver, next] of [['Loop', 'ines', 'odile'], ['Machine · drone-2', 'odile', 'elsie']]) {
    const unlock = position('unlock', giver, reward)
    const finish = position('finish', giver)
    expect(unlock).toBeGreaterThan(finish)
    expect(events[unlock].tick).toBe(events[finish].tick)
    expect(unlock).toBeLessThan(position('start', next))
  }
  const takes = events.filter(e => e.kind === 'start')
  expect(takes.find(e => e.quest === 'odile')?.eligible).not.toContain('elsie')
  expect(takes.find(e => e.quest === 'elsie')?.eligible).toContain('elsie')
})

test('each reference project typechecks against the real editor declarations', () => {
  const types = declarations(factoryBricks(kettlewick))
  for (const [name, files] of Object.entries(players)) expect(diagnostics(files, types), name).toEqual([])
})

test('human time stays out of the balance gate', () => {
  const { failures } = assess(run)
  const estimate = estimateHuman(run)
  for (const warning of estimate.warnings) expect(failures.has(warning.id), warning.text).toBe(false)
  const average = estimate.profiles.find(profile => profile.id === humanTime.defaultProfile)
  expect(average?.quests).toHaveLength(run.quests.length)
  expect(average?.totals.total).toBe(average?.quests.at(-1)?.cumulative)
  const fast = estimate.profiles.find(profile => profile.id === 'fast')
  const newbie = estimate.profiles.find(profile => profile.id === 'newbie')
  expect(fast && average && newbie && fast.totals.total < average.totals.total && newbie.totals.total > average.totals.total).toBe(true)
  expect(report(run)).toContain('## Human time')
  expect(report(run)).toContain('| **Total** |')
})

test('the balance findings match the explicit expected failures', () => {
  const { failures } = assess(run)
  expect([...failures.keys()].sort(), JSON.stringify(Object.fromEntries(failures), null, 2))
    .toEqual(Object.keys(balance.expected).sort())
})

test('the checked-in balance report describes this playthrough', async () => {
  await expect(report(run)).toMatchFileSnapshot('../../docs/sim/report.md')
})
