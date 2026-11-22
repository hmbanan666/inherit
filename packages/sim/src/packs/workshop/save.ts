import type { Campaign } from './model'
import { isStarterProject } from './campaign'
import { lessons } from './chapter'
import { loadChapterSave } from './persistence'
import type { PackSave } from '../../framework/save'

const v4Order = [
  'bram-take','bram-feed','bram-cart','bram-smelt','bram-ship','bram-loop','harrow-tab','elsie-press',
  'elsie-stamp','elsie-load','elsie-grate','vein-sample','vein-furnace','vein-clear','vein-sort','tomas-cutter',
  'tomas-draw','tomas-collect','tomas-lamps','heat-inspect','heat-restart','heat-rounds','heat-crew','wen-move',
  'wen-cutter','wen-gears','wen-wheel','orders-share','mayor-tools','bridge-jig','bridge-fit','bridge-span','harrow-deed',
]
type WorkshopWorld = Omit<Campaign,'project'>
export function workshopSave(c: Campaign, activeFile = 'main.ts', active = !isStarterProject(c.project.deployed)): PackSave<WorkshopWorld> {
  const { project, ...world } = c
  const revealId = (r: Campaign['lesson']['queue'][number]) => 'id' in r ? r.kind + '.' + r.id : r.kind
  return { formatVersion: 1, packVersion: 1, packId: 'workshop', lessonId:lessons[c.lesson.index]?.id ?? null,
    phase:c.lesson.phase, completed:c.town.solved, passed:c.lesson.passed, pendingReveals:c.lesson.queue.map(revealId),
    released:c.lesson.released.map(revealId), seenSections:c.seenSections, world, entryWorld:world,
    project:{...project,activeFile}, clockActive:active }
}
export function restoreWorkshop(raw: string) {
  const data = JSON.parse(raw)
  if (data?.formatVersion !== 1 || data.packId !== 'workshop' || data.packVersion !== 1) throw new Error('Unknown Workshop save.')
  if (data.world?.version !== 6 || data.entryWorld?.version !== 6 || typeof data.clockActive!=='boolean') throw new Error('Incomplete Workshop save.')
  const {activeFile,...project} = data.project
  loadChapterSave({...data.entryWorld,project})
  const campaign = loadChapterSave({...data.world,project})
  const index = data.lessonId === null ? lessons.length : lessons.findIndex(l => l.id === data.lessonId)
  if (index < 0 || index !== campaign.lesson.index || data.phase !== campaign.lesson.phase) throw new Error('Unknown Workshop lesson.')
  for (const field of [data.completed,data.passed,data.pendingReveals,data.released,data.seenSections])
    if (!Array.isArray(field) || !field.every(id=>typeof id==='string')) throw new Error('Incomplete Workshop progress.')
  return {campaign, activeFile: typeof project.working[activeFile] === 'string' ? activeFile : 'main.ts', clockActive: data.clockActive === true}
}
export function importWorkshop(raw: string) {
  const data = JSON.parse(raw)
  if (data?.version === undefined && (!data?.entries || typeof data.entries !== 'object')) throw new Error('Unreadable archived project.')
  const c = loadChapterSave(data)
  if (data.version === 6 && c.lesson.index < v4Order.length) {
    c.lesson.index = lessons.findIndex(l => l.id === v4Order[c.lesson.index])
    if (c.lesson.index < 0) throw new Error('Unknown chapter lesson.')
  }
  c.lesson.queue = c.lesson.queue.filter(r=>!(r.kind==='section' && r.id==='inbox'))
  return workshopSave(c)
}
