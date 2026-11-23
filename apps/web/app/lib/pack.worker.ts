import { lessonSteps } from '@inherit/sim/pack'
import { getPack, playerSources } from '@inherit/sim/rules'
import { freshSave, decodeSave, selectLesson, type PackSave } from '@inherit/sim/save'
import { courseMap } from '@inherit/sim/course'
import { migrateBeginner } from '@inherit/sim/migrate'
import { PlayerRunError, declarations, createPackRunner, playerSchema } from '@inherit/sandbox/pack'
import type { PackCommand, PackFrame } from './packProtocol'

let tickCount = 0
let pack: ReturnType<typeof getPack>
let save: PackSave<ReturnType<typeof pack.initialWorld>>
let runner: ReturnType<typeof createPackRunner<any, any>>
let beforeTick: typeof save | undefined
let logs: string[] = []
let failedInputs: Record<string, string[]> = {}
const current = () => pack.lessons.find(l => l.id === save.lessonId)

async function open(command: Extract<PackCommand, { kind: 'open' }>) {
  tickCount = 0
  logs = []
  pack = getPack(command.id)
  runner?.dispose()
  runner = createPackRunner(pack)
  if (command.stored && JSON.parse(command.stored).formatVersion === 1 && command.id === 'beginner') {
    save = await migrateBeginner(pack, command.stored, async (trial, files) => {
      await runner.play(trial, files)
      if (trial.phase !== 'solved') throw new Error('Could not rebuild the saved lesson.')
    })
    save = decodeSave(pack, JSON.stringify(save))
  } else {
    save = command.stored ? decodeSave(pack, command.stored) : freshSave(pack, 1, command.lesson)
  }
  if (pack.manifest.track === 'challenges' && save.project.deployed && save.phase !== 'solved') {
    save.world = structuredClone(save.entryWorld)
    save.clockActive = false
    save.project.deployed = null
    save.passed = []
    return 'Clock stopped. The starting parcels and your saved draft are ready.'
  }
  if (save.clockActive && save.project.deployed) await runner.play(save, save.project.deployed, 'resume')
}

