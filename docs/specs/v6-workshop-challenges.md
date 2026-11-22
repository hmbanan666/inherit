# Workshop · parcel challenges

Game level. Choose any of twelve 5–15 minute challenges from Learn. All start from a clean fixture. Read the condition and two worked cases, inspect the parcel labels on the floor, then write main.ts. Code fences labelled Starter are the entire file. Reference sketches are for authors and validators. Only the hints and API entries go to the player. Direct entry includes the brief and the theory for every API the challenge uses.

## The shed floor

Reuse the mine mouth as the incoming belt (`"mine"`), the open furnace bay as the left bin (`"furnace"`), the press bay as the right bin (`"press"`), and the cart as dispatch (`"cart"`). Paint these exact code names beside the stations, with arrows and plain labels **In**, **Left**, **Right**, **Out**. The furnace is cold and the press is parked. Parcels keep their identity and labels through every transfer. The only extra prop is a numeric scale display on counting challenges. The camera stays on the shed.

The arm holds one parcel. A bin accepts parcels at the back and presents the front. The cart is a sink. Station capacities suffice for the fixture unless its brief says otherwise. A tick's deliveries arrive before its handler runs. An empty infeed can receive a later delivery. Blocked outlets carry an amber jam marker. For all variants, preserve every id exactly once. Compare ordered ids at named destinations, not just quantities. Grade the displayed fixture and fresh variants with separate runner instances. Report which input failed. Hidden inputs vary the data within the published rules. Show counts or a terminal tick so a program can finish without a wall-clock race.

**Trying a solution.** A manual Run starts the fixture and executes the file once. Deploy starts a fresh fixture after valid setup and calls the exported handler on each tick. Top-level variables survive between those calls. Stop freezes the last committed floor. Run once in a clock challenge executes one handler against a disposable copy of the paused state for diagnosis. A new tested deployment begins from the fixture. Each timed condition below specifies its tick bound. No solution depends on a timer in player code.

## Drawer API reference

On a manual challenge, import the jobs you use from `"inherit"`, for example `import { look } from "inherit"`. Type names are available in the editor's declarations for annotations. Returning a parcel or inspection gives a detached reading. Moving a parcel takes a floor call. Use ordinary TypeScript for helpers, comparisons, arrays and tables.

| Type | Fields and meaning |
| --- | --- |
| `Parcel` | `id: string` unique in the fixture, `colour: "red" \| "blue"`, `weight: number` in whole units, `to: "north" \| "south" \| "dock"` from the shipping label. |
| `Place` | One of `"mine" \| "furnace" \| "press" \| "cart"`. Each station displays its code name. The display takes numbers and is separate from Place. |
| `Inspection` | `count: number` including blocked parcels, `front: Parcel \| undefined` visible front label (including in a jam), `jammed: boolean`. The cart reports its first dispatched parcel for inspection. |

| Signature | What it does and parameters | Return and unsuccessful calls | Example |
| --- | --- | --- | --- |
| `take(place: Place): Parcel \| undefined` | Lift the front parcel at the named source into an empty hand. | A reading of that parcel. An empty source, jam, occupied hand or pickup at the cart returns undefined and leaves things in place. | `const lifted = take("press")` |
| `put(place: Place): boolean` | Set the held parcel at the end of the named bin or cart. | True on delivery. An empty hand, jammed destination or attempt to feed the mine returns false. A rejected delivery leaves the parcel held. | `const delivered = put("furnace")` |
| `look(place: Place): Inspection` | Read the named station at this instant, including its count, first label and jam flag. | A fresh inspection. At an empty station count is zero and front is undefined. | `const queued = look("press").count` |
| `display(value: number): void` | Write a finite numeric value to the scale's display. The scale records its readings in order. | No returned value. A non-finite or nonnumeric value gives a diagnostic without changing the display. | `display(12)` |
| `clearJam(place: Place): boolean` | Release the marked obstruction at the named bin. Its front parcel stays there, ready for pickup. | True if a jam cleared. A clear station returns false. | `const cleared = clearJam("furnace")` |
| `export function onTick(): void` | Define this in main.ts for a clock challenge. Export makes it visible to the clock. It receives no parameters. Each tick calls it once after arrivals. | No returned value. A missing or non-callable export rejects Deploy with a diagnostic. Setup is validated before replacing a running controller. | `export function onTick() { display(look("cart").count) }` |

