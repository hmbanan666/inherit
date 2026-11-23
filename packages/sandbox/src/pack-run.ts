import { readPlayerAPI, playerDeclarations } from '../../sim/src/framework/declarations'
import { PlayerRunError } from './plain-error'
export { PlayerRunError, type PlainError } from './plain-error'
import type { Call, Check, Colour, Files, Pack } from '../../sim/src/framework/pack'
import { continueLesson, type PackSave } from '../../sim/src/framework/save'
import { createProgram, runOnce, type Program } from './index'

const parsed = new Map<string,ReturnType<typeof readPlayerAPI>>()
export function playerSchema(source: string) {
  if (!parsed.has(source)) parsed.set(source, readPlayerAPI(source))
  return parsed.get(source)!
}
export function declarations(source: string, names: readonly string[], exposure: 'globals' | 'module', aliases:Record<string,string[]> = {}) {
  return playerDeclarations(playerSchema(source),names,exposure,aliases)
}
export interface Moment<W> { call: Call; world: W; checks: Colour[] }

type RunMode = 'run' | 'deploy' | 'tick' | 'resume'

interface InputResult {
  input: string
  reason?: string
  colour: Colour
}

function combinedColour(results: InputResult[]): Colour {
  if (results.some(result => result.colour === 'red')) return 'red'
  if (results.some(result => result.colour === 'amber')) return 'amber'
  return 'green'
}

