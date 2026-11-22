import type { Campaign } from './model'
import { isStarterProject } from './campaign'
import { lessons } from './chapter'
import { loadChapterSave } from './persistence'
import { validProject } from '../../framework/save'

export function workshopSave(c: Campaign, activeFile = 'main.ts', active = !isStarterProject(c.project.deployed)) {
  const { project, ...world } = c
  const revealId = (r: Campaign['lesson']['queue'][number]) => 'id' in r ? r.kind + '.' + r.id : r.kind
  return { formatVersion: 2, packVersion: 2, packId: 'workshop', lessonId:lessons[c.lesson.index]?.id ?? null,
    phase:c.lesson.phase, completed:c.town.solved, passed:c.lesson.passed, pendingReveals:c.lesson.queue.map(revealId),
    released:c.lesson.released.map(revealId), seenSections:c.seenSections, world, entryWorld:world,
    project:{...project,activeFile}, clockActive:active }
}
export function restoreWorkshop(raw: string, version = 2) {
  const data = JSON.parse(raw)
  if (data?.formatVersion !== version || data.packId !== 'workshop' || data.packVersion !== version) throw new Error('Unknown Workshop save.')
  if (data.world?.version !== 6 || data.entryWorld?.version !== 6 || typeof data.clockActive!=='boolean') throw new Error('Incomplete Workshop save.')
  if (!validProject(data.project)) throw new Error('Incomplete Workshop project.')
  const {activeFile,...project} = data.project
  loadChapterSave({...data.entryWorld,project})
  const campaign = loadChapterSave({...data.world,project})
  const index = data.lessonId === null ? lessons.length : lessons.findIndex(l => l.id === data.lessonId)
  if (index < 0 || index !== campaign.lesson.index || data.phase !== campaign.lesson.phase) throw new Error('Unknown Workshop lesson.')
  for (const field of [data.completed,data.passed,data.pendingReveals,data.released,data.seenSections])
    if (!Array.isArray(field) || !field.every(id=>typeof id==='string')) throw new Error('Incomplete Workshop progress.')
  return {campaign, activeFile: typeof project.working[activeFile] === 'string' ? activeFile : 'main.ts', clockActive: data.clockActive === true}
}
export function archivedChapterProject(raw: string) {
  const data = JSON.parse(raw)
  if (data?.version === undefined && (!data?.entries || typeof data.entries !== 'object'))
    throw new Error('Unreadable archived project.')
  if (typeof data.version === 'number' && data.version > 6)
    throw new Error('Unknown Workshop version.')
  return loadChapterSave(data).project
}
