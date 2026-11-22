import { getPack, playerSources } from '@inherit/sim/rules'
import { continueLesson, freshSave, decodeSave, type PackSave } from '@inherit/sim/save'
import { declarations, runPack } from '@inherit/sandbox/pack'
import type { PackCommand, PackFrame } from './packProtocol'

let pack: ReturnType<typeof getPack>
let save: PackSave<unknown>
let edit = { file: 'main.ts', line: 1 }
async function act(command: PackCommand) {
  let moments: PackFrame['moments'] = [], logs: string[] = [], start: unknown, error = ''
  let statuses: PackFrame['checks'] | undefined
  try {
    if (command.kind === 'open') {
      pack = getPack(command.id)
      save = command.stored ? decodeSave(pack, command.stored) : freshSave(pack)
      if (!command.stored && command.lesson && pack.lessons.some(l => l.id === command.lesson)) {
        while (save.lessonId && save.lessonId !== command.lesson) {
          const lesson = pack.lessons.find(l => l.id === save.lessonId)!
          await runPack(pack, save, lesson.referenceSolution)
          if (save.phase !== 'solved') throw new Error('Unable to open this lesson.')
          do { continueLesson(pack, save) } while (save.lessonId === lesson.id)
        }
      }
    } else if (command.kind === 'run') {
      const result = await runPack(pack, save, command.files)
      ;({ moments, logs, start, checks: statuses } = result)
    } else continueLesson(pack, save)
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Could not open the pack.'
    if (command.kind === 'open') { self.postMessage({ loadError: error }); return }
  }
  const index = pack.lessons.findIndex(l => l.id === save.lessonId)
  const lesson = pack.lessons[index]
  if (command.kind !== 'run' && lesson) edit = lesson.starter(save.project.working).edit
  const names = pack.available(save.world, lesson?.id ?? '')
  self.postMessage({
    save, goal: lesson?.goal ?? '', edit, hints: lesson?.hints ?? [], labels: lesson?.checks.map(c => c.label) ?? [],
    checks: statuses ?? lesson?.checks.map(c => save.passed.includes(c.id) ? 'green' : 'red') ?? [],
    index, total: pack.lessons.length, solved: save.phase === 'solved' ? lesson?.solved : undefined,
    declarations: declarations(playerSources['./' + pack.manifest.id + '/player.ts'], names, pack.exposure),
    panels: pack.panels.filter(p => !p.reveal || save.released.includes(p.reveal)).map(p => ({
      id: p.id, label: p.label, placement: p.placement, rows: p.rows(save.world)
    })).filter(p => p.rows.length), logs, moments, start, error,
  } satisfies PackFrame)
}
let pending = Promise.resolve()
self.onmessage = ({data}: MessageEvent<PackCommand>) => { pending = pending.then(() => act(data)) }