All calls with an unknown place or wrong argument type report the expected type and the bad value at the call site. The type checker catches these before Run where possible. Each challenge includes the reference entries its fixture needs. A standalone challenge that reuses an entry includes its Learn explanation on direct entry. Implement the table from player.ts signatures and JSDoc with @param, @returns and @example. Show the handler as a callback defined by the player. Console output, available as a language service, uses `console.log(value)` to append a diagnostic reading to Console and returns void, e.g. `console.log(look("cart").count)`.

## Challenge briefs

In the cases below, letters are parcel ids. Other label fields can vary unless the condition needs them. A notation such as A/5 gives an id and weight. A check separated by a bullet is one compact check row. Retried fixture runs discard earlier evidence.

### `dispatch-batch` · Dispatch the waiting batch

**Condition.** Empty the finite infeed into the cart during one Run. Keep arrival order. Leave the arm empty and stop on the first empty pickup.

**Worked cases.** A,B,C → cart A,B,C. Empty belt → empty cart and one unsuccessful probe.

**Practice.** Writing a transfer helper and terminating on exhaustion.

**Learn / API.** Introduce take and put. Import the jobs from the module. A pickup returns a parcel when it succeeds, and undefined when the belt is empty. The hand stays loaded until a drop succeeds. Example: a successful pickup from the right bin leaves that bin one parcel lighter.

**Starter**

```ts
// TODO: Write a helper to lift and deliver one waiting parcel.
// TODO: Repeat successful transfers and stop at the end of the belt.
```

**Hints**

1. Use the helper's result to decide whether to continue.
2. Try one pickup per transfer. A successful drop frees the hand.

**Checks** · All ids reach the cart in order • Arm empty • Empty belt stops after one probe

**Reference solution sketch.** Return false from a transfer helper on an empty pickup. Otherwise return the result of dropping in the cart. Loop while the helper succeeds. The final unsuccessful pickup terminates the loop.

### `heavy-tally` · Count heavy parcels

**Condition.** Dispatch every parcel in order and write a single final reading for parcels weighing at least 5. The display starts blank.

**Worked cases.** A/2,B/5,C/8 → cart A,B,C and display 2. Empty belt → display 0.

**Practice.** Accumulating a filtered count with an inclusive boundary.

**Learn / API.** Introduce display and the weight field of take's result. A weight is in whole units. The display keeps its last reading visible. Example: weights 1 and 6 contain one heavy parcel.

**Starter**

```ts
// TODO: Count the heavy labels as you unload the belt.
// TODO: Send every parcel on and print one final count.
```

**Hints**

1. Start your count before taking anything.
2. Compare each lifted weight to the inclusive limit, then dispatch it.

**Checks** · Boundary weight counted • All parcels dispatched in order • One final reading, including zero

**Reference solution sketch.** Initialise a count at zero. Pick up until empty, increment for weight >= 5 and drop each parcel into the cart. Display the count after the loop.

### `colour-bins` · Sort parcels by colour

**Condition.** Empty the infeed. Reds belong in the left bin, blues in the right. Preserve arrival order within each colour.

**Worked cases.** A/red,B/blue,C/red → left A,C and right B. Two blues → empty left and both blues on the right.

**Practice.** Stable partitioning by a discriminating field.

**Learn / API.** Use take, put and the colour field. Labels and bin swatches show the colour words. Example: a red parcel held over the blue bay still belongs on the left.

**Starter**

```ts
// TODO: Read each parcel's colour.
// TODO: Choose its marked bay and keep that bay in arrival order.
```

**Hints**

1. One helper can choose a place from a colour.
2. Decide from the parcel you just lifted before making the drop.

**Checks** · Left holds reds in order • Right holds blues in order • Belt and hand empty, including monochrome input

**Reference solution sketch.** Loop over successful pickups. Give a destination helper the parcel colour, choose furnace for red and press for blue, and put there exactly once.

### `route-table` · Route by shipping label

**Condition.** Create a destination table keyed by the parcel’s to label. North goes left, south goes right, dock goes to the cart. Keep each route in order regardless of colour.

**Worked cases.** Blue A/north and red B/south → left A, right B. A/dock,B/dock → cart A,B.

**Practice.** Using a typed lookup table when appearance is misleading.

**Learn / API.** Use take and put. `Record<K, V>` describes a table with keys K and values V. `Parcel["to"]` names the type of the to field. `Record<Parcel["to"], Place>` checks all destinations. Example: a `Record<"day" | "night", number>` needs day and night entries.

**Starter**

```ts
// TODO: Build a typed route table for the shipping labels.
// TODO: Use the label on each lifted parcel to dispatch it.
```

**Hints**

1. Write down all the allowed destination words.
2. Look up the current destination and pass the resulting place to the arm.

