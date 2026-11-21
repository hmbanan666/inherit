import { expect, test, vi } from 'vitest'
import { createLegacyProgram as createProgram, runProjectTests } from './index'
import type { Factory } from '@inherit/sim'

const ctx: Factory = {
  tick: 1,
  dig: () => true,
  work: () => true,
  route: () => true,
  space: () => true,
  stock: () => 2,
}

test('resolves relative files and directory indexes with shared cyclic module bindings', async () => {
  const digs: string[] = []
  const program = await createProgram({
    files: {
      'main.ts': 'import { run } from "./machines"; export const mine = "iron"; export const onTick = run',
      'machines/index.ts': 'export { run } from "./dig.ts"',
      'machines/dig.ts': 'import { mine } from "../main"; export function run(ctx) { ctx.dig(mine) }',
    },
  })
  try {
    program.onTick({
      ...ctx,
      dig: (id: string) => {
        digs.push(id)
        return true
      },
    })
    expect(digs).toEqual(['iron'])
  } finally {
    program.dispose()
  }
})

test.each([
  [{ 'main.ts': 'import "node:fs"' }, /relative/],
  [{ 'main.ts': 'import "../shared"' }, /escapes/],
  [{ 'main.ts': '// One\n\nimport "./absent"' }, /main\.ts:3 · Cannot resolve/],
  [{ '../main.ts': '' }, /path/],
] as const)('rejects invalid module paths', async (files, message) => {
  await expect(createProgram({ files: { ...files } })).rejects.toThrow(message)
})

test('snapshots persistent memory for a hot deploy without sharing host objects', async () => {
  const files = { 'main.ts': 'export function onTick(ctx) { memory.count++; memory.last = ctx.tick }' }
  const initial = { count: 0 }
  const first = await createProgram({ files, memory: initial })
  try {
    first.onTick(ctx)
    expect(initial).toEqual({ count: 0 })
    const snapshot = first.exportMemory()
    const second = await createProgram({ files, memory: snapshot })
    try {
      second.onTick({ ...ctx, tick: 2 })
      expect(second.exportMemory()).toEqual({ count: 2, last: 2 })
      expect(snapshot).toEqual({ count: 1, last: 1 })
    } finally {
      second.dispose()
    }
  } finally {
    first.dispose()
  }
})

test('shares a tick budget with researched events and exposes detached campaign values', async () => {
  const calls: string[][] = []
  const view = { kind: 'sorter', queue: ['ore'] }
  const event = { type: 'itemArrived', machineId: 'sorter-1' }
  const factory = {
    ...ctx,
    inspect: () => view,
    dispatch(...args: string[]) {
      calls.push(args)
      return true
    },
    privateMethod() {
      throw Error('host private method')
    },
  }
  const files = {
    'main.ts': `
    export function onTick(ctx) {
      ctx.inspect("sorter-1").queue.pop();
      memory.private = typeof ctx.privateMethod;
    }
    export function onItemArrived(event, ctx) {
      ctx.dispatch("truck", event.machineId, "dock", "delivery-1");
      event.machineId = "changed";
    }
    export function onMachineIdle() { throw Error("locked") }
  `,
  }
  const program = await createProgram({ files, unlockedEvents: ['onItemArrived'], budget: 16 })
  const legacy = await createProgram({ files })
  try {
    legacy.deliverEvent('onItemArrived', event, factory)
    program.onTick(factory)
    program.deliverEvent('onMachineIdle', {}, factory)
    program.deliverEvent('onItemArrived', event, factory)
    expect(calls).toEqual([['truck', 'sorter-1', 'dock', 'delivery-1']])
    expect(program.stats.calls).toBe(2)
    expect(program.exportMemory()).toEqual({ private: 'undefined' })
    expect(event.machineId).toBe('sorter-1')
    expect(view.queue).toEqual(['ore'])
  } finally {
    legacy.dispose()
    program.dispose()
  }
})

test('meters repeatable factory calls and interrupt polls across ticks', async () => {
  async function replay() {
    const program = await createProgram({
      files: { 'main.ts': 'export function onTick(ctx) { for (let i=0; i<12000; i++) {} ctx.dig("iron") }' },
      budget: 32,
    })
    try {
      return [1, 2, 3].map((tick) => {
        program.onTick({ ...ctx, tick })
        return program.stats
      })
    } finally {
      program.dispose()
    }
  }
  const frames = await replay()
  expect(frames).toEqual(await replay())
  for (const frame of frames) {
    expect(frame.calls).toBe(1)
    expect(frame.interrupts).toBeGreaterThan(0)
    expect(frame.used).toBe(frame.calls + frame.interrupts)
  }
})

test('a caught over-budget call still stops the tick, and research raises the allowance', async () => {
  const files = {
    'main.ts': `
    export function onTick(ctx) { ctx.dig("mine"); ctx.work("furnace") }
    export function onMachineIdle(event, ctx) { try { ctx.work("furnace") } catch {} }
  `,
  }
  for (const budget of [2, 12]) {
    const program = await createProgram({ files, budget, unlockedEvents: ['onMachineIdle'] })
    try {
      program.onTick(ctx)
      const event = () => program.deliverEvent('onMachineIdle', {}, ctx)
      if (budget === 2) expect(event).toThrow(/budget/)
      else expect(event).not.toThrow()
      program.onTick({ ...ctx, tick: 2 })
      expect(program.stats.calls).toBe(2)
    } finally {
      program.dispose()
    }
  }
})

