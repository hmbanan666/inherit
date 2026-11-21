# Persistent factory engine

Import these entry points from `@inherit/sim`. The old `World`, `Factory`, chapter levels and `createWorld(level, layout?)` still serve the chapter app. The campaign uses `CampaignWorld` and `CampaignFactory`. The self-contained player declarations at `@inherit/sim/campaign-api` export the campaign controller as `Factory` for Monaco. The chapter editor continues to use `@inherit/sim/api`.

```ts
createCampaign(seed?: number): Campaign
cloneCampaign(campaign: Campaign): Campaign
step(world: CampaignWorld, onTick: (ctx: CampaignFactory, events: FactoryEvent[]) => void): void
serializeSave(campaign: Campaign): string
loadSave(data: unknown): Campaign  // JSON text, parsed v2 or MVP notebook, null for a new game
deployProject(campaign: Campaign): ProjectRevision
rollbackProject(campaign: Campaign, revisionId: number): boolean
snapshotProject(campaign: Campaign, name: string): ProjectRevision
buyPlot(campaign: Campaign, siteId: string, plotId: string): boolean
placeMachine(campaign: Campaign, kind: MachineKind, siteId: string, x: number, y: number, id?: string, cost?: number): CampaignMachine | undefined
connectBelt(campaign: Campaign, from: string, to: string, path?: Tile[], cost?: number): CampaignBelt | undefined
removeMachine(campaign: Campaign, id: string): boolean
removeBelt(campaign: Campaign, from: string, to: string): boolean
```

`Campaign` (alias `SaveGame`) contains `version: 2`, `world`, `economy: { money, reputation, research: string[], orders: OrderState[] }`, `progress: { completedQuests: string[] }`, `memory: JsonObject` and `project: { working: ProjectFiles, deployed: ProjectFiles, history: ProjectRevision[], snapshots: ProjectRevision[] }`. A ProjectFiles is a flat Record<string,string> with entry 'main.ts'. Revisions have id, tick, name and files. Deploy, snapshots and rollback copy files. Working copies and snapshots may be unfinished. Deploy requires main.ts. An incomplete snapshot cannot be deployed by rollback. The worker compiles deployed files between ticks. Preview clones the entire campaign before compiling a separate program.

`world` has tick, seed (current PRNG state), sites, machines, belts, trips, receipts, events (prior complete ticks, bounded), incidents, lost and delivered (material totals). Sites have id, name, plots, deposits and road connections. Plots are rectangles with x,y,width,height,status ('owned'/'sale'/'locked') and price. Coordinates are integer site-local tiles. Tile is {x,y}. Machine IDs are unique across sites. A belt is identified by its ordered pair of machine IDs. Machines have id,kind,siteId,x,y,queue: MaterialItem[], recipe?, status, remaining, output?, stats. A MaterialItem is {kind: MaterialId, defect?: true}. Belts have from,to,siteId,path: Tile[],items with id,kind,defect?,position. Initial shed IDs are 'shed', 'mine', 'furnace-a' and 'dock'. Second site is 'yard'. Set world.defectsEnabled when sorter research lands. Catalog exports are MATERIALS, RECIPES and MACHINES keyed by ID. Recipe IDs match their output material except scrap uses 'recycle'.

```ts
interface CampaignFactory {
  readonly tick: number
  dig(id: string): boolean
  work(id: string, recipe?: RecipeId): boolean
  route(id: string, target: string): boolean
  space(id: string, target?: string): boolean
  stock(id: string, item?: MaterialId | 'ore' | 'ingot'): number
  inspect(id: string): MachineView | undefined
  machines(kind?: MachineKind): string[]
  recipe(id: RecipeId): Recipe | undefined
  recipes(id: string): RecipeId[]
  peek(id: string): MaterialItem | undefined
  dispatch(truckId: string, fromDepot: string, toDepot: string, key: string): boolean
}
```

Inspect, recipe and peek return detached data. Processing with work(id, recipe) selects that recipe for subsequent work(id). Routing moves the FIFO head on splitter, merger, sorter, storage or depot. Use peek for quality routing. Dock automatically ships one item on pickup ticks. Events use type ('itemArrived', 'machineIdle', 'delivered', 'truckReturned'), tick, machineId and optional item, key or outcome. The host gets the previous tick's events alongside the controller to dispatch optional sandbox handlers. Persist sandbox memory back to campaign.memory.