**Checks** · Table covers every destination • Crossed colours follow labels • Each route keeps arrival order

**Reference solution sketch.** Define a typed object mapping north to furnace, south to press and dock to cart. For each successful pickup, index the table with its to field and drop at the returned place.

### `peak-weight` · Find the heaviest parcel

**Condition.** Dispatch the whole batch and display its greatest weight once, using zero for an empty belt. Weights range from 1 to 99.

**Worked cases.** A/8,B/3,C/8 → 8, cart A,B,C. Empty → 0, cart empty.

**Practice.** Tracking a maximum while handling an empty input.

**Learn / API.** Reuse take, put, display. A running maximum needs only one number. A later smaller observation leaves it unchanged. Example: readings 4 then 2 still have peak 4.

**Starter**

```ts
// TODO: Keep the greatest weight seen during dispatch.
// TODO: Print the result when the batch ends.
```

**Hints**

1. Give an empty batch a defined starting maximum.
2. Update the maximum only when the new weight is greater.

**Checks** · Descending inputs keep the first maximum • Ties dispatch both ids • Empty belt displays zero • One reading after dispatch

**Reference solution sketch.** Start peak at zero. On each pickup compare its weight with peak, replace the larger-so-far value as needed and put the parcel in the cart. Display peak once at the end.

### `fragile-head` · Inspect before lifting

**Condition.** Move the leading run of parcels weighing at most 3 into the cart. Leave the first heavier parcel and everything behind it untouched. Make no unsuccessful pickup.

**Worked cases.** A/1,B/3,C/4,D/2 → cart A,B and belt C,D. Empty belt → no arm movement.

**Practice.** Checking an optional front item without consuming it.

**Learn / API.** Introduce look. Its front can be undefined when a station is empty. Inspection reads a label without gripping it. Example: a front weight of 7 is still at the station after inspection.

**Starter**

```ts
// TODO: Inspect the next parcel before touching the belt.
// TODO: Dispatch the safe prefix and stop at the first boundary.
```

**Hints**

1. Read front again after each delivery.
2. Test for absence before reading the weight.

**Checks** · Safe prefix reaches cart • First heavy and suffix stay in place • Empty input has no pickup attempts

**Reference solution sketch.** Read the front in a loop. Break when absent or heavier than 3. Otherwise take from the mine and put into the cart. Repeat with a fresh inspection.

### `merge-bays` · Merge two sorted bays

**Condition.** Both bins start sorted by increasing weight. Merge them into the cart in weight order. On equal weights, take the left head first. Touch each parcel once.

**Worked cases.** Left A/2,C/6 and right B/2,D/4 → A,B,D,C. Empty left and right E/1 → E.

**Practice.** Comparing optional heads and resolving ties stably.

**Learn / API.** Reuse look, take and put. Compare the available fronts before picking a side. The hand cannot hold both candidates. Example: a sole remaining right parcel is the next one regardless of weight.

**Starter**

```ts
// TODO: Compare the two waiting heads.
// TODO: Choose the next bay, including ties and a missing head.
```

**Hints**

1. Stop when both bays are empty.
2. Prefer the left for equal weights and drain the surviving side.

**Checks** · Cart sorted by weight • Equal heads favour left • Empty sides drain cleanly • One pickup per parcel

**Reference solution sketch.** Inspect both fronts. If neither exists, finish. Choose left if it exists and the right is absent or at least as heavy. Otherwise choose right. Transfer that head to the cart and inspect again.

### `stamp-dispatch` · Dispatch from the final station

**Condition.** Every parcel must visit the press bay before reaching the cart. The press begins with its own waiting batch. Dispatch that batch first, then route the incoming parcels through the press. No direct mine-to-cart trips.

**Worked cases.** Press P and mine A,B → cart P,A,B with A and B visiting press. Press empty and mine C → cart C after its press visit.

**Practice.** Designing a reusable move helper for a two-stage route.

**Learn / API.** Reuse look, take and put. The press exit has an Out to cart arrow and the infeed points to the press. Every drop into the press records a station visit. Example: a parcel already in the press is ready for dispatch.

**Starter**

```ts
// TODO: Write a transfer helper with named source and destination.
// TODO: Dispatch the waiting press batch, then pass incoming parcels through that station.
```

**Hints**

1. Read the arrows at the two pickup points.
2. Draw the two trips for one incoming parcel before writing the loop.

**Checks** · Waiting press batch leaves first • Every incoming id visits the press • Cart receives from the press only • Arm and queues end empty

