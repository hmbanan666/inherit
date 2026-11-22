import { readPlayerAPI, playerDeclarations } from '../../sim/src/framework/declarations'
import { playerError } from './player-error'
import type { Call, Colour, Files, Pack } from '../../sim/src/framework/pack'
import type { PackSave } from '../../sim/src/framework/save'
import { runOnce } from './index'

export function declarations(source: string, names: readonly string[], exposure: 'globals' | 'module') {
  return playerDeclarations(readPlayerAPI(source),names,exposure)
}
export interface Moment<W> { call: Call; world: W; checks: Colour[] }
export async function runPack<W,A extends object>(pack: Pack<W,A>, save: PackSave<W>, files: Files) {
  const lesson = pack.lessons.find(l => l.id === save.lessonId)
  if (!lesson) throw new Error('This pack is complete.')
  const world = structuredClone(pack.retry === 'entry' ? save.entryWorld : save.world)
  const start = structuredClone(world)
  const { api, finish } = pack.beginAttempt(world, 'run')
  const calls: Call[] = []
  const moments: Moment<W>[] = []
  const names = pack.available(world, lesson.id)
  let site: Pick<Call,'file'|'line'|'within'> = { file: 'main.ts', line: 1 }
  const host = { tick: 0, traceSite(next: typeof site) { site = next } }
  const evidence = { before: save.entryWorld, world, calls, files, console: [] as string[] }
  const checks = () => lesson.checks.map(check => check.evaluate(evidence))
  for (const name of names) {
    const method = api[name]
    if (typeof method !== 'function') throw new Error('Missing player function: ' + name)
    Object.defineProperty(host, name, { value(...args: unknown[]) {
      const result: unknown = Reflect.apply(method, api, args)
      const call = { ...site, name, args, result, ok: true }
      calls.push(call)
      moments.push({ call, world: structuredClone(world), checks: checks() })
      return result
    } })
  }
  save.project.working = files
  save.phase = 'working'
  save.passed = []
  try {
    evidence.console = await runOnce({ files, exposure: pack.exposure, operations: names, budget: 256 }, host)
  } catch (error) { throw new Error(playerError(error,names)) }
  finish()
  const statuses = checks()
  save.world = world
  save.passed = lesson.checks.filter((_, i) => statuses[i] === 'green').map(c => c.id)
  if (save.passed.length === lesson.checks.length) {
    save.phase = 'solved'
    save.pendingReveals = [...lesson.reveals ?? []].filter(id => !save.released.includes(id))
  }
  return { start, moments, logs: evidence.console, checks: statuses }
}
