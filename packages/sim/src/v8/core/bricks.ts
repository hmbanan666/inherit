import type { World } from './world'

export interface TickContext {
  world: World
  cpuUsed(): number
}

export type HostHandler = (ctx: TickContext, ...args: unknown[]) => unknown

export interface Brick {
  name: string
  signature: string
  doc: string
  example: string
  cost: number
  since: string
  deprecated?: { since: string; use: string }
  // Clock, memory and immutable site bindings live directly in the guest.
  handler: HostHandler | { guest: string }
}

export function brick(name: string, signature: string, doc: string, example: string, cost: number,
  handler: Brick['handler']): Brick {
  return { name, signature, doc, example, cost, since: '1.0', handler }
}

/** on() is declared with the bricks so the book, the hover, and the type string stay one text. */
export const onSignature = "function on(event: 'furnace.full' | 'furnace.ready' | 'drone.idle' | 'drone.full', fn: () => void): void"
export const onDoc = 'Call fn once when that event happens. A quest unlocks on().'
export const onExample = `import { on, memory } from "inherit"

// furnace.full: the output cap was just reached.
// furnace.ready: an ingot or steel just finished.
// drone.idle: the cart is empty and has no task.
// drone.full: the cart just filled.
function haul() {
  memory.hauls = (memory.hauls ?? 0) + 1
}
on("drone.idle", haul)`

/** One example block. A bare call gains a comment from its doc line, so the book and the hover stay together. */
export function exampleText(doc: string, example: string) {
  if (/(^|\n)\s*\/\//.test(example)) return example
  const sentence = doc.endsWith('.') ? doc : `${doc}.`
  return `// ${sentence}\n${example}`
}

export function declarations(bricks: Brick[], fresh: ReadonlySet<string> = new Set(), droneNames?: readonly string[]) {
  const nameType = droneNames?.length ? droneNames.map(name => JSON.stringify(name)).join(' | ') : 'string'
  const declaration = (b: Brick, prefix = '') => {
    const note = exampleText(b.doc, b.example).split('\n').map(line => ` * ${line}`).join('\n')
    const deprecated = b.deprecated ? ` @deprecated Use ${b.deprecated.use}` : ''
    return `  /** ${fresh.has(b.name) ? 'new. ' : ''}${b.doc} CPU: ${b.cost}.${deprecated}\n${note}\n   */\n  ${prefix}${b.signature}`
  }
  const members = (owner: string) => bricks.filter(b => b.name.startsWith(owner)).map(b => declaration(b)).join('\n')
  const counted = bricks.find(b => b.name === 'depot.count')?.signature ?? ''
  const itemUnion = counted.match(/item: ([^)]+)/)?.[1] ?? 'string'
  return `declare module "inherit" {
  export interface Cell { x: number; y: number }
  export interface Target { readonly pos: Cell }
  export interface Vein extends Target { readonly name: string; readonly kind: 'ore' | 'coal'; readonly purity: 'poor' | 'normal' | 'rich'; readonly ticksPerUnit: number; readonly yield: number }
  export interface OrderLine { readonly item: ${itemUnion}; readonly qty: number; readonly shipped: number }
  export interface Order { readonly id: string; readonly item: ${itemUnion}; readonly qty: number; readonly shipped: number; readonly pay: number; readonly from: string; readonly lines?: readonly OrderLine[] }
  export interface ManifestLine { readonly item: ${itemUnion}; readonly qty: number; readonly staged: number }
  export interface Manifest { readonly id: 'winch' | 'lamp'; readonly winch: boolean; readonly lamp: boolean; readonly lines: readonly ManifestLine[] }
  export interface Furnace extends Target {
${members('furnace.')}
  }
  export interface Press extends Target {
${members('press.')}
  }
  export interface Lathe extends Target {
${members('lathe.')}
  }
  export interface Bench extends Target {
${members('bench.')}
  }
  export interface Depot extends Target {
${members('depot.')}
  }
  export interface Drone extends Target {
    readonly name: ${nameType}
    readonly cargo: number
    readonly capacity: number
${members('drone.')}
  }
  export const cpu: {
${members('cpu.')}
  }
${bricks.filter(b => !b.name.includes('.')).map(b => declaration(b, 'export ')).join('\n')}
  export type WorksEvent = 'furnace.full' | 'furnace.ready' | 'drone.idle' | 'drone.full'
  /** ${onDoc} CPU: 0.
${exampleText(onDoc, onExample).split('\n').map(line => `   * ${line}`).join('\n')}
   */
  export function on(event: WorksEvent, fn: () => void): void
}
declare interface InheritConsole {
  log(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}
declare const console: InheritConsole
`
}

export function operationName(brick: Brick) { return brick.name.replace('.', '_') }