**Reference solution sketch.** Write move(from, to) to pick up and drop on success. Drain the initial press queue to cart. While moving mine to press succeeds, move the just-arrived parcel from press to cart.


### `first-clock` · Dispatch on the clock

**Condition.** Deploy a controller. On each of six ticks dispatch at most one waiting parcel, including arrivals after an empty tick. No moves during setup or on empty ticks.

**Worked cases.** Ticks 1:A, 3:B,C → cart counts 1,1,2,3,3,3. First arrival on tick 6 → five quiet ticks then one delivery.

**Practice.** Separating setup, repeated work and idle ticks.

**Learn / API.** Introduce onTick and Deploy. Open Learn before enabling Deploy, including on direct selection. Frame 1 — Run executes your file once. Frame 2 — Deploy runs setup once, then the clock calls your exported onTick again and again. Frame 3 — Stop ends the loop. export makes a function visible outside its file. A controller with an empty body leaves the arm still while the onTick #n counter increases. Pause holds the current moment, and 1×/2×/4× change viewing speed. Run once tries one tick.

**Theory card · Who calls my function?**

Run reads your file once, from the first line to the last.<br>
Deploy reads it once to set things up. Then the floor clock calls the function named onTick once each tick.<br>
Writing export lets the clock find your function. Lines inside its braces run again on each call.<br>
Watch onTick #1 become #2. Stop loop ends those calls.

```ts
export function onTick() {
  console.log("Another tick")
}
```

**Starter**

```ts
// TODO: Write the function the floor clock calls.
// TODO: On each visit, inspect the infeed and dispatch at most one waiting parcel.
```

**Hints**

1. Top-level work happens only at setup.
2. Put one guarded transfer in the exported clock function.

**Checks** · No setup transfers • Each arrival dispatched on its first available tick • Empty ticks leave the arm still • Six ticks conserve every id

**Reference solution sketch.** Export onTick with no parameters. Read the mine front. If present, take it and put it in the cart. Leave the function after that one transfer. The runner supplies the repetition.

### `clear-outlet` · Clear a blocked outlet

**Condition.** Over four ticks drain the left bin to the cart, one parcel per working tick. On a jammed tick clear the jam as the only action. Never clear a healthy outlet. Up to two parcels and two jam ticks.

**Worked cases.** A,B and obstruction before tick 2 → ship A, clear, ship B, idle. No jam and no parcels → four quiet ticks.

**Practice.** Recovering from a reported fault without disturbing good work.

**Learn / API.** Introduce clearJam and Inspection.jammed. It frees the outlet and leaves the parcel at the head. A cleared parcel can wait for the next tick. Review the Run/Deploy/Stop strip on entry. Example: a jam before the first pickup leaves the cart empty until the next tick.

**Starter**

```ts
// TODO: Inspect the outlet every tick.
// TODO: Handle a jam or ship a waiting parcel according to that reading.
```

**Hints**

1. Give jam recovery its own branch.
2. Return after clearing so the parcel waits for the next tick.

**Checks** · Only real jams cleared • No transfer on recovery ticks • Parcel order survives • Healthy empty ticks stay quiet

**Reference solution sketch.** In onTick inspect furnace. If jammed, clear it and return. If a front exists, transfer it to the cart. Use the fixture schedule to assert individual tick actions, including repeated obstructions.

### `alternate-bays` · Give both bays a turn

**Condition.** Serve one parcel per tick over six ticks. Prefer left initially. After a delivery prefer the opposite of the side just served. Fall back to the available side when needed. Keep the preference across empty ticks.

**Worked cases.** Left A,C and right B,D → cart A,B,C,D. Only right B at tick 1, empty tick 2, both sides receive at tick 3 → serve the new left head first.

**Practice.** Maintaining fair service with state between ticks.

**Learn / API.** Reuse look, take, put and onTick. A let declared outside onTick belongs to this deployment and keeps its value until the next call. A local created inside is new each tick. Review the three clock frames on direct entry.

**Starter**

```ts
// TODO: Keep the next preferred bay between ticks.
// TODO: Serve whichever eligible bay has its turn, then update the preference.
```

**Hints**

1. Change preference after a delivery.
2. Base tomorrow's preferred side on the side that actually supplied the parcel.

**Checks** · Two busy bays alternate • A single busy bay drains • Empty ticks preserve preference • At most one delivery per tick

**Reference solution sketch.** Set preferred to furnace during setup. In onTick inspect it, then its opposite if empty. Return if neither has a front. Move once from the selected side, then set preferred to the other side of that actual source.