function fixtureRunner<W, A extends object>(pack: Pack<W, A>, variantResults: Map<string, InputResult[]>) {
  let program: Program | undefined
  let ticks = 0
  function dispose() { program?.dispose(); program = undefined }
  async function play(save: PackSave<W>, files: Files, mode: RunMode = 'run') {
    const lesson = pack.lessons.find(l => l.id === save.lessonId)
    if (!lesson) throw new Error('This pack is complete.')
    if (mode === lesson.mode) save.attempts[lesson.id] = (save.attempts[lesson.id] ?? 0) + 1
    const world = structuredClone((mode === 'run' || mode === 'deploy') && pack.retry === 'entry' ? save.entryWorld : save.world)
    const { api, finish } = pack.beginAttempt(world, mode==='deploy' || mode==='resume' ? 'setup' : mode)
    const start = structuredClone(world)
    const calls: Call[] = []
    const moments: Moment<W>[] = []
    const names = pack.available(world, lesson.id)
    let site: Pick<Call,'file'|'line'|'within'> = { file: 'main.ts', line: 1 }
    const host = { tick: ++ticks, traceSite(next: typeof site) { site = next } }
    const evidence = { before: save.entryWorld, world, calls, files, console: [] as string[] }
    function inputsFor(check: Check<W>, explain = false): InputResult[] {
      const alternates = variantResults.get(check.id) ?? []
      if (check.input && alternates.length) return alternates
      const colour = check.evaluate(evidence)
      const reason = explain && colour !== 'green' ? check.reason?.(evidence) : undefined
      return [{ input: check.input ?? 'Scene input', colour, reason }, ...alternates]
    }
    for (const name of names) {
      const method = api[name]
      if (typeof method !== 'function') throw new Error('Missing player function: ' + name)
      Object.defineProperty(host, name, { value(...args: unknown[]) {
        const result: unknown = Reflect.apply(method, api, args)
        const call = { ...site, name, args, result, ok: true }
        calls.push(call)
        moments.push({ call, world: structuredClone(world), checks: lesson.checks.map(check => combinedColour(inputsFor(check))) })
        return result
      } })
    }
    const bindings = lesson.inputs?.(save.entryWorld) ?? {}
    const inputs = Object.fromEntries(Object.entries(bindings).map(([name, binding]) => [name, binding.value]))
    const options = {files, inputs, exposure:pack.exposure, operations:names, budget:256, guestModules:pack.guestModules}
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
      finish(evidence.console)
    } catch (error) {
      candidate?.dispose()
      if (mode==='tick') {dispose(); save.clockActive = false}
      if (mode!=='resume') {save.phase='working'; save.passed=[]; delete save.reasons}
      throw new PlayerRunError(error, files, names, lesson.theory?.example)
    }
    if (candidate) { dispose(); program = candidate }
    const inputsByCheck = lesson.checks.map(check => inputsFor(check, true))
    const statuses = inputsByCheck.map(combinedColour)
    const reasons: Record<string, string> = {}
    const failedInputs: Record<string, string[]> = {}
    lesson.checks.forEach((check, index) => {
      const failed = inputsByCheck[index].filter(result => result.colour !== 'green')
      if (!failed.length) return
      reasons[check.id] = failed[0].reason ?? 'Still needed: ' + check.label + '.'
      if (variantResults.has(check.id)) failedInputs[check.id] = failed.map(result => result.input)
    })
    if (mode !== 'resume') {
      if (mode !== 'tick') save.project.working = {...files}
      if (mode === 'deploy') {
        save.clockActive = true
        save.project.deployed = {...files}
        const id = save.project.nextRevision++
        save.project.history = [...save.project.history.slice(-31),{id,tick:ticks,name:'Deploy '+id,files:{...files}}]
      }
      save.reasons = reasons
      save.world = world
      save.passed = lesson.checks.filter((check,i) => statuses[i]==='green' || mode==='tick' && save.passed.includes(check.id)).map(c=>c.id)
      save.phase = save.passed.length === lesson.checks.length ? 'solved' : 'working'
      if (save.phase === 'solved') save.clockActive = false
    }
    return {start, moments, logs:evidence.console, checks:statuses, reasons, failedInputs}
  }
  return {play,dispose}
}
/** Run alternate inputs on separate guests. Only the authored display fixture paints the scene. */
export function createPackRunner<W, A extends object>(pack: Pack<W, A>) {
  const results = new Map<string, InputResult[]>()
  const visible = fixtureRunner(pack, results)
  async function play(save: PackSave<W>, files: Files, mode: RunMode = 'run') {
    const lesson = pack.lessons.find(l => l.id === save.lessonId)
    if (mode !== 'tick') {
      results.clear()
      if (lesson) for (const variant of lesson.variants ?? []) {
        const checks = lesson.checks.filter(check => !check.input || check.input === variant.input)
        const trial: PackSave<W> = { ...save, world: structuredClone(save.entryWorld), attempts: {}, passed: [],
          project: { ...save.project }, phase: 'brief' }
        variant.enter(trial.world)
        trial.entryWorld = structuredClone(trial.world)
        const runner = fixtureRunner({ ...pack, lessons: [{ ...lesson, checks }] }, new Map())
        let statuses: Colour[]
        let reasons: Record<string, string> = {}
        try {
          let result = await runner.play(trial, files, lesson.mode)
          for (let tick = 0; lesson.mode === 'deploy' && trial.phase !== 'solved' && tick < (variant.maxTicks ?? 120); tick++)
            result = await runner.play(trial, files, 'tick')
          statuses = result.checks
          reasons = result.reasons
          statuses = checks.map((check, i) => trial.passed.includes(check.id) ? 'green' : statuses[i])
        } catch {
          // A player error on one input leaves its rows outstanding.
          statuses = checks.map(() => 'red')
        } finally { runner.dispose() }
        checks.forEach((check, index) => {
          const cases = results.get(check.id) ?? []
          cases.push({ input: variant.input, colour: statuses[index], reason: reasons[check.id] })
          results.set(check.id, cases)
        })
      }
    }
    return visible.play(save, files, mode)
  }
  async function advance(save: PackSave<W>) {
    if (!save.lessonId || save.phase !== 'solved') return
    // Imported completions can follow a new lesson. Apply their scene effects to the
    // player's actual world before opening the next missing lesson.
    if (pack.manifest.track === 'course' && !save.completed.includes(save.lessonId)) {
      const index = pack.lessons.findIndex(l => l.id === save.lessonId)
      let world = save.world
      for (const earned of pack.lessons.slice(index + 1)) {
        if (!save.completed.includes(earned.id)) break
        const trial = structuredClone(save)
        trial.lessonId = earned.id
        trial.world = pack.initialWorld(1)
        earned.enter?.(trial.world)
        pack.decorateEntry?.(world, trial.world)
        trial.entryWorld = structuredClone(trial.world)
        trial.phase = 'brief'
        const solved = () => trial.phase === 'solved'
        await play(trial, earned.referenceSolution, earned.mode)
        for (let tick = 0; earned.mode === 'deploy' && tick < 1200 && !solved(); tick++)
          await play(trial, earned.referenceSolution, 'tick')
        if (!solved()) throw new Error('Could not restore the earned scene for ' + earned.goal)
        world = trial.world
      }
      save.world = world
    }
    continueLesson(pack, save)
  }
  return { play, advance, dispose: visible.dispose }
}
export async function runPack<W,A extends object>(pack: Pack<W,A>,save: PackSave<W>,files: Files) {
  const runner = createPackRunner(pack)
  try {return await runner.play(save,files)}
  finally {runner.dispose()}
}