Truck dispatch loads one unit at a local depot and targets a depot on a connected site. world.tripScript is a FIFO of 'breakdown', 'lostAck' or 'ok'. A breakdown returns cargo to its origin. A lost acknowledgement delivers cargo once. Retry with the same key for a clean acknowledgement. Receipts and in-flight cargo survive saves.

Build commands mutate the campaign in place and return failure on invalid geometry or insufficient funds. Supply a catalog price from the economy layer when placing machines or belts. Dismantling refunds the stored purchase price. Plot purchase requires an owned neighbor. Physics and construction do not impose research policy. Campaign quests describe the five workshop problems. The economy layer owns acceptance, rewards and unlocks.

## Quests and ticking

Use `advanceCampaign(campaign, onTick): void` to step physics and check the active quest. Hosts that already use `step(campaign.world, onTick)` call `updateQuests(campaign): string | undefined` after each tick. It returns the newly completed quest ID, takes a fresh baseline for the next customer and adjusts the dock pickup interval. `QUESTS` is ordered shed, balance, parts, loading, gate. `questStatus(campaign)` returns {id,state,elapsed,shipped,rate,idle,lost,coal} or undefined in free play. `restartQuest(campaign): boolean` retries the current customer's counters on the live floor. The last completion restores one pickup per tick. Purchases, code, memory, deposits, cargo and machine counters survive every transition.

## Running a shift

```ts
const live = loadSave(storedText)
const preview = cloneCampaign(live)
advanceCampaign(preview, (ctx, events) => {
  if (ctx.space('mine')) ctx.dig('mine')
  ctx.work('furnace-a')
})
```

For the worker, pass a synchronous callback that invokes the current sandbox program. The engine increments the tick, resets statuses, advances belts, calls the controller, advances freight, finishes production and samples statistics. Previous-tick events arrive in creation order. New events are in `world.lastEvents` after the step, including every arrival and dock shipment. `world.events` keeps the last 256 for display. The controller receives copies of events, machine views and queue heads. When a controller throws, earlier successful commands still take effect and the tick finishes before the caller receives the exception.

A belt path includes both machine tiles and takes one step per tick. Paths may cross. With no explicit path, the engine finds a shortest orthogonal route across owned tiles. Routed equipment can have multiple outbound belts. A miner or processor has one outbound belt. Several inbound belts can meet at a machine. When a bin fills, admission rotates between incoming belts so a busy input cannot starve its neighbor.

Recipes have a quantity per ingredient and one output per batch. A valid recipe selection on an idle processor sticks even when it lacks ingredients. A running batch or buffered output keeps its current recipe. Processing stations have separate bins for each material. Storage, sorters and depots share a FIFO capacity across materials. Recycled defects yield clean iron ore. The inherited burner takes four ticks per batch. New furnaces use the catalog time. Machine stats split elapsed ticks into active, idle and blocked, with a 240-tick rolling production rate. Quest rate is the delivery average since the customer arrived.

Machine and belt construction accepts a nonnegative integer purchase price. The economy module supplies the price and checks research before calling. Removal recovers that price once. Parcels on removed equipment count toward losses. A truck and its depots can be dismantled after the trip returns. Use the documented endpoints for mutation so spent funds, in-flight cargo and refund bookkeeping survive reload.

Every delivered event contains the actual parcel and its quality. The economy module can advance accepted orders from these events, apply prices and rewards, enable defects on sorter research and fill incident affectedOrders from its order board. The incident journal evicts the oldest closed record once it has 128 entries and retains open records. Incidents record blockage transitions, breakdowns and outstanding acknowledgements. Receipt keys are global across the save. Reusing a key for a different truck or route is rejected. Retrying a confirmed key succeeds immediately. A full destination holds the loaded truck at the roadhead until a slot opens.

A fresh game accepts null or undefined. Loading a valid version 2 save returns detached JSON state. The unversioned MVP notebook imports the selected controller as working main.ts and archives chapter controllers as named project snapshots. Unsupported versions and invalid version 2 state throw so the host can preserve the original storage entry.
