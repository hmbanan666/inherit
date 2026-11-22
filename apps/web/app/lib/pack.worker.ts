import { getPack, playerSources } from '@inherit/sim/rules'
import { continueLesson, freshSave, decodeSave, selectLesson, type PackSave } from '@inherit/sim/save'
import { courseMap } from '@inherit/sim/course'
import { migrateBeginner } from '@inherit/sim/migrate'
import { declarations, createPackRunner, playerSchema } from '@inherit/sandbox/pack'
import type { PackCommand, PackFrame } from './packProtocol'

let tickCount = 0
let pack: ReturnType<typeof getPack>
let save: PackSave<ReturnType<typeof pack.initialWorld>>
let runner: ReturnType<typeof createPackRunner<any, any>>
let logs: string[] = []
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
    save = command.stored ? decodeSave(pack, command.stored) : freshSave(pack)
  }
  if (command.lesson !== undefined) {
    if (!pack.lessons.some(l => l.id === command.lesson)) throw new Error('Unknown lesson.')
    if (pack.manifest.track === 'challenges') selectLesson(pack, save, command.lesson)
    else while (save.lessonId !== command.lesson) {
      const lesson = current()!
      await runner.play(save, lesson.referenceSolution, lesson.mode)
      for (let i = 0; i < 1200 && lesson.mode === 'deploy' && save.phase !== 'solved'; i++)
        await runner.play(save, lesson.referenceSolution, 'tick')
      if (save.phase !== 'solved') throw new Error('Unable to open this lesson.')
      continueLesson(pack, save)
    }
  }
  if (save.clockActive && save.project.deployed) await runner.play(save, save.project.deployed, 'resume')
}

async function act(command: PackCommand) {
  let moments: PackFrame['moments'] = [], start: unknown, error = ''
  let statuses: PackFrame['checks'] | undefined
  try {
    switch (command.kind) {
      case 'open':
        await open(command)
        break
      case 'stopLoop':
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
          continueLesson(pack, save)
          runner.dispose()
          logs = []
        }
        break
      case 'run':
      case 'tick': {
        const lesson = current()!
        if (save.phase === 'solved') break
        if (lesson.kind === 'predict' && !save.predictions[lesson.id]) throw new Error('Choose a prediction in Learn first.')
        const mode = command.kind === 'tick' ? 'tick' : lesson.mode
        const result = await runner.play(save, command.kind === 'run' ? command.files : save.project.deployed!, mode)
        moments = result.moments
        start = result.start
        statuses = result.checks
        logs = mode === 'tick' ? [...logs, ...result.logs].slice(-64) : result.logs
        if (mode === 'tick') tickCount++
        if (mode === 'deploy') tickCount = 0
        break
      }
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Could not open the pack.'
    if (command.kind === 'open') { self.postMessage({ loadError: error }); return }
  }
  const lesson = current()
  if (lesson && !save.edit) save.edit = lesson.starter(save.project.working).edit
  const names = lesson ? pack.available(save.world, lesson.id) : []
  const source = playerSources['./' + pack.manifest.id + '/player.ts']
  const schema = playerSchema(source)
  const reference = schema.methods.filter(method => names.includes(method.name))
  const inputs = lesson?.inputs?.(save.entryWorld) ?? {}
  const api = declarations(source, names, pack.exposure, pack.typeAliases?.(save.world))
  const map = courseMap(pack.manifest, pack.lessons, save.completed)
  self.postMessage({
    tickCount, save, map, reference, inputs,
    types: Object.entries(schema.types).filter(([name]) => reference.some(m => m.signature.includes(name))).map(([,type]) => type),
    scene: lesson?.scene, theory: lesson?.theory, task: lesson?.task, prediction: lesson?.prediction,
    noCalls: command.kind === 'run' && lesson?.mode === 'run' && !moments.length && !logs.length && !error,
    mode: lesson?.mode ?? 'run', clockMs: pack.clock?.intervalMs, goal: lesson?.goal ?? '',
    edit: save.edit ?? {file: 'main.ts', line: 1}, hints: lesson?.hints ?? [],
    labels: lesson?.checks.map(({ id, label, input }) => ({id, text: label, input})) ?? [],
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
    logs, moments, start, error,
  } satisfies PackFrame)
}
let pending = Promise.resolve()
self.onmessage = ({data}: MessageEvent<PackCommand>) => { pending = pending.then(() => act(data)) }
