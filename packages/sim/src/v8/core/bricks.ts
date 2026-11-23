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

export function declarations(bricks: Brick[]) {
  const declaration = (b: Brick, prefix = '') =>
    `  /** ${b.doc} CPU: ${b.cost}.${b.deprecated ? ' @deprecated Use ' + b.deprecated.use : ''} */\n  ${prefix}${b.signature}`
  const members = (owner: string) => bricks.filter(b => b.name.startsWith(owner)).map(b => declaration(b)).join('\n')
  return `declare module "inherit" {
  export interface Cell { x: number; y: number }
  export interface Target { readonly pos: Cell }
  export interface Vein extends Target { readonly name: string; readonly left: number }
  export interface Drone extends Target {
    readonly name: string
    readonly cargo: number
    readonly capacity: number
${members('drone.')}
  }
  export const cpu: {
${members('cpu.')}
  }
${bricks.filter(b => !b.name.includes('.')).map(b => declaration(b, 'export ')).join('\n')}
}`
}

export function operationName(brick: Brick) { return brick.name.replace('.', '_') }
