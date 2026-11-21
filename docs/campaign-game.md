# Workshop game API

The game host imports from `@inherit/sim`. One Campaign owns the floor, player project, ledger, research, board and mail. Shop and research between ticks. Licensed controllers can also build during a tick. Call `advanceGame` once per simulation tick. The factory starts idle with Uncle’s note in `main.ts`. The player writes and deploys `onTick()`, then imports machine handles from `"inherit"`. A dock shipment and every objective stamp pay coins.

## Worker loop

```ts
const c = loadSave(savedText)
const surface = getSurface(c)
// After the player deploys a controller:
const program = await createProgram({
  files: c.project.deployed,
  memory: c.memory,
  budget: surface.budget,
  unlockedEvents: surface.events,
})
const feedback = advanceGame(c, program)
const { active, next, progress } = objectiveTrack(c)
```

`createProgram` belongs to the sandbox package. The game accepts its structural interface without a runtime dependency. It delivers the previous tick’s unlocked events in order, calls onTick, exports memory, then settles the current physical tick. Recreate the program on deployment, rollback, or an event/budget unlock. Refresh Monaco’s ambient library when the onboarding step or story beat changes. Register the sandbox declarations alongside the game declarations for globals such as `memory`.

```ts
createCampaign(seed?: number): Campaign
loadSave(input: unknown): Campaign
serializeSave(c: Campaign): string
cloneCampaign(c: Campaign): Campaign
deployGameProject(c: Campaign): ProjectRevision
rollbackGameProject(c: Campaign, revisionId: number): boolean
snapshotProject(c: Campaign, name: string): ProjectRevision

advanceGame(c: Campaign, controller: GameController): GameTick
type GameController = GameProgram | ((ctx: GameFactory, events: FactoryEvent[]) => void)
interface GameProgram {
  deliverEvent(name: GameEventName, event: FactoryEvent, ctx: GameFactory): void
  onTick(ctx: GameFactory): void
  exportMemory(): JsonObject
}
interface GameTick {
  completed: string[]
  newMessages: StoryMessage[]
  orderUpdates: OrderState[]
  moneyDelta: number
  incidents: Incident[]
}
```

The callback form supports a worker that collects traces itself. Invoke authorized event handlers and onTick synchronously and export guest memory into `c.memory` before returning. GameFactory supplies tick, dig, work and space plus the licensed methods. Locked methods are absent from this host object. The guest has global memory and ctx.memory. A controller exception propagates after the game settles the physical tick and its payouts. Feedback contains detached changes for this tick. An action such as accepting a ticket updates the Campaign immediately.

## Research and shopping

```ts
RESEARCH: readonly ResearchNode[]
research(c: Campaign, id: string): boolean
getSurface(c: Campaign): UnlockedSurface
apiDeclarations(c: Campaign): string
interface UnlockedSurface {
  methods: FactoryMethod[]
  events: GameEventName[]
  budget: number
  multiFile: boolean
  machines: MachineKind[]
}
PRICES: { machines: Record<MachineKind, number>; beltPerTile: number; plots: Record<string, number>; road: number }
purchaseMachine(c: Campaign, kind: MachineKind, siteId: string, x: number, y: number, id?: string): CampaignMachine | undefined
purchaseBelt(c: Campaign, from: string, to: string, path?: Tile[]): CampaignBelt | undefined
purchasePlot(c: Campaign, siteId: string, plotId: string): boolean
purchaseRoad(c: Campaign): boolean
sellMachine(c: Campaign, id: string): boolean
sellBelt(c: Campaign, from: string, to: string): boolean
```

A ResearchNode has id, title, description, cost in research points, requires (IDs), and optional machines, methods, events or budget. The starting allowance is 96 operations. Clock upgrades raise it to 192 and 384. The 19 node IDs are survey, bins, fork, press, clock, binder, blueprints, copper, cutter, recipes, assembly, store, merge, quality, arrivals, idle, clock-2, road and freight. Quality research enables seeded defects. The binder licenses multi-file deploys and rollbacks. Drafts and snapshots can contain unfinished work.

The editor text declares module "inherit" with Factory, MachineKind, MaterialId, RecipeId, MaterialItem, MachineView, MemoryValue, FactoryEvent and Handlers. Factory operations, event variants and buildable machine kinds reflect current research. Material and recipe names describe the common catalog.

Read money, reputation, researchPoints, research (owned IDs) and road from c.economy. Belt price counts every path tile, including both endpoints, on manual or automatic paths. Sales refund the stored purchase price once. Each plot stores its price in world data. Road purchase opens the yard for construction and puts the shed’s rail spur up for sale. Supply the actual placed machine IDs in player code.

### Blueprint API

After Workshop binder, spend three research points on Blueprint API. The unlocked editor declarations include these methods.

```ts
build(kind: MachineKind, x: number, y: number, opts?: {
  siteId?: string
  recipe?: RecipeId
  deposit?: 'iron' | 'coal' | 'copper'
}): string | undefined
connect(from: string, to: string): boolean
dismantle(id: string): boolean
lastError(): string | undefined
```

