import { expect, test, vi } from 'vitest'
import { createProgram } from './index'

const ctx = { tick: 1 }

test('resolves relative files and directory indexes with shared cyclic module bindings', async () => {
  const digs: string[] = []
  const program = await createProgram({
    operations: ['dig'],
    files: {
      'main.ts': 'import { run } from "./machines"; export const mine = "iron"; export const onTick = run',
      'machines/index.ts': 'export { run } from "./dig.ts"',
      'machines/dig.ts': 'import { mine } from "../main"; import { dig } from "inherit"; export function run() { dig(mine) }',
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

test('validates source limits and operation budgets', async () => {
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

test('reports the source line inside an imported module', async () => {
  const program = await createProgram({ files: {
    'main.ts': 'export { run as onTick } from "./tools"',
    'tools.ts': 'export function run() {\n throw Error("stopped")\n}',
  } })
  try { expect(() => program.onTick(ctx)).toThrow(/tools.ts:2.*stopped/) }
  finally { program.dispose() }
})
