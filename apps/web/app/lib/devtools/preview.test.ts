import { expect, test } from 'vitest'
import { createCampaign, jumpToStep, serializeSave } from '@inherit/sim'
import { previewProject } from './preview'

test('compare the draft with deployed code from the same live floor and memory', async () => {
  const live = jumpToStep(createCampaign(), 'bram-loop')
  live.town.wired = true
  live.project.working['main.ts'] = `import { take, put } from "inherit"
  export function onTick() {
    take("mine")
    put("furnace")
    take("furnace")
    put("cart")
  }`
  const before = serializeSave(live)
  const result = await previewProject(live, 500)
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
    'import { take } from "inherit"; export function onTick() { take("mine"); throw new Error("valve stuck") }'
  const result = await previewProject(live, 500)
  expect(result.draft.errors).toBe(1)
  expect(result.draft.firstError).toMatch(/main.ts:1.*valve stuck/)
  expect(result.draft.cpuPeak).toBeGreaterThan(0)
  expect(result.baseline.errors).toBe(0)
})
