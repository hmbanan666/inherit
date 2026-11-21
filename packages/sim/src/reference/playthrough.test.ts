import { expect, test } from 'vitest'
import ts from 'typescript'
import { runInNewContext } from 'node:vm'
import { posix } from 'node:path'
import {
  createCampaign,
  deployGameProject,
  advanceGame,
  objectiveTrack,
  objectiveProgress,
  OBJECTIVES,
  serializeSave,
  loadSave,
  type Campaign,
  type GameProgram,
  type ProjectFiles,
} from '../index'
import { referenceFiles, referenceActions, applyReferenceAction } from './index'

// Only the fixtures authored in this directory enter this test evaluator.
// The application executes player projects in QuickJS.
function referenceController(files: ProjectFiles, campaign: Campaign): GameProgram {
  const memory = structuredClone(campaign.memory)
  type Handlers = Record<string, (...args: unknown[]) => void>
  const modules = new Map<string, Handlers>()
  function compile(path: string): Handlers {
    const cached = modules.get(path)
    if (cached) return cached
    const exports: Handlers = {}
    modules.set(path, exports)
    const text = ts.transpileModule(files[path], {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    runInNewContext(
      text,
      { exports, memory, require: (name: string) => compile(posix.join(posix.dirname(path), name) + '.ts') },
      { filename: path },
    )
    return exports
  }
  const handlers = compile('main.ts')
  return {
    deliverEvent(name, event, ctx) {
      handlers[name]?.(event, ctx)
    },
    onTick(ctx) {
      handlers.onTick(ctx)
    },
    exportMemory() {
      return structuredClone(memory)
    },
  }
}

test.each([1, 9721])('every ticket on one persistent factory, seed %s', (seed) => {
  const c = createCampaign(seed)
  const world = c.world
  let current = referenceController(c.project.deployed, c)
  advanceGame(c, current)
  expect(c.progress.completedObjectives).toEqual([])
  const reached: string[] = []
  const durations: Record<string, number> = {}
  for (const stage of OBJECTIVES) {
    const start = world.tick
    const { active, progress } = objectiveTrack(c)
    expect(active?.id).toBe(stage.id)
    expect(progress.target).toBeGreaterThan(0)
    expect(progress.current).toBeLessThanOrEqual(progress.target)
    expect(active?.progressUnit).toBeTruthy()
    if (active?.highlight.type === 'machine' && active.highlight.id) {
      const id = active.highlight.id
      expect(
        world.machines.some((m) => m.id === id),
        stage.id,
      ).toBe(true)
    }
    for (const action of referenceActions(stage.id))
      expect(applyReferenceAction(c, action), JSON.stringify(action)).toBeTruthy()
    const files = referenceFiles(stage.id)
    if (JSON.stringify(files) !== JSON.stringify(c.project.deployed)) {
      c.project.working = files
      deployGameProject(c)
      current = referenceController(files, c)
    }
    while (world.tick - start < 720 && reached.at(-1) !== stage.id) {
      const result = advanceGame(c, current)
      reached.push(...result.completed)
    }
    expect(
      reached.at(-1),
      JSON.stringify({
        stage: stage.id,
        track: objectiveTrack(c).progress,
        deliveries: world.delivered,
        signals: c.progress.signals,
      }),
    ).toBe(stage.id)
    expect(objectiveProgress(c, stage.id)).toEqual({
      state: 'complete',
      current: progress.target,
      target: progress.target,
    })
    durations[stage.id] = world.tick - start
    expect(c.world).toBe(world)
    expect(c.world.machines.find((m) => m.id === 'mine')?.builtAt).toBe(0)
    expect(c.project.history[0].id).toBe(0)
  }
  expect(reached).toEqual(OBJECTIVES.map((o) => o.id))
  expect(c.progress.completedQuests.sort()).toEqual(['balance', 'gate', 'loading', 'parts', 'shed'])
  expect(c.world.receipts.filter((r) => r.key === 'island-1')).toHaveLength(1)
  expect(c.world.receipts.find((r) => r.key === 'island-1')?.acknowledged).toBe(true)
  expect(c.world.machines.find((m) => m.id === 'remote')?.queue).toHaveLength(1)
  expect(c.world.delivered.motor).toBeGreaterThanOrEqual(3)
  if (process.env.INHERIT_TIMINGS)
    console.log({
      seed,
      ticks: world.tick,
      longest: Object.entries(durations).sort((a, b) => b[1] - a[1])[0],
    })
  expect(world.tick).toBeLessThan(4000)
  expect(Number(c.memory.coal)).toBeGreaterThan(0)
  expect(c.economy.orders.some((o) => o.status === 'accepted' || o.status === 'done')).toBe(false)
  expect(Number(c.memory.rocks)).toBeGreaterThan(100)
  expect(objectiveTrack(c).active).toBeUndefined()
  expect(loadSave(serializeSave(c))).toEqual(c)
  expect(advanceGame(c, current).completed).toEqual([])
})