test('caps log history and line length without evaluating object properties', async () => {
  const program = await createProgram(`export function onTick() {
    for (let i = 0; i < 80; i++) console.log(i);
    console.log({ get value() { throw Error("read") }, toString() { throw Error("coerced") } });
    console.log("a".repeat(1000));
  }`)
  try {
    program.onTick(ctx)
    const lines = program.drainLogs()
    expect(lines).toHaveLength(64)
    expect(lines.slice(-2)).toEqual(['[object]', 'a'.repeat(512)])
    expect(program.drainLogs()).toEqual([])
  } finally {
    program.dispose()
  }
})

test.each([
  ['memory.loop = memory', /cyclic/i],
  ['memory.value = { get count() { throw Error("read") } }', /data properties/i],
  ['memory.value = "x".repeat(64001)', /large/i],
  ['memory.value = new Array(9000)', /complexity/i],
  ['memory.value = new Map()', /JSON/i],
])('rejects non-saveable memory with a bounded error', async (body, message) => {
  const program = await createProgram('export function onTick() { ' + body + ' }')
  try {
    program.onTick(ctx)
    expect(() => program.exportMemory()).toThrow(message)
  } finally {
    program.dispose()
  }
})

test('interrupts initialization and memory inspection inside QuickJS', async () => {
  await expect(createProgram('while (true) {}')).rejects.toThrow(/interrupted/)
  const program = await createProgram(
    'export function onTick() { memory.child = new Proxy({}, { ownKeys() { while (true) {} } }) }',
  )
  try {
    program.onTick(ctx)
    expect(() => program.exportMemory()).toThrow(/interrupted/)
  } finally {
    program.dispose()
  }
})

test('runs optional test cases in a fresh mock factory and reports per-case results', async () => {
  const files = {
    'main.ts': 'export function onTick(ctx) { memory.count++; ctx.dig("mine") }',
    'tests.ts': `
      import { onTick } from "./main";
      test("counts", ctx => { onTick(ctx); equal(memory.count, 2); assert(!ctx.work("furnace")) });
      test("broken", () => { equal(1, 2, "expected two") });
      test("too busy", () => { while (true) {} });
      test("still runs", () => { assert(true) });
    `,
  }
  const memory = { count: 1 }
  const live = await createProgram({ files, memory })
  try {
    expect(await runProjectTests({ files, memory })).toEqual([
      { name: 'counts', passed: true },
      { name: 'broken', passed: false, error: expect.stringMatching(/tests.ts:4.*expected two/) },
      { name: 'too busy', passed: false, error: expect.stringMatching(/interrupted/) },
      { name: 'still runs', passed: true },
    ])
    expect(live.exportMemory()).toEqual(memory)
    expect(live.stats.calls).toBe(0)
  } finally {
    live.dispose()
  }
})

test('reports test syntax errors independently of deploy and maps imported runtime failures', async () => {
  const files = {
    'main.ts': 'export { run as onTick } from "./parts/press"',
    'parts/press.ts': 'type Item = string\nexport function run() {\n throw Error("jammed")\n}',
    'tests.ts': 'export const broken = ;',
  }
  const program = await createProgram({ files })
  try {
    expect(() => program.onTick(ctx)).toThrow(/parts\/press.ts:3.*jammed/)
    expect(await runProjectTests({ files })).toEqual([
      { name: 'tests.ts', passed: false, error: expect.stringMatching(/tests.ts:1/) },
    ])
  } finally {
    program.dispose()
  }
})

test('validates source limits and bounded research budgets', async () => {
  const files = Object.fromEntries(Array.from({ length: 33 }, (_, i) => [i + '.ts', '']))
  await expect(createProgram({ files })).rejects.toThrow(/32 files/)
  await expect(createProgram(' '.repeat(64_001))).rejects.toThrow(/64,000/)
  await expect(
    createProgram({
      files: Object.fromEntries(Array.from({ length: 5 }, (_, i) => [i + '.ts', ' '.repeat(64_000)])),
    }),
  ).rejects.toThrow(/256,000/)
  await expect(createProgram({ files: { 'main.ts': '' }, budget: Infinity })).rejects.toThrow(/budget/i)
})

test('keeps the elapsed-time guard separate from the operation meter', async () => {
  const program = await createProgram({
    budget: 4096,
    files: {
      'main.ts': 'export function onTick() { for (let i = 0; i < 100000; i++) {} }',
    },
  })
  const clock = vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(26)
  try {
    expect(() => program.onTick(ctx)).toThrow(/25 ms/)
    expect(program.stats.used).toBeLessThan(program.stats.budget)
  } finally {
    clock.mockRestore()
    program.dispose()
  }
})

test('provides synchronous player code without host, network or wall-clock globals', async () => {
  const program = await createProgram(`export function onTick() {
    console.log(typeof process, typeof fetch, typeof require, typeof Date, typeof Math.random)
  }`)
  try {
    program.onTick(ctx)
    expect(program.drainLogs()).toEqual(['undefined undefined undefined undefined undefined'])
  } finally {
    program.dispose()
  }
  expect(await runProjectTests({ files: { 'tests.ts': 'test("async", async () => 42)' } })).toEqual([
    { name: 'async', passed: false, error: expect.stringMatching(/synchronous/) },
  ])
})

test('reports a guest-thrown object without reading its getters', async () => {
  const program = await createProgram(
    'export function onTick() { throw { get message() { throw Error("read") } } }',
  )
  try {
    expect(() => program.onTick(ctx)).toThrow(/Controller stopped/)
  } finally {
    program.dispose()
  }
})
