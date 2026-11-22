import { readPlayerAPI, playerDeclarations } from '../../sim/src/framework/declarations'
import { playerError } from './player-error'
import type { Call, Colour, Files, Pack } from '../../sim/src/framework/pack'
import type { PackSave } from '../../sim/src/framework/save'
import { createProgram, runOnce, type Program } from './index'

const parsed = new Map<string,ReturnType<typeof readPlayerAPI>>()
export function declarations(source: string, names: readonly string[], exposure: 'globals' | 'module', aliases:Record<string,string[]> = {}) {
  if (!parsed.has(source)) parsed.set(source,readPlayerAPI(source))
  return playerDeclarations(parsed.get(source)!,names,exposure,aliases)
}
export interface Moment<W> { call: Call; world: W; checks: Colour[] }

export function createPackRunner<W,A extends object>(pack: Pack<W,A>) {
  let program: Program | undefined
  let ticks = 0
  function dispose() { program?.dispose(); program = undefined }
  async function play(save: PackSave<W>, files: Files, mode: 'run'|'deploy'|'tick'|'resume' = 'run') {
    const lesson = pack.lessons.find(l => l.id === save.lessonId)
    if (!lesson) throw new Error('This pack is complete.')
    const world = structuredClone(mode === 'run' && pack.retry === 'entry' ? save.entryWorld : save.world)
    const start = structuredClone(world)
    const { api, finish } = pack.beginAttempt(world, mode==='deploy' || mode==='resume' ? 'setup' : mode)
    const calls: Call[] = []
    const moments: Moment<W>[] = []
    const names = pack.available(world, lesson.id)
    let site: Pick<Call,'file'|'line'|'within'> = { file: 'main.ts', line: 1 }
    const host = { tick: ++ticks, traceSite(next: typeof site) { site = next } }
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
    const options = {files, exposure:pack.exposure, operations:names, budget:256, guestModules:pack.guestModules}
    let candidate: Program | undefined
    try {
      if (mode === 'run') evidence.console = await runOnce(options,host)
      else if (mode === 'deploy' || mode === 'resume') {
        if (!pack.clock) throw new Error('This pack has no clock.')
        candidate = await createProgram(options,host)
        evidence.console = candidate.drainLogs()
      } else {
        if (!program) throw new Error('Deploy the project to start its clock.')
        program.onTick(host)
        evidence.console = program.drainLogs()
      }
      finish()
    } catch (error) {
      candidate?.dispose()
      if (mode==='tick') {dispose(); save.clockActive = false}
      if (mode!=='resume') {save.phase='working'; save.passed=[]}
      throw new Error(playerError(error,names))
    }
    if (candidate) { dispose(); program = candidate }
    const statuses = checks()
    if (mode !== 'resume') {
      if (mode !== 'tick') save.project.working = {...files}
      if (mode === 'deploy') {
        save.clockActive = true
        save.project.deployed = {...files}
        const id = save.project.nextRevision++
        save.project.history = [...save.project.history.slice(-31),{id,tick:ticks,name:'Deploy '+id,files:{...files}}]
      }
      save.world = world
      save.passed = lesson.checks.filter((check,i) => statuses[i]==='green' || mode==='tick' && save.passed.includes(check.id)).map(c=>c.id)
      save.phase = save.passed.length === lesson.checks.length ? 'solved' : 'working'
      if (save.phase === 'solved') save.pendingReveals = [...lesson.reveals ?? []].filter(id=>!save.released.includes(id))
    }
    return {start, moments, logs:evidence.console, checks:statuses}
  }
  return {play,dispose}
}
export async function runPack<W,A extends object>(pack: Pack<W,A>,save: PackSave<W>,files: Files) {
  const runner = createPackRunner(pack)
  try {return await runner.play(save,files)}
  finally {runner.dispose()}
}
