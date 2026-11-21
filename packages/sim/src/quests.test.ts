import { expect, test } from 'vitest'
import {
  advanceCampaign,
  connectBelt,
  createCampaign,
  placeMachine,
  questStatus,
  removeBelt,
  restartQuest,
  loadSave,
  serializeSave,
} from './index'

test('the five customer quests use the same growing shed, with a single count per request', () => {
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
    while (c.progress.activeQuest?.id === quest && world.tick < start + 500) {
      advanceCampaign(c, (ctx) => {
        if (ctx.space('mine')) ctx.dig('mine')
        ctx.route('splitter', ctx.tick % 2 ? 'furnace-a' : 'furnace-b')
        ctx.work('furnace-a')
        ctx.work('furnace-b')
        if ((quest === 'parts' || quest === 'gate') && ctx.space('coal-mine')) ctx.dig('coal-mine')
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
test.each(['balance', 'gate'])(
  '%s counts finished batches even with a blocked dock, spills and long pauses',
  (id) => {
    const c = createCampaign()
    const gate = id === 'gate'
    const machine = gate ? placeMachine(c, 'press', 'shed', 3, 3, 'press')! : c.world.machines[1]
    restartQuest(c, id)
    for (let t = 0; t < 150; t++) advanceCampaign(c, (ctx) => ctx.dig('mine'))
    c.world.extracted.coal = 30
    expect(questStatus(c)?.state).toBe('active')
    if (!gate) removeBelt(c, 'furnace-a', 'dock')
    const target = gate ? 5 : 10
    for (let batch = 1; batch <= target; batch++) {
      machine.queue.push({ kind: gate ? 'iron-ingot' : 'iron-ore' })
      if (gate) machine.queue.push({ kind: 'coal' })
      for (let t = 0; t < (gate ? 5 : 4); t++) advanceCampaign(c, (ctx) => ctx.work(machine.id))
      if (batch < target) expect(questStatus(c)?.current).toBe(batch)
      // Take the output off this test bench without shipping it.
      delete machine.output
    }
    expect(c.progress.completedQuests).toContain(id)
    expect(c.world.delivered).toEqual({})
  },
)

test('the gate card remembers only finished part batches across reloads', () => {
  let c = createCampaign()
  placeMachine(c, 'press', 'shed', 3, 1, 'press')
  connectBelt(c, 'press', 'dock')
  restartQuest(c, 'gate')
  function batch(recipe: 'plate' | 'part', ticks: number) {
    const press = c.world.machines.find((m) => m.id === 'press')!
    press.queue.push({ kind: 'iron-ingot' })
    if (recipe === 'part') press.queue.push({ kind: 'coal' })
    for (let i = 0; i < ticks; i++) advanceCampaign(c, (ctx) => ctx.work('press', recipe))
  }
  batch('plate', 2)
  expect(questStatus(c)?.current).toBe(0)
  batch('part', 5)
  expect(questStatus(c)?.current).toBe(1)
  c = loadSave(serializeSave(c))
  for (let i = 0; i < 250; i++) advanceCampaign(c, () => {})
  expect(questStatus(c)?.current).toBe(1)
  batch('part', 5)
  expect(questStatus(c)?.current).toBe(2)
})
