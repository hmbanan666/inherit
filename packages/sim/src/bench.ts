import { createCampaign } from './campaign'
import { placeMachine } from './construction'
import { primitiveTick, type ChapterFactory } from './primitives'
import type { ProjectFiles } from './model'
import type { Lesson, BenchCase } from './onboarding'
import type { RequestCheck } from './request-checks'

export function benchChecks(lesson: Lesson): RequestCheck[] {
  return lesson.cases.map((b, i) => ({
    id: lesson.id + '-' + i,
    state: 'todo',
    text: b.broken
      ? 'Restart ' + b.from + ' when broken'
      : b.to
        ? `${b.item} reaches ${b.to} from ${b.from}` + (lesson.reuse ? ' using your ' + lesson.reuse : '')
        : 'Return the rock taken from the mine',
  }))
}
function setup(beat: number, b: BenchCase) {
  const c = createCampaign()
  c.town.beat = beat
  for (const [i, kind, name] of [
    [0, 'press', 'press'],
    [1, 'furnace', 'copper'],
    [2, 'cutter', 'cutter'],
    [3, 'cutter', 'gears'],
    [4, 'assembler', 'assembler'],
  ] as const)
    if (b.from === name || b.to === name) placeMachine(c, kind, 'shed', i, 0, name)
  const source = c.world.machines.find((m) => m.id === b.from)!
  if (b.jam) {
    source.fault = 'jammed'
    source.queue.push({ kind: b.item })
  } else if (b.broken) source.fault = 'broken'
  else source.output = { kind: b.item }
  if (b.wants)
    c.economy.orders.push({
      id: 'bench',
      customer: 'wen',
      items: { [b.wants]: 1 },
      filled: {},
      status: 'accepted',
      pay: 1,
      reputation: 1,
      line: '',
    })
  return { c, source }
}
type Invoke = (api: ChapterFactory, args: string[], files: ProjectFiles) => Promise<unknown>

async function passes(beat: number, b: BenchCase, files: ProjectFiles, invoke: Invoke) {
  const { c, source } = setup(beat, b)
  const tick = primitiveTick(c)
  try {
    const result = await invoke(tick.api, b.args ?? [], files)
    if (b.broken) return !source.fault
    if (!b.to) return result === b.item && !source.output
    return c.world.hops!.some((h) => h.from === b.from && h.item === b.item && h.to === b.to)
  } finally {
    tick.finish()
  }
}

export async function runBench(lesson: Lesson, files: ProjectFiles, invoke: Invoke) {
  const checks = benchChecks(lesson)
  for (const [i, b] of lesson.cases.entries()) {
    if (!(await passes(lesson.beat, b, files, invoke))) continue
    // Refactoring keeps the old output. Check that the transfer now depends on the
    // shared helper by repeating the case with only that helper disconnected.
    if (lesson.reuse) {
      const disconnected = {
        ...files,
        ['verbs/' + lesson.reuse + '.ts']: 'export function ' + lesson.reuse + '() {}',
      }
      if (await passes(lesson.beat, b, disconnected, invoke)) continue
    }
    checks[i].state = 'done'
  }
  return checks
}
