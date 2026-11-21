import { expect, test } from 'vitest'
import { createCampaign, serializeSave } from '@inherit/sim'
import { previewProject } from './preview'

test('compare the draft with deployed code from the same live floor and memory', async () => {
  const live = createCampaign()
  live.memory.start = 7
  live.project.working['main.ts'] = `export function onTick(ctx) {
    if (memory.start !== 7) throw new Error("missing ledger")
    ctx.connect("mine","furnace")
    ctx.connect("furnace","cart")
    ctx.dig("mine")
    ctx.work("furnace")
  }`
  const before = serializeSave(live)
  const result = await previewProject(live, 100)
  expect(result.baseline.shipped).toBe(0)
  expect(result.draft.shipped).toBeGreaterThan(0)
  expect(result.draft.money).toBeGreaterThan(result.baseline.money)
  expect(result.draft.cpuPeak).toBeGreaterThan(0)
  expect(result.draft.errors).toBe(0)
  expect(serializeSave(live)).toBe(before)
})

test('a stopped draft leaves its machines running idle for the remaining ticks', async () => {
  const live = createCampaign()
  live.project.working['main.ts'] =
    'export function onTick(ctx) { ctx.dig("mine"); throw new Error("valve stuck") }'
  const result = await previewProject(live, 500)
  expect(result.draft.errors).toBe(1)
  expect(result.draft.firstError).toMatch(/main.ts:1.*valve stuck/)
  expect(result.draft.cpuPeak).toBeGreaterThan(0)
  expect(result.baseline.errors).toBe(0)
})
