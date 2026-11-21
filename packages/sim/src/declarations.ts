import { MATERIALS, RECIPES } from './catalog'
import type { Campaign } from './model'
import { getSurface, type FactoryMethod } from './research'

const docs: Record<FactoryMethod, [string, string, string]> = {
  dig: ['Send one rock onto the belt.', 'ctx.dig("mine")', 'dig(id: string): boolean'],
  work: [
    'Start one batch if the ingredients are ready.',
    'ctx.work("furnace-a")',
    'work(id: string, recipe?: RecipeId): boolean',
  ],
  space: [
    'Check the first tile of an outgoing belt.',
    'ctx.space("mine")',
    'space(id: string, target?: string): boolean',
  ],
  stock: [
    'Count waiting ingredients.',
    'ctx.stock("press", "coal")',
    'stock(id: string, item?: MaterialId | "ore" | "ingot"): number',
  ],
  inspect: [
    'Read a copy of a machine.',
    'ctx.inspect("press")?.status',
    'inspect(id: string): MachineView | undefined',
  ],
  machines: ['List IDs on your floor.', 'ctx.machines("furnace")', 'machines(kind?: MachineKind): string[]'],
  route: [
    'Send the front parcel down one belt.',
    'ctx.route("fork", "furnace-a")',
    'route(id: string, target: string): boolean',
  ],
  recipes: ['List recipes this machine can run.', 'ctx.recipes("press")', 'recipes(id: string): RecipeId[]'],
  peek: [
    'Read the front parcel and its quality stamp.',
    'ctx.peek("sorter")?.defect',
    'peek(id: string): MaterialItem | undefined',
  ],
  dispatch: [
    'Send one parcel. Reusing its key retries the same load.',
    'ctx.dispatch("truck", "local", "remote", "load-1")',
    'dispatch(truckId: string, fromDepot: string, toDepot: string, key: string): boolean',
  ],
}
const literals = (values: string[]) => values.map((id) => JSON.stringify(id)).join(' | ')
const eventTypes = {
  onItemArrived: '{ type: "itemArrived"; item: MaterialItem }',
  onMachineIdle: '{ type: "machineIdle" }',
  onTruckReturned: '{ type: "truckReturned"; key: string; outcome: "ok" | "breakdown" | "lostAck" }',
}
export function apiDeclarations(c: Campaign): string {
  const surface = getSurface(c)
  return [
    'declare module "inherit" {',
    '  export type MaterialId = ' + literals(Object.keys(MATERIALS)),
    '  export type RecipeId = ' + literals(Object.keys(RECIPES)),
    '  export type MachineKind = ' + literals(surface.machines),
    '  export interface MaterialItem { kind: MaterialId; defect?: true }',
    '  export interface MachineView { id: string; kind: MachineKind; siteId: string; x: number; y: number; status: "idle" | "working" | "ready" | "blocked" | "starved"; deposit?: "iron" | "coal" | "copper"; recipe?: RecipeId; remaining: number; queue: MaterialItem[]; output?: MaterialItem; stats: { processed: number; activeTicks: number; idleTicks: number; blockedTicks: number; rate: number } }',
    '  export type MemoryValue = null | boolean | number | string | MemoryValue[] | { [key: string]: MemoryValue }',
    '  export interface Factory {',
    '    /** Shared guest ledger. @example ctx.memory.rocks = 1 */',
    '    readonly memory: { [key: string]: MemoryValue }',
    '    /** Current shift tick. @example ctx.tick */',
    '    readonly tick: number',
    ...surface.methods.map((method) => {
      const [why, example, signature] = docs[method]
      return '    /** ' + why + ' @example ' + example + ' */\n    ' + signature
    }),
    '  }',
    '  export interface Handlers {',
    '    /** Runs once per tick. @example onTick(ctx) { ctx.dig("mine") } */',
    '    onTick(ctx: Factory): void',
    ...surface.events.map(
      (name) =>
        '    /** Called with a previous-tick event. @example ' +
        name +
        '(e, ctx) { console.log(e.machineId) } */\n    ' +
        name +
        '?(event: { tick: number; machineId: string } & ' +
        eventTypes[name] +
        ', ctx: Factory): void',
    ),
    '  }',
    '  export type FactoryEvent = ' +
      (surface.events
        .map((name) => '({ tick: number; machineId: string } & ' + eventTypes[name] + ')')
        .join(' | ') || 'never'),
    '}',
  ].join('\n')
}
