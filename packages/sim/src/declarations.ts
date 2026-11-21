import { placeNames } from './lesson-flow'
import type { Campaign } from './model'
import { getSurface, availableMachines, type ChapterExport } from './research'

const docs: Record<ChapterExport, [string, string, string]> = {
  take: [
    'take(place: Place): string | undefined',
    'Pick up the front ready item. The hand holds one item.',
    'take("mine")',
  ],
  put: [
    'put(place: Place): boolean',
    'Put the item in the hand down here. An empty hand or a full bin returns false.',
    'take("mine")\nput("furnace")',
  ],
  look: [
    'look(place: Place): { status: string; inside: string[]; ready: string | undefined; wanted?: string[]; waiting?: Record<string, number> }',
    'See the ready item and inputs. The cart also lists wanted items and unsold quantities.',
    'const next = look("mine").ready',
  ],
  buy: [
    'buy(kind: KIND, name?: string): boolean',
    'Buy a machine for the shed. Reusing its name costs nothing.',
    'buy("press")',
  ],
  repair: ['repair(machine: Place): boolean', 'Get a broken furnace working again.', 'repair("furnace")'],
}
export interface ApiEntry {
  name: ChapterExport
  description: string
  example: string
  signature: string
}
export function apiReference(c: Campaign): ApiEntry[] {
  const surface = getSurface(c)
  const kinds = availableMachines(c)
  return surface.exports.map((name) => {
    const [signature, description, example] = docs[name]
    return {
      name,
      description,
      example,
      signature: signature.replace('KIND', kinds.map((k) => JSON.stringify(k)).join(' | ')),
    }
  })
}
export function apiDeclarations(c: Campaign): string {
  return (
    'type Place = ' + placeNames(c).map(p => JSON.stringify(p)).join(' | ') + '\n' +
    'declare module "inherit" {\n' +
    (getSurface(c).exports.includes('look') ? '  export function look(place: "cart"): { status: string; inside: string[]; ready?: string; wanted: string[]; waiting: Record<string, number> }\n' : '') +
    apiReference(c)
      .map((doc) => '  /** ' + doc.description + ' */\n  export function ' + doc.signature)
      .join('\n') +
    '\n  }\ninterface Console { log(...values: unknown[]): void }\ndeclare var console: Console'
  )
}
