import { expect, test } from 'vitest'
import { createCampaign, objectiveTrack, placeMachine } from '@inherit/sim'
import { buildGuide } from './buildGuide'

test('the guide uses the current card and a machine on the player’s floor', () => {
  const c = createCampaign()
  expect(buildGuide(c, objectiveTrack(c).active)).toEqual(['focus', 'mine'])
  c.progress.completedObjectives = ['copper-bar']
  expect(buildGuide(c, objectiveTrack(c).active)).toEqual(['research', 'cutter'])
  c.economy.research.push('cutter')
  expect(buildGuide(c, objectiveTrack(c).active)?.slice(0, 2)).toEqual(['machine', 'cutter'])
  placeMachine(c, 'cutter', 'shed', 3, 1, 'wire bench')
  c.progress.completedObjectives.push('cutter')
  expect(buildGuide(c, objectiveTrack(c).active)).toEqual(['focus', 'wire bench'])
})
