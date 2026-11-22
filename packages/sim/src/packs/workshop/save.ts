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
  const campaign = loadChapterSave({...data.world,project:data.project})
  const index = data.lessonId === null ? lessons.length : lessons.findIndex(l => l.id === data.lessonId)
  if (index < 0) throw new Error('Unknown Workshop lesson.')
  campaign.lesson.index = index
  return {campaign, activeFile: typeof data.project.working[data.project.activeFile] === 'string' ? data.project.activeFile : 'main.ts', clockActive: data.clockActive === true}
}
export function importWorkshop(raw: string) {
  const data = JSON.parse(raw)
  const c = loadChapterSave(data)
  if (data.version === 6 && c.lesson.index < v4Order.length) {
    c.lesson.index = lessons.findIndex(l => l.id === v4Order[c.lesson.index])
    if (c.lesson.index < 0) throw new Error('Unknown chapter lesson.')
  }
  return workshopSave(c)
}