### `relay-controller` · Run a two-stage relay

**Condition.** Move each incoming parcel through the press into the cart using at most one transfer per tick. The press holds at most one waiting parcel by condition. Dispatch a waiting press parcel before admitting another. Observe eight ticks. The first parcel is waiting on tick 1 in a four-parcel batch. Its next three arrive by tick 3. Smaller batches arrive by tick 3. Every tested batch can finish by tick 8.

**Worked cases.** Mine A,B at tick 1 → admit A, ship A, admit B, ship B. Only C on tick 3 → two idle ticks, then admit C and ship C.

**Practice.** Designing a small state machine that survives gaps in supply.

**Learn / API.** Reuse look, take, put and onTick. A controller can keep an explicit phase such as waiting or dispatching. A successful transfer changes phase. An empty belt leaves the waiting phase intact. Review Run/Deploy/Stop before deploying.

**Starter**

```ts
// TODO: Represent which station needs service next.
// TODO: Advance the relay one successful move at a time and handle gaps.
```

**Hints**

1. The press starts empty, so the first possible move is admission.
2. Switch phase only after the transfer finishes.

**Checks** · One transfer maximum each tick • Press occupancy never exceeds one • Every id visits the press before cart • Gaps and burst arrivals preserve order

**Reference solution sketch.** Keep a phase outside the handler. While waiting, if the mine has a parcel move it to press and switch to dispatch. On the next tick move press to cart and switch back. Verify transitions on every tick. An equivalent controller may derive the phase from the observable press occupancy.


## Remove the v5 chapter

The paths below are implementation scope relative to `packages/sim/src/packs/workshop/` unless qualified. Trace imports, barrel exports and both Vue tag spellings before deleting a shared file. The new pack uses the generic PackStudio, QuickJS bridge, clock and per-id save. Preserve archival decoding independently of playable campaign dependencies.

| Delete or replace | Exact content to retire and replacement boundary |
| --- | --- |
| `chapter.ts`, `lesson-flow.ts`, `starter.ts`, `request-checks.ts`, `story.ts`, `surface.ts`, `reference/chapter-one.ts` | Remove Bram-to-Mayor request chain, paid orders, lessons that rewrite ship, earned sections, queued reveals, license and bridge/deed finish. Replace fixtures, starters, conditions, checks and references with the twelve briefs above. |
| `campaign.ts`, `campaign-api.ts`, `town.ts`, `town-view.ts`, `panels.ts`, `prices.ts`, `catalog.ts`, `construction.ts`, `blueprints.ts` | Remove coins, wallet, prices, purchases, debt/installments, bank book, letters, inbox, town, districts, customers, orders and all building/upgrade progression. Remove sites, plots, roads, deposits, additional furnaces, cutter, assembler and ore/ingot/plate/wire/gear/bracket recipes. The four labelled stations operate on unchanged parcels. |
| `game.ts`, `model.ts`, `production.ts`, `transport.ts`, `primitives.ts`, `declarations.ts`, `player.ts` | Remove chapter stock, iron/copper/coal types, heat, machine wear, trips, receipts, research and low-level build surface. Replace material inspection and hand shape with Parcel, Inspection and the API above. Remove buy, repair, replyLater and payBalance. Represent jams only in fixtures that need them. |
| `Studio.vue`, `WorldView.vue`, `pack.ts`, `manifest.ts`, `cover.svg` | Remove custom studio and chapter adapter, Shed/Town/Inbox/Orders navigation, wallet pop, debt chip/bank menu, letters/toasts, unread/new badges, story speech, clock note, history/restore menu, library and machine counter. Use the standard studio, challenge metadata, pack-local shed drawing and new cover. Keep secondary Run once. |
| `save.ts`, `persistence.ts` and the standalone v4 importer | Replace playable chapter restore with a read-only archival path for code/bytes. Remove import-to-live-campaign after migrating its callers. Do not require town tables, simulate payments or deploy old code to read an archive. |
| Browser and test callers | Remove old section, economic, chapter reference and reveal expectations in pack tests, sim barrel/tests and e2e. Retire the custom Workshop branches in app.vue, useGame and runner.worker after moving shared execution/playback and archival readers. Remove MyLibrary, town-only views and bank panels after tracing callers. Keep shared visual parts used by Beginner. Replace Workshop validation and playthrough with every starter, reference, edge fixture, direct clock entry and archive recovery. |

A completed challenge records its id and code. It pays nothing, changes no other fixture, opens no extra place and unlocks no challenge. The floor after selection always comes from that challenge’s input.
