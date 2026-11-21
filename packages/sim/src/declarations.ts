import { MATERIALS, RECIPES } from './catalog'
import type { Campaign } from './model'
import { getSurface, type FactoryMethod, type HandleSurface } from './research'

type Group = 'Machines' | 'Belts' | 'Floor' | 'Orders' | 'Memory' | 'Events'
type Doc = [group: Group, description: string, example: string, signature: string]
const docs: Record<FactoryMethod, Doc> = {
  dig: ['Machines', 'Send one rock onto the belt.', 'ctx.dig("mine")', 'dig(id: string): boolean'],
  work: [
    'Machines',
    'Start one batch if the ingredients are ready.',
    'ctx.work("furnace")',
    'work(id: string, recipe?: RecipeId): boolean',
  ],
  space: [
    'Belts',
    'Check whether the belt has room for another item.',
    'ctx.space("mine")',
    'space(id: string, target?: string): boolean',
  ],
  stock: [
    'Machines',
    'Count waiting ingredients.',
    'ctx.stock("press", "iron-ingot")',
    'stock(id: string, item?: MaterialId | "ore" | "ingot"): number',
  ],
  inspect: [
    'Machines',
    'Read a copy of a machine.',
    'ctx.inspect("press")?.status',
    'inspect(id: string): MachineView | undefined',
  ],
  machines: [
    'Machines',
    'List IDs on your floor.',
    'ctx.machines("furnace")',
    'machines(kind?: MachineKind): string[]',
  ],
  route: [
    'Belts',
    'Send the front parcel down one belt.',
    'ctx.route("splitter", "furnace")',
    'route(id: string, target: string): boolean',
  ],
  recipes: [
    'Machines',
    'List recipes this machine can run.',
    'ctx.recipes("press")',
    'recipes(id: string): RecipeId[]',
  ],
  peek: [
    'Machines',
    'Read the first item waiting in the bin.',
    'ctx.peek("splitter")?.kind',
    'peek(id: string): MaterialItem | undefined',
  ],
  build: [
    'Floor',
    'Place a machine on a free tile. Reusing its name costs nothing.',
    'ctx.build("furnace", { name: "oven" })',
    'build(kind: MachineKind, opts?: BuildOptions): string | undefined',
  ],
  connect: [
    'Belts',
    'Connect two machines with a belt. Repeating the call keeps that belt.',
    'ctx.connect("mine", "furnace")',
    'connect(from: string, to: string): boolean',
  ],
  dismantle: [
    'Floor',
    'Sell a machine you built and its belts for their original cost.',
    'ctx.dismantle("oven")',
    'dismantle(id: string): boolean',
  ],
  lastError: [
    'Floor',
    'Read why the latest build or connection failed.',
    'console.log(ctx.lastError())',
    'lastError(): string | undefined',
  ],
  orders: [
    'Orders',
    'List regular orders with their remaining demand.',
    'ctx.orders().find(o => o.who === "elsie")',
    'orders(): OrderView[]',
  ],
  clear: [
    'Machines',
    'Dump a jammed input bin so work can resume.',
    'ctx.clear("furnace")',
    'clear(id: string): boolean',
  ],
  repair: [
    'Machines',
    'Pay five coins to cool a broken furnace in three seconds.',
    'ctx.repair("furnace")',
    'repair(id: string): boolean',
  ],
  dispatch: [
    'Orders',
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
export interface ApiEntry {
  group: Group
  name: string
  description: string
  example: string
  signature: string
  receiver?: string
  kind: 'method' | 'property' | 'handler' | 'machine'
}
const eventDescriptions = {
  onItemArrived: 'Run when an item reaches a machine.',
  onMachineIdle: 'Run when a machine becomes idle.',
  onTruckReturned: 'Run when a truck finishes its trip.',
}
function entry(name: string, kind: ApiEntry['kind'], [group, description, example, signature]: Doc): ApiEntry {
  return { name, kind, group, description, example, signature }
}
function factoryEntries(c: Campaign): ApiEntry[] {
  const surface = getSurface(c)
  const entries = surface.methods.map(name => entry(name, 'method', docs[name]))
  entries.push(
    entry('tick', 'property', [
      'Floor', 'Read the current factory tick.', 'console.log(ctx.tick)', 'tick: number',
    ]),
    entry('onTick', 'handler', [
      'Floor',
      'Run your controller once per tick.',
      'export function onTick(ctx: Factory) { ctx.dig("mine") }',
      'onTick(ctx: Factory): void',
    ]),
  )
  if (c.town.beat >= 6) {
    entries.push(entry('memory', 'property', [
      'Memory',
      'Keep a value between ticks and deploys.',
      'ctx.memory.repairs = 1',
      'memory: { [key: string]: MemoryValue }',
    ]))
  }
  for (const name of surface.events) {
    const event = name.slice(2) + 'Event'
    entries.push(entry(name, 'handler', [
      'Events',
      eventDescriptions[name],
      `import type { ${event} } from "inherit"\nexport function ${name}(e: ${event}) { console.log(e.machineId) }`,
      `${name}(event: ${event}, ctx: Factory): void`,
    ]))
  }
  return entries
}
const tickHandler = entry('onTick', 'handler', [
  'Floor', 'The factory runs this function every tick.',
  'export function onTick() { console.log("tick") }', 'onTick(): void',
])

function handleEntries({ name, type, members }: HandleSurface) {
  const machine = entry(name, 'machine', [
    'Machines', 'Import Uncle’s ' + name + ' to use it in your controller.',
    `import { ${name} } from "inherit"`, `${name}: ${type}`,
  ])
  const memberDocs: Record<HandleSurface['members'][number], Doc> = {
    name: ['Machines', 'Read the machine’s name.', `console.log(${name}.name)`, 'name: string'],
    dig: ['Machines', 'Dig one rock. Wait when the belt is full.', 'mine.dig()', 'dig(): boolean'],
    connect: ['Belts', 'Connect these machines with a belt. Repeating this keeps the same belt.',
      name === 'mine' ? 'mine.connect(furnace)' : 'furnace.connect(cart)', 'connect(to: Handle | string): boolean'],
    smelt: ['Machines', 'Smelt ore into an ingot. The default recipe makes iron.',
      'furnace.smelt()', 'smelt(recipe?: "iron-ingot" | "copper-ingot"): boolean'],
  }
  const methods = members.map(member => ({
    ...entry(member, member === 'name' ? 'property' : 'method', memberDocs[member]),
    receiver: name,
  }))
  return { machine, methods }
}

export function apiReference(c: Campaign): ApiEntry[] {
  const entries = [tickHandler]
  for (const handle of getSurface(c).handles) {
    const { machine, methods } = handleEntries(handle)
    entries.push(machine, ...methods)
  }
  // Later requests still teach the original calls until their handle lessons land.
  if (c.town.beat > 1) {
    for (const doc of factoryEntries(c)) {
      if (doc.name === 'onTick') continue
      entries.push(doc.kind === 'handler'
        ? { ...doc, signature: doc.signature.replace(', ctx: Factory', '') }
        : { ...doc, receiver: 'ctx' })
    }
  }
  return entries
}
function declaration(doc: ApiEntry) {
  let signature = doc.signature
  if (doc.kind === 'property') signature = 'readonly ' + signature
  if (doc.kind === 'handler' && doc.name !== 'onTick') signature = signature.replace('(', '?(')
  return '    /** ' + doc.description + ' @example ' + doc.example + ' */\n    ' + signature
}
export function apiDeclarations(c: Campaign): string {
  const surface = getSurface(c)
  const entries = factoryEntries(c)
  return [
    'declare module "inherit" {',
    '  export type MaterialId = ' + literals(Object.keys(MATERIALS)),
    '  export type RecipeId = ' + literals(Object.keys(RECIPES)),
    '  export type MachineKind = ' + literals(surface.machines),
    '  export interface BuildOptions { name?: string; x?: number; y?: number; recipe?: RecipeId; deposit?: "iron" | "coal" | "copper" }',
    '  export interface OrderView { readonly id: string; readonly who: string; readonly items: Readonly<Partial<Record<MaterialId,number>>>; readonly filled: Readonly<Partial<Record<MaterialId,number>>> }',
    '  export interface MaterialItem { kind: MaterialId; defect?: true }',
    '  export interface MachineView { id: string; kind: MachineKind; siteId: string; x: number; y: number; status: "idle" | "working" | "ready" | "blocked" | "starved" | "jammed" | "broken"; deposit?: "iron" | "coal" | "copper"; recipe?: RecipeId; remaining: number; queue: MaterialItem[]; output?: MaterialItem; stats: { processed: number; activeTicks: number; idleTicks: number; blockedTicks: number; rate: number } }',
    '  export type MemoryValue = null | boolean | number | string | MemoryValue[] | { [key: string]: MemoryValue }',
    ...(surface.handles.length ? ['  export interface Handle { readonly name: string }'] : []),
    ...surface.handles.flatMap(handle => {
      const { machine, methods } = handleEntries(handle)
      return [
        `  export interface ${handle.type} extends Handle {`,
        ...methods.map(declaration),
        '  }',
        `  /** ${machine.description} @example ${machine.example} */`,
        '  export const ' + machine.signature,
      ]
    }),
    '  export interface Factory {',
    ...entries.filter(doc => doc.kind !== 'handler').map(declaration),
    '  }',
    ...surface.events.map(name =>
      '  export type ' + name.slice(2) + 'Event = { tick: number; machineId: string } & ' + eventTypes[name]),
    '  export interface Handlers {',
    ...entries.filter(doc => doc.kind === 'handler').map(declaration),
    '  }',
    '  export type FactoryEvent = ' +
      (surface.events
        .map(name => name.slice(2) + 'Event')
        .join(' | ') || 'never'),
    '}',
  ].join('\n')
}