async function act(command: PackCommand) {
  let moments: PackFrame['moments'] = [], start: unknown, error = ''
  let diagnostic: PackFrame['diagnostic']
  let previewWorld: unknown
  let notice: string | undefined
  const previousId = save?.lessonId
  let statuses: PackFrame['checks'] | undefined
  try {
    switch (command.kind) {
      case 'open':
        notice = await open(command)
        break
      case 'stopLoop':
        if (beforeTick && command.completedTicks === tickCount - 1) {
          save = beforeTick
          tickCount = command.completedTicks
        }
        beforeTick = undefined
        runner.dispose()
        save.clockActive = false
        break
      case 'action': {
        const panel = pack.panels.find(p => p.id === command.panel)
        const action = panel?.rows(save.world).find(r => r.id === command.row)?.action
        if (action && Object.hasOwn(pack.actions ?? {}, action.name)) pack.actions![action.name](save.world, action.args)
        break
      }
      case 'hint': {
        const lesson = current()!
        save.hints[lesson.id] = Math.min(lesson.hints?.length ?? 0, (save.hints[lesson.id] ?? 0) + 1)
        break
      }
      case 'predict': {
        const lesson = current()!
        if (lesson.prediction?.choices.includes(command.choice)) save.predictions[lesson.id] ??= command.choice
        break
      }
      case 'select':
        save.project.working = command.files
        save.project.activeFile = command.activeFile
        selectLesson(pack, save, command.id)
        runner.dispose()
        logs = []
        break
      case 'continue':
        if (command.id === save.lessonId && save.phase === 'solved') {
          await runner.advance(save)
          runner.dispose()
          logs = []
        }
        break
      case 'runOnce': {
        const trial = structuredClone(save)
        const diagnostic = createPackRunner(pack)
        try {
          await diagnostic.play(trial, command.files, 'deploy')
          for (let i = 0; i < tickCount; i++) await diagnostic.play(trial, command.files, 'tick')
          trial.world = structuredClone(save.world)
          const result = await diagnostic.play(trial, command.files, 'tick')
          moments = result.moments
          start = result.start
          logs = result.logs
          previewWorld = trial.world
        } finally { diagnostic.dispose() }
        break
      }
      case 'trySetup':
      case 'run':
      case 'tick': {
        const lesson = current()!
        if (save.phase === 'solved') break
        if (lesson.kind === 'predict' && !save.predictions[lesson.id]) throw new Error('Choose a prediction in Learn first.')
        const mode = command.kind === 'tick' ? 'tick' : command.kind === 'trySetup' ? 'run' : lesson.mode
        beforeTick = mode === 'tick' ? structuredClone(save) : undefined
        const result = await runner.play(save, 'files' in command ? command.files : save.project.deployed!, mode)
        moments = result.moments
        start = result.start
        statuses = result.checks
        failedInputs = result.failedInputs
        logs = mode === 'tick' ? [...logs, ...result.logs].slice(-64) : result.logs
        if (mode === 'tick') {
          tickCount++
          const limit = Math.max(0, ...lesson.variants?.map(v => v.maxTicks ?? 0) ?? [])
          if (pack.manifest.track === 'challenges' && tickCount === limit) save.clockActive = false
          if (!save.clockActive) runner.dispose()
        }
        if (mode === 'deploy') tickCount = 0
        break
      }
    }
  } catch (cause) {
    if (cause instanceof PlayerRunError) diagnostic = cause.diagnostic
    error = cause instanceof Error ? cause.message : 'Could not open the pack.'
    if (command.kind === 'open') { self.postMessage({ loadError: error }); return }
  }
  if (command.kind === 'open' || command.kind === 'select' || previousId !== save.lessonId ||
      (error && (command.kind === 'run' || command.kind === 'tick'))) failedInputs = {}
  if (previousId !== save.lessonId) tickCount = 0
  const lesson = current()
  const starter = lesson?.starter()
  if (lesson && !save.edit) save.edit = lesson.starter().edit
  const names = lesson ? pack.available(save.world, lesson.id) : []
  const source = playerSources['./' + pack.manifest.id + '/player.ts']
  const schema = playerSchema(source)
  const reference = schema.methods.filter(method => names.includes(method.name))
  if (lesson?.mode === 'deploy') reference.push(...schema.handlers)
  reference.push(...schema.consoleMethods)
  const inputs = lesson?.inputs?.(save.entryWorld) ?? {}
  const api = declarations(source, names, pack.exposure, pack.typeAliases?.(save.world))
  const map = courseMap(pack.manifest, pack.lessons, save.completed)
  self.postMessage({
    previewWorld, notice, tickCount, save, map, reference, inputs,
    types: Object.entries(schema.types).filter(([name]) => reference.some(m => m.signature.includes(name))).map(([,type]) => type),
    scene: lesson?.scene, theory: lesson?.theory, task: lesson?.task, prediction: lesson?.prediction,
    noCalls: command.kind === 'run' && lesson?.mode === 'run' && !moments.length && !logs.length && !error,
    mode: lesson?.mode ?? 'run', clockMs: pack.clock?.intervalMs, goal: lesson?.goal ?? '',
    hiddenInputs: lesson?.variants?.length ?? 0,
    focus: lesson?.focus ?? lesson?.visibleEffect.testId, effect: lesson?.visibleEffect.testId,
    starter, steps: lesson && starter ? lessonSteps(lesson, starter) : [],
    edit: save.edit ?? {file: 'main.ts', line: 1}, hints: lesson?.hints ?? [],
    labels: lesson?.checks.map(({ id, label, input }) => ({id, text: label, input: failedInputs[id]?.join(', ') ?? input})) ?? [],
    checks: statuses ?? lesson?.checks.map(c => save.passed.includes(c.id) ? 'green' : 'red') ?? [],
    finishIdeas: lesson ? undefined : pack.lessons.map(l => l.idea),
    index: map.findIndex(l => l.id === save.lessonId), total: map.length,
    solved: save.phase === 'solved' ? lesson?.solved : undefined,
    declarations: [api, ...Object.entries(inputs).map(([name, binding]) =>
      'declare const ' + name + ': ' + binding.type),
      ...Object.values(pack.guestModules ?? {}).map(m => m.declarations)].join('\n'),
    panels: pack.panels.map(p => ({
      id: p.id, label: p.label, placement: p.placement, rows: p.rows(save.world),
    })).filter(p => p.rows.length),
    logs, moments, start, error, diagnostic,
  } satisfies PackFrame)
}
let pending = Promise.resolve()
self.onmessage = ({data}: MessageEvent<PackCommand>) => { pending = pending.then(() => act(data)) }
