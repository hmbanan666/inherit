import { expect, test } from 'vitest'
import {
  advanceCampaign,
  connectBelt,
  createCampaign,
  placeMachine,
  questStatus,
  removeBelt,
  restartQuest,
} from './index'

test('the five customer quests use the same growing shed, with relative deadlines and allowances', () => {
  const c = createCampaign()
  const { world } = c
  // The inherited program fills the first furnace and leaves shipment to the player.
  for (let i = 0; i < 40; i++)
    advanceCampaign(c, (ctx) => {
      if (ctx.space('mine')) ctx.dig('mine')
    })
  expect(questStatus(c)?.state).toBe('active')
  const run = (quest: string) => {
    const start = world.tick
    const coal = world.extracted.coal ?? 0
    while (c.progress.activeQuest?.id === quest && world.tick < start + 500) {
      advanceCampaign(c, (ctx) => {
        if (ctx.space('mine')) ctx.dig('mine')
        ctx.route('splitter', ctx.stock('furnace-a') <= ctx.stock('furnace-b') ? 'furnace-a' : 'furnace-b')
        ctx.work('furnace-a')
        ctx.work('furnace-b')
        if (
          (quest === 'parts' || quest === 'gate') &&
          ctx.space('coal-mine') &&
          (quest !== 'gate' || (world.extracted.coal ?? 0) - coal < 12)
        )
          ctx.dig('coal-mine')
        ctx.work('press', 'part')
      })
    }
    expect(c.progress.completedQuests).toContain(quest)
  }
  run('shed')
  removeBelt(c, 'mine', 'furnace-a')
  placeMachine(c, 'splitter', 'shed', 2, 2, 'splitter')
  placeMachine(c, 'furnace', 'shed', 4, 3, 'furnace-b')
  connectBelt(c, 'mine', 'splitter')
  connectBelt(c, 'splitter', 'furnace-a')
  connectBelt(c, 'splitter', 'furnace-b')
  connectBelt(c, 'furnace-b', 'dock')
  run('balance')
  placeMachine(c, 'press', 'shed', 6, 2, 'press')
  placeMachine(c, 'miner', 'shed', 1, 4, 'coal-mine')
  function rewire(parts: boolean) {
    for (const id of ['furnace-a', 'furnace-b']) {
      removeBelt(c, id, parts ? 'dock' : 'press')
      connectBelt(c, id, parts ? 'press' : 'dock')
    }
  }
  rewire(true)
  connectBelt(c, 'coal-mine', 'press')
  connectBelt(c, 'press', 'dock')
  run('parts')
  rewire(false)
  restartQuest(c)
  run('loading')
  rewire(true)
  restartQuest(c)
  run('gate')
  expect(c.world).toBe(world)
  expect(c.progress.activeQuest).toBeUndefined()
  expect(world.machines).toHaveLength(7)
})
test('a missed deadline can be retried on the same tick without replacing memory or equipment', () => {
  const c = createCampaign()
  c.progress.completedQuests = ['shed', 'balance', 'parts', 'loading']
  c.memory = { coal: 4 }
  restartQuest(c)
  for (let i = 0; i < 128; i++) advanceCampaign(c, () => {})
  expect(questStatus(c)?.state).toBe('failed')
  expect(restartQuest(c)).toBe(true)
  expect(questStatus(c)).toMatchObject({ state: 'active', elapsed: 0 })
  expect(c.world.tick).toBe(128)
  expect(c.world.machines).toHaveLength(3)
  expect(c.memory).toEqual({ coal: 4 })
})
