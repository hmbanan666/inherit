import { placeNames } from './lesson-flow'
import type { Campaign } from './model'
import { getSurface, availableMachines, type ChapterExport } from './surface'

import source from './player.ts?raw'
import { playerDeclarations, readPlayerAPI } from '../../framework/declarations'
const schema = readPlayerAPI(source)
const examples: Record<ChapterExport,string> = {
  take:'take("mine")',put:'take("mine")\nput("furnace")',look:'const next = look("mine").ready',
  buy:'buy("press")',repair:'repair("furnace")',replyLater:'replyLater()',payBalance:'payBalance()',
}
export interface ApiEntry {
  name: ChapterExport
  description: string
  example: string
  signature: string
}
export function apiReference(c: Campaign): ApiEntry[] {
  const surface = getSurface(c)
  return surface.exports.map(name => {
    const doc = schema.methods.find(m=>m.name===name)!
    return {...doc, name, example:examples[name], signature:doc.signature.replace('MachineKind', availableMachines(c).map(k=>JSON.stringify(k)).join(' | '))}
  })
}
export function apiDeclarations(c: Campaign): string {
  const names = getSurface(c).exports
  const overloads = names.includes('look') ? ['export function look(place: "cart"): Inspection & { wanted: string[]; waiting: Record<string, number> }'] : []
  return playerDeclarations(schema,names,'module',{ Place:placeNames(c),MachineKind:availableMachines(c) },overloads)
}
