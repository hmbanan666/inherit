import type { Campaign } from './model'
import { getSurface, availableMachines, type ChapterExport } from './research'

const docs: Record<ChapterExport, [string, string, string]> = {
  take: [
    'take(place: string): string | undefined',
    'Pick up the front ready item. Unused items return at the end of the tick.',
    'const rock = take("mine")',
  ],
  put: [
    'put(place: string, item: string | undefined): boolean',
    'Give a place an item you took. An empty hand or a full bin returns false.',
    'const rock = take("mine")\nput("furnace", rock)',
  ],
  look: [
    'look(place: string): { status: string; inside: string[]; ready: string | undefined; wanted?: string[]; waiting?: Record<string, number> }',
    'See the ready item and inputs. The cart also lists wanted items and unsold quantities.',
    'const next = look("mine").ready',
  ],
  buy: [
    'buy(kind: KIND, name?: string): boolean',
    'Buy a machine for the shed. Reusing its name costs nothing.',
    'buy("press")',
  ],
  repair: ['repair(machine: string): boolean', 'Get a broken furnace working again.', 'repair("furnace")'],
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
    'declare module "inherit" {\n' +
    apiReference(c)
      .map((doc) => '  /** ' + doc.description + ' */\n  export function ' + doc.signature)
      .join('\n') +
    '\n  }\ninterface Console { log(...values: unknown[]): void }\ndeclare var console: Console'
  )
}
