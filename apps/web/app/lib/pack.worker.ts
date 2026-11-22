import { getPack, playerSources } from '@inherit/sim/rules'
import { continueLesson, freshSave, decodeSave, type PackSave } from '@inherit/sim/save'
import { declarations, createPackRunner } from '@inherit/sandbox/pack'
import type { PackCommand, PackFrame } from './packProtocol'

let pack: ReturnType<typeof getPack>
let save: PackSave<unknown>
let runner: ReturnType<typeof createPackRunner<any,any>>
async function act(command: PackCommand) {
  let moments: PackFrame['moments'] = [], logs: string[] = [], start: unknown, error = ''
  let statuses: PackFrame['checks'] | undefined
  try {
    if (command.kind === 'open') {
      pack = getPack(command.id)
      runner?.dispose()
      runner = createPackRunner(pack)
      save = command.stored ? decodeSave(pack, command.stored) : freshSave(pack)
      if (!command.stored && command.lesson && pack.lessons.some(l => l.id === command.lesson)) {
        while (save.lessonId && save.lessonId !== command.lesson) {
          const lesson = pack.lessons.find(l => l.id === save.lessonId)!
          await runner.play(save,lesson.referenceSolution,lesson.mode)
          for (let i=0; i<1200 && lesson.mode==='deploy' && save.phase!=='solved'; i++) await runner.play(save,lesson.referenceSolution,'tick')
          if (save.phase !== 'solved') throw new Error('Unable to open this lesson.')
          continueLesson(pack, save)
        }
      }
      if (save.clockActive && save.lessonId && save.project.deployed) await runner.play(save,save.project.deployed,'resume')
    } else if (command.kind === 'action') {
      const panel = pack.panels.find(p=>p.id===command.panel && (!p.reveal || save.released.includes(p.reveal)))
      const action = panel?.rows(save.world).find(r=>r.id===command.row)?.action
      if (action && Object.hasOwn(pack.actions ?? {},action.name)) pack.actions![action.name](save.world,action.args)
    } else if (command.kind === 'run' || command.kind === 'tick') {
      const mode = command.kind === 'tick' ? 'tick' : pack.lessons.find(l=>l.id===save.lessonId)!.mode
      const result = await runner.play(save,command.kind==='run' ? command.files : save.project.deployed!,mode)
      ;({ moments, logs, start, checks: statuses } = result)
    } else {continueLesson(pack, save); if (!save.lessonId) {save.clockActive=false;runner.dispose()}}
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Could not open the pack.'
    if (command.kind === 'open') { self.postMessage({ loadError: error }); return }
  }
  const index = pack.lessons.findIndex(l => l.id === save.lessonId)
  const lesson = pack.lessons[index]
  if (lesson && !save.edit) save.edit = lesson.starter(save.project.working).edit
  const edit = save.edit ?? { file: 'main.ts', line: 1 }
  const names = pack.available(save.world, lesson?.id ?? '')
  self.postMessage({
    save, noCalls:command.kind==='run' && lesson?.mode==='run' && !moments.length && !logs.length && !error, mode:lesson?.mode ?? 'run', clockMs:pack.clock?.intervalMs, goal: lesson?.goal ?? '', edit, hints: lesson?.hints ?? [], labels: lesson?.checks.map(c => c.label) ?? [],
    checks: statuses ?? lesson?.checks.map(c => save.passed.includes(c.id) ? 'green' : 'red') ?? [],
    finishIdeas: lesson ? undefined : pack.lessons.map(l => l.idea),
    index, total: pack.lessons.length, solved: save.phase === 'solved' ? lesson?.solved : undefined,
    declarations: declarations(playerSources['./' + pack.manifest.id + '/player.ts'], names, pack.exposure, pack.typeAliases?.(save.world)) + '\n' + Object.values(pack.guestModules ?? {}).map(m=>m.declarations).join('\n'),
    panels: pack.panels.filter(p => !p.reveal || save.released.includes(p.reveal)).map(p => ({
      id: p.id, label: p.label, placement: p.placement, rows: p.rows(save.world)
    })).filter(p => p.rows.length), logs, moments, start, error,
  } satisfies PackFrame)
}
let pending = Promise.resolve()
self.onmessage = ({data}: MessageEvent<PackCommand>) => { pending = pending.then(() => act(data)) }
