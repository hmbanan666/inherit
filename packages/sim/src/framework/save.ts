import type { Files, Pack, Starter } from './pack'

export interface Revision { id: number; name: string; tick: number; files: Files }
export interface PackSave<W> {
  formatVersion: 1
  packId: string
  packVersion: number
  lessonId: string | null
  edit?: Starter['edit']
  phase: 'brief' | 'working' | 'solved'
  completed: string[]
  passed: string[]
  pendingReveals: string[]
  released: string[]
  seenSections: string[]
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
  return { formatVersion: 1, packVersion: pack.version, packId: pack.manifest.id, lessonId: first.id, edit: starter.edit,
    phase: 'brief', completed: [], passed: [], pendingReveals: [], released: [], seenSections: [], world,
    entryWorld: structuredClone(world), clockActive: false,
    project: { working: starter.files, deployed: null, activeFile: starter.edit.file, history: [], snapshots: [], nextRevision: 1 } }
}
function projectFiles(value:unknown):value is Files {
  return !!value && typeof value==='object' && !Array.isArray(value) &&
    Object.entries(value).every(([name,source])=>name.endsWith('.ts') && typeof source==='string')
}
function revisions(value:unknown):value is Revision[] {
  return Array.isArray(value) && value.every(r=>r && Number.isInteger(r.id) && Number.isInteger(r.tick) &&
    typeof r.name==='string' && projectFiles(r.files))
}
export function decodeSave<W,A extends object>(pack: Pack<W,A>, input: string): PackSave<W> {
  let s = JSON.parse(input)
  if (s?.formatVersion === 1 && s.packId === pack.manifest.id && Number.isInteger(s.packVersion) &&
    s.packVersion < pack.version && pack.upgrade) s = pack.upgrade(s.packVersion,s)
  const ids = pack.lessons.map(l => l.id)
  if (!s || s.formatVersion !== 1 || s.packVersion !== pack.version || s.packId !== pack.manifest.id ||
    !(s.lessonId === null || ids.includes(s.lessonId)) || !['brief','working','solved'].includes(s.phase) ||
    ![s.completed,s.passed,s.pendingReveals,s.released,s.seenSections].every(a => Array.isArray(a) && a.every(v => typeof v === 'string')) ||
    !s.completed.every((id: string) => ids.includes(id)) ||
    !projectFiles(s.project?.working) || !Object.hasOwn(s.project.working,s.project.activeFile) ||
    !(s.project.deployed===null || projectFiles(s.project.deployed)) || !Number.isInteger(s.project.nextRevision) ||
    !revisions(s.project.history) || !revisions(s.project.snapshots) || typeof s.clockActive !== 'boolean')
    throw new Error('This save could not be opened. Your original is still here.')
  if (s.edit && (!Object.hasOwn(s.project.working, s.edit.file) || !Number.isInteger(s.edit.line) || s.edit.line < 1)) delete s.edit
  s.world = pack.decodeWorld(s.world)
  s.entryWorld = pack.decodeWorld(s.entryWorld)
  return s
}
export function continueLesson<W,A extends object>(pack: Pack<W,A>, save: PackSave<W>) {
  if (save.phase !== 'solved' || !save.lessonId) return
  const reveal = save.pendingReveals.shift()
  if (reveal && !save.released.includes(reveal)) {
    save.released.push(reveal)
    pack.release?.(save.world, reveal)
  }
  if (reveal) return
  const next = pack.lessons[pack.lessons.findIndex(l => l.id === save.lessonId) + 1]
  save.completed.push(save.lessonId)
  save.lessonId = next?.id ?? null
  if (!next) { delete save.edit; return }
  save.phase = 'brief'
  save.passed = []
  next.enter?.(save.world)
  save.entryWorld = structuredClone(save.world)
  const starter = next.starter(save.project.working)
  save.edit = starter.edit
  save.project.working = starter.files
  save.project.activeFile = starter.edit.file
}
