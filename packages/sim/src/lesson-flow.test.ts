import { expect, test } from 'vitest'
import {
  primitiveTick,
  beginLessonAttempt,
  observeLesson,
  createCampaign,
  currentStep,
  continueStep,
  primaryButton,
  revealed,
} from './index'

test('the first brief waits for a real run and Continue cannot skip it', () => {
  const c = createCampaign()
  expect(currentStep(c)).toMatchObject({ step: { id: 'bram-take' }, phase: 'brief', index: 0 })
  expect(primaryButton(c)).toBe('run')
  expect(continueStep(c)).toEqual(c)
  expect(revealed(c)).toEqual([])
})

test('checking a transfer returns new progress without changing the input campaign', () => {
  const c = createCampaign()
  const run = primitiveTick(c, 'run')
  run.api.take('mine')
  run.finish()
  c.lesson = beginLessonAttempt(c)
  const before = structuredClone(c)
  expect(observeLesson(c, run.calls).phase).toBe('solved')
  expect(c).toEqual(before)
})

test('one Continue drains a saved queue once in its authored order', () => {
  const campaign = createCampaign()
  campaign.lesson.phase = 'solved'
  campaign.lesson.queue = [{kind: 'coins'}, {kind: 'debt'}, {kind: 'debt'}]
  campaign.lesson.released = [{kind: 'coins'}]
  const next = continueStep(campaign)
  expect(next.lesson.index).toBe(1)
  expect(next.lesson.queue).toEqual([])
  expect(next.lesson.released).toEqual([{kind: 'coins'}, {kind: 'debt'}])
})
