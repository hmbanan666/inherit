import type { Files, Lesson, Pack, Starter } from './pack'

export interface SolveStats { firstTry: boolean; noHints: boolean }
export interface Revision { id: number; name: string; tick: number; files: Files }
interface Draft<W> extends Starter {
  activeFile: string
  entryWorld: W
}
export interface PackSave<W> {
  formatVersion: 2
  packId: string
  packVersion: number
  lessonId: string | null
  edit?: Starter['edit']
  phase: 'brief' | 'working' | 'solved'
  completed: string[]
  passed: string[]
  drafts: Record<string, Draft<W>>
  attempts: Record<string, number>
  hints: Record<string, number>
  predictions: Record<string, string>
  seenTheory: string[]
  awards: Record<string, SolveStats>
  firstTryStreak: number
  finishedWorld?: W
  world: W
  entryWorld: W
  project: { working: Files; deployed: Files | null; history: Revision[]; snapshots: Revision[]; nextRevision: number; activeFile: string }
  clockActive: boolean
}

export const packKey = (id: string) => 'inherit.pack.' + id

export function freshSave<W, A extends object>(pack: Pack<W, A>, seed = 1): PackSave<W> {
  const first = pack.lessons[0]
  const world = pack.initialWorld(seed)
  first.enter?.(world)
  const starter = first.starter({})
  return {
    formatVersion: 2, packVersion: pack.version, packId: pack.manifest.id,
    lessonId: first.id, edit: starter.edit, phase: 'brief', completed: [], passed: [],
    drafts: {}, hints: {}, attempts: {}, predictions: {}, seenTheory: [], awards: {}, firstTryStreak: 0,
    world, entryWorld: structuredClone(world), clockActive: false,
    project: { working: starter.files, deployed: null, activeFile: starter.edit.file, history: [], snapshots: [], nextRevision: 1 },
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function projectFiles(value: unknown): value is Files {
  return record(value) &&
    Object.entries(value).every(([name, source]) => name.endsWith('.ts') && typeof source === 'string')
}
function revisions(value: unknown): value is Revision[] {
  return Array.isArray(value) && value.every(r => r && Number.isInteger(r.id) && Number.isInteger(r.tick) &&
    typeof r.name === 'string' && projectFiles(r.files))
}
export function validProject(p: PackSave<unknown>['project']) {
  return p && projectFiles(p.working) && typeof p.working['main.ts'] === 'string' && Object.hasOwn(p.working, p.activeFile) &&
    (p.deployed === null || projectFiles(p.deployed)) && Number.isInteger(p.nextRevision) &&
    revisions(p.history) && revisions(p.snapshots)
}
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0
const validEdit = (edit: Starter['edit'], files: Files) =>
  edit && Object.hasOwn(files, edit.file) && Number.isInteger(edit.line) && edit.line >= 1

export function decodeSave<W, A extends object>(pack: Pack<W, A>, input: string): PackSave<W> {
  let s = JSON.parse(input)
  if (s?.formatVersion === 2 && s.packId === pack.manifest.id && Number.isInteger(s.packVersion) &&
    s.packVersion < pack.version && pack.upgrade) s = pack.upgrade(s.packVersion, s)
  const ids = new Set(pack.lessons.map(l => l.id))
  const entries = (v: unknown, valid: (value: unknown) => boolean) => record(v) &&
    Object.entries(v).every(([id, value]) => ids.has(id) && valid(value))
  if (!s || s.formatVersion !== 2 || s.packVersion !== pack.version || s.packId !== pack.manifest.id ||
    !(s.lessonId === null || ids.has(s.lessonId)) || !['brief','working','solved'].includes(s.phase) ||
    !Array.isArray(s.completed) || !s.completed.every((id: string) => ids.has(id)) ||
    new Set(s.completed).size !== s.completed.length || (s.lessonId === null && s.completed.length !== ids.size) ||
    !Array.isArray(s.passed) || !s.passed.every((id: unknown) => typeof id === 'string') ||
    !validProject(s.project) || typeof s.clockActive !== 'boolean' || !count(s.firstTryStreak) ||
    !Array.isArray(s.seenTheory) || !s.seenTheory.every((id: string) => ids.has(id)) ||
    !entries(s.awards, v => record(v) && typeof v.firstTry === 'boolean' && typeof v.noHints === 'boolean') ||
    !entries(s.hints, count) || !entries(s.attempts, count) || !entries(s.predictions, v => typeof v === 'string') ||
    !entries(s.drafts, v => record(v) && projectFiles(v.files) && typeof v.activeFile === 'string' &&
      Object.hasOwn(v.files, v.activeFile) && validEdit(v.edit as Starter['edit'], v.files)))
    throw new Error('This save could not be opened. Your original is still here.')
  if (s.edit && !validEdit(s.edit, s.project.working)) delete s.edit
  s.world = pack.decodeWorld(s.world)
  s.entryWorld = pack.decodeWorld(s.entryWorld)
  if ('finishedWorld' in s) s.finishedWorld = pack.decodeWorld(s.finishedWorld)
  for (const draft of Object.values(s.drafts) as Draft<W>[]) draft.entryWorld = pack.decodeWorld(draft.entryWorld)
  return s
}

function keepDraft<W>(save: PackSave<W>) {
  if (!save.lessonId || !save.edit) return
  save.drafts[save.lessonId] = {
    files: save.project.working, activeFile: save.project.activeFile,
    edit: save.edit, entryWorld: save.entryWorld,
  }
}

function enter<W, A extends object>(pack: Pack<W, A>, save: PackSave<W>, lesson?: Lesson<W>, restoreEntry = true) {
  save.lessonId = lesson?.id ?? null
  save.clockActive = false
  save.project.deployed = null
  save.passed = []
  save.phase = 'brief'
  if (!lesson) {
    delete save.edit
    save.finishedWorld ??= structuredClone(save.world)
    save.world = structuredClone(save.finishedWorld)
    return
  }
  const draft = save.drafts[lesson.id]
  if (draft && restoreEntry) save.world = structuredClone(draft.entryWorld)
  else {
    if (pack.manifest.track === 'challenges') save.world = pack.initialWorld(1)
    lesson.enter?.(save.world)
  }
  const starter = draft ?? lesson.starter(save.project.working)
  save.entryWorld = structuredClone(save.world)
  save.edit = starter.edit
  save.project.working = { ...starter.files }
  save.project.activeFile = draft?.activeFile ?? starter.edit.file
}

export function selectLesson<W, A extends object>(pack: Pack<W, A>, save: PackSave<W>, id: string) {
  const lesson = pack.lessons.find(l => l.id === id)
  const frontier = pack.lessons.find(l => !save.completed.includes(l.id))
  if (!lesson || (pack.manifest.track === 'course' && lesson !== frontier && !save.completed.includes(id)))
    throw new Error('This lesson is locked.')
  if (save.lessonId === id) return
  keepDraft(save)
  enter(pack, save, lesson)
}

export function continueLesson<W, A extends object>(pack: Pack<W, A>, save: PackSave<W>) {
  const id = save.lessonId
  if (save.phase !== 'solved' || !id) return
  keepDraft(save)
  const review = save.completed.includes(id)
  if (!review) {
    save.completed.push(id)
    save.awards[id] = { firstTry: save.attempts[id] === 1, noHints: !save.hints[id] }
    save.firstTryStreak = save.awards[id].firstTry ? save.firstTryStreak + 1 : 0
  }
  const index = pack.lessons.findIndex(l => l.id === id)
  const ordered = pack.manifest.track === 'challenges'
    ? [...pack.lessons.slice(index + 1), ...pack.lessons.slice(0, index)]
    : pack.lessons
  const next = ordered.find(l => !save.completed.includes(l.id))
  enter(pack, save, next, review || pack.manifest.track === 'challenges')
}
