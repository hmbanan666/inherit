import { createWorld, kettlewick } from '@inherit/sim/v8'
import { expect, test } from 'vitest'
import { sampleMetrics } from './metricHistory'

test('a CPU purchase updates its tick and preserves the earlier usage and ceiling', () => {
  const world = createWorld(kettlewick)
  const first = sampleMetrics([], { ...world, tick: 20, cpu: { used: 4, limit: 50 } })
  const beforePurchase = sampleMetrics(first, { ...world, tick: 21, cpu: { used: 7, limit: 50 } })
  const afterPurchase = sampleMetrics(beforePurchase, { ...world, tick: 21, cpu: { used: 7, limit: 60 } })
  const history = sampleMetrics(afterPurchase, { ...world, tick: 22, cpu: { used: 9, limit: 60 } })

  expect(history.map(({ tick, cpu, limit }) => [tick, cpu, limit])).toEqual([
    [20, 4, 50],
    [21, 7, 60],
    [22, 9, 60],
  ])
})
