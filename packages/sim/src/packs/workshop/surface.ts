import type { MachineKind } from './campaign-api'
import type { Campaign, WorkshopSection } from './model'
import { panels, releasedIds } from './panels'
import { lessons } from './chapter'
import { deployProject, rollbackProject } from './campaign'

export type ChapterExport = 'take' | 'put' | 'look' | 'buy' | 'repair' | 'replyLater' | 'payBalance'
const licenses = { press: 3, furnace: 4, cutter: 5, assembler: 9 } as const
export type ChapterMachine = keyof typeof licenses
export function availableMachines(c: Campaign): ChapterMachine[] {
  return (Object.keys(licenses) as ChapterMachine[]).filter(kind => licenses[kind] <= c.town.beat)
}
export interface UnlockedSurface {
  sections: WorkshopSection[]
  showMoney: boolean
  exports: ChapterExport[]
  budget: number
  multiFile: boolean
  machines: MachineKind[]
}
export function getSurface(c: Campaign): UnlockedSurface {
  const { beat } = c.town
  const released = releasedIds(c)
  const sections = panels.filter(p => p.placement === 'nav' && (!p.reveal || released.includes(p.reveal)) && p.rows(c).length)
    .map(p => p.id as WorkshopSection)
  const exports: ChapterExport[] = ['take', 'put']
  if (beat >= 2) exports.push('replyLater')
  if (beat >= 10) exports.push('payBalance')
  if (beat >= 3) exports.push('buy')
  if (beat >= 6) exports.push('look')
  if (beat > 6 || beat === 6 && lessons[c.lesson.index]?.id !== 'heat-inspect') exports.push('repair')
  const machines: MachineKind[] = ['miner', 'dock', 'furnace']
  if (beat >= 3) machines.push('press')
  if (beat >= 5) machines.push('cutter')
  if (beat >= 9) machines.push('assembler')
  return {
    sections, showMoney: c.lesson.released.some(r => r.kind === 'coins'), exports,
    budget: 1024,
    machines,
    multiFile: beat >= 9,
  }
}
export function deployGameProject(c: Campaign) {
  const revision = deployProject(c)
  const id = lessons[c.lesson.index]?.id
  if (id === 'bram-loop' && !c.town.wired) {
    c.town.entered = c.world.tick
    delete c.town.waiting['iron-ingot']
  }
  if (id && ['bram-loop', 'elsie-grate', 'tomas-lamps', 'wen-wheel', 'bridge-span'].includes(id)) c.town.wired = true
  return revision
}
export const rollbackGameProject = rollbackProject