Build on an empty owned tile in the shed or pass a site ID. A recipe must suit the machine. Miners need a licensed deposit and can request a specific mineral. Connect buys a shortest belt across owned tiles at the shop’s per-tile price. Dismantle refunds the machine and attached belts at their stored prices and counts discarded cargo as lost.

Changes take effect in call order during event handlers and `onTick`, after belt arrivals and before freight and production settle. The next call can inspect, use or connect a newly built machine. All handlers share four construction attempts per tick. A failed attempt uses one slot. On failure, read `ctx.lastError()` for the reason. The next successful construction call or the next tick clears it. Each method call, including reading the error, uses the regular controller budget.

```ts
if (!memory.oven) {
  const id = ctx.build("furnace", 10, 2, { recipe: "copper-ingot" })
  if (id) memory.oven = id
}
if (typeof memory.oven === "string" && !memory.wired) {
  memory.wired = ctx.connect("copper", memory.oven)
  if (!memory.wired) console.log(ctx.lastError())
}
```

## Objective track and mail

```ts
OBJECTIVES: readonly Objective[]
interface Objective {
  id: string
  title: string
  why: string
  hints: string[]
  reward: { money: number; researchPoints: number }
  story?: string
}
objectiveTrack(c: Campaign): { active?: Objective; next?: Objective; progress: { current: number; target: number } }
objectiveProgress(c: Campaign, id: string): { state: 'upcoming' | 'active' | 'complete'; current: number; target: number } | undefined
retryObjective(c: Campaign): boolean
markMessageRead(c: Campaign, id: string): boolean
interface StoryMessage {
  id: string
  kind: 'notebook' | 'email'
  from: string
  title: string
  body: string
  tick: number
  unread: boolean
}
```

Read c.progress.completedObjectives and c.progress.messages. At most one objective pays per tick. Completed steps stay stamped after rebuilding or redeploying. The five named customers use the engine’s relative-counter checks. Show `questStatus(c)` for their elapsed ticks, rate, idle, coal and losses. Retrying opens a fresh measurement window on the live line. A missed budget or deadline restarts the window automatically. On freight objectives, retry can schedule another fault for a fresh manifest. Opening the conductor’s letter finishes the track. The board continues in free play.

Module imports, tallies and annotations use lightweight checks on deployed text. Monaco performs semantic diagnostics. Trying a misspelled recipe is optional. The event objectives also require activity on the real floor. Binder research or three similar routing lines trigger Uncle’s helper note once.

Track IDs in order:

```text
dig, fire, ingot, shed, loading, tally, chalk, redeploy, plot, oven, belt, gauges,
fork, balance, coal, press, part, parts, clock, gate, binder, helper, copper, blueprints, code-furnace, code-belt,
copper-ore, copper-bar, cutter, wire, plate, gear, cards, jig, bracket, shelves,
buffer, release, merger, quality, sorter, scrap, contract, recipe-table, doorbell,
arrival, idle-bell, idle, road, depots, truck, manifest, breakdown, ack, motor, tram, network
```

## Board and incidents

```ts
openBoard(c: Campaign): OrderState[] // newly posted tickets; advanceGame calls this
orderMaterials(c: Campaign): MaterialId[]
acceptOrder(c: Campaign, id: string): boolean
declineOrder(c: Campaign, id: string): boolean
```

The board opens after County Freight’s seven lossless ingots (`loading`). It maintains three open offers and allows three accepted orders at a time. Each c.economy.orders entry carries id, customer, line, items, filled, duration, optional absolute deadline and quality, pay, reputation and status (open/accepted/done/failed/declined). The offer’s duration starts at acceptance. Its deadline tick is inclusive. A dock parcel fills one matching ticket in board order. Finishing pays a bonus, reputation and one research point. Missing a pickup costs one reputation. Declining an offer is free. The board prunes old closed tickets.

World incidents carry id, startTick, optional endTick, machineId, cause (blocked/breakdown/lostAck), optional manifest key and affectedOrders. Current belts and recipes determine which outstanding requests the stopped parcel could have reached. The tick result includes opened and closed records. Truck receipts retain each manifest key across reloads.

## Saves and reference play

Version 3 retains the existing engine data and adds game progress. Loading v2 preserves the floor, stock, code, history, snapshots, memory, economy, previous customers and truck manifests. An in-progress customer’s counter window resumes when their step comes up. Equipment and deployed code already in use grandfather their research licenses. Chapter notebooks still import their scripts. Keep the original storage entry if loadSave rejects invalid or unknown data.

```ts
referenceFiles(objectiveId: string): ProjectFiles
referenceActions(objectiveId: string): ReferenceAction[]
applyReferenceAction(c: Campaign, action: ReferenceAction): boolean
```

On stage entry, apply its actions once in order, paste the supplied working files, and deploy if changed. The action tuples carry site coordinates and belt endpoints. A belt endpoint such as `{ memory: "oven" }` reads the ID that the controller saved when it built the machine. The actions use the same public purchase, sell, research, read and order commands as the player. The headless test runs those TypeScript functions on two seeds, verifies each stamp, checks the retained world and ledger, and follows one parcel through both truck faults. The declarations test checks every stage against its unlocked editor surface.
