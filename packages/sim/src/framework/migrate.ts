import type { Pack, Files } from './pack'
import { freshSave, validProject, type PackSave } from './save'
function validateVillage(world: Record<string, unknown>) {
  const valid = world && ['gate', 'house'].includes(String(world.bed)) &&
    ['bubble', 'sign', 'flag'].every(k => typeof world[k] === 'string') &&
    ['gateFlowers', 'houseFlowers', 'basket', 'bell', 'ribbons'].every(k => Number.isSafeInteger(world[k]) && Number(world[k]) >= 0) &&
    ['shutters', 'raining', 'canopy', 'picnic', 'banner'].every(k => typeof world[k] === 'boolean') &&
    Array.isArray(world.lamps) && world.lamps.every(n => Number.isInteger(n) && n >= 1 && n <= 5) &&
    [world.neighbours, world.stalls].every(rows => Array.isArray(rows) && rows.every(name => typeof name === 'string'))
  if (!valid) throw new Error('The archived village is incomplete.')
}

const oldLessons = [
  'hello', 'flowers', 'house-sign', 'flag', 'apple-basket', 'morning', 'flower-row',
  'ribbons', 'weather', 'picnic', 'path-lamps', 'neighbours', 'village-fair',
]
const survivors = new Set(oldLessons.filter(id => !['ribbons', 'picnic', 'village-fair'].includes(id)))

/** Rebuild entries using the current curriculum. Source ordinals never grant credit. */
export async function migrateBeginner<W, A extends object>(
  pack: Pack<W, A>,
  raw: string,
  solve: (save: PackSave<W>, files: Files) => Promise<void>,
) {
  const old = JSON.parse(raw)
  if (old.formatVersion !== 1 || old.packVersion !== 1 || old.packId !== 'beginner' ||
      !validProject(old.project) || typeof old.clockActive !== 'boolean' ||
      !(old.lessonId === null || oldLessons.includes(old.lessonId)) ||
      !['brief', 'working', 'solved'].includes(old.phase) ||
      ![old.completed, old.passed, old.released, old.pendingReveals, old.seenSections].every(ids =>
        Array.isArray(ids) && ids.every(id => typeof id === 'string')) ||
      !old.completed.every((id: string) => oldLessons.includes(id)))
    throw new Error('The v5 Beginner save could not be opened.')
  validateVillage(old.world)
  validateVillage(old.entryWorld)
  const save = freshSave(pack)
  save.completed = pack.lessons.filter(l => survivors.has(l.id) && old.completed.includes(l.id)).map(l => l.id)
  const frontier = pack.lessons.find(l => !save.completed.includes(l.id))
  const trial = freshSave(pack)
  const last = Math.max(0, ...pack.lessons.map((l, i) =>
    l === frontier || save.completed.includes(l.id) || l.id === old.lessonId ? i : 0))
  for (const [index, lesson] of pack.lessons.slice(0, last + 1).entries()) {
    if (index) {
      const next = pack.initialWorld(1)
      lesson.enter?.(next)
      pack.decorateEntry?.(trial.world, next)
      trial.world = next
    }
    trial.lessonId = lesson.id
    trial.entryWorld = structuredClone(trial.world)
    trial.phase = 'brief'
    const starter = lesson.starter()
    const draft = lesson.id === old.lessonId && Object.hasOwn(old.project.working, starter.edit.file)
      ? { files: old.project.working as Files, activeFile: old.project.activeFile as string }
      : { files: starter.files, activeFile: starter.edit.file }
    if (lesson === frontier || save.completed.includes(lesson.id) || lesson.id === old.lessonId)
      save.drafts[lesson.id] = { ...draft, edit: starter.edit, entryWorld: trial.entryWorld }
    if (index < last || !frontier) await solve(trial, lesson.referenceSolution)
  }
  save.lessonId = frontier?.id ?? null
  if (frontier) {
    const draft = save.drafts[frontier.id]
    save.world = structuredClone(draft.entryWorld)
    save.entryWorld = draft.entryWorld
    save.project.working = draft.files
    save.project.activeFile = draft.activeFile
    save.edit = draft.edit
  } else {
    save.world = trial.world
    save.finishedWorld = trial.world
    delete save.edit
  }
  return save
}
