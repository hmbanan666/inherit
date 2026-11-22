# Workshop · parcel challenges

Game level. Choose any of twelve 5–15 minute challenges from Learn. Each starts with its own set of parcels. Learn shows the condition, two worked cases and the theory needed for that challenge. Inspect the labels on the floor, then write your solution in `main.ts`. Each Starter below is the whole file. Players can open hints and the API reference. The reference solutions are for pack authors.

## The parcel floor

The incoming belt (`belt`) brings parcels into the shed. The left bin (`left`) and right bin (`right`) each hold a queue. The dispatch cart (`cart`) collects outgoing parcels. Paint each code name on its station. Draw arrows for the route the current challenge needs. Counting challenges also show a scale display. The camera stays on this floor.

The arm carries one parcel at a time. It takes from the front of the belt or a bin. It adds parcels to the back of a bin or sends them to the cart. Parcels stay in the cart once dispatched. Every parcel keeps its id and label. Stations have room for the whole batch unless the challenge gives a limit.

On clock challenges, deliveries arrive before `onTick` runs. More parcels may arrive after an empty tick. An amber marker shows a jammed bin.

**Trying a solution**

- **Run** resets the floor to the challenge’s starting parcels and runs your file once.
- **Deploy** checks your setup. If it succeeds, you get a fresh floor. The clock calls your exported `onTick` function once per tick. Variables declared outside the function keep their values between ticks.
- **Stop loop** stops the clock and leaves the floor as it was at the last completed tick.
- **Run once** lets you try one tick on a copy of the paused floor. You can inspect the result and return to the paused floor.

**Checking a solution.** Run the shown input and each hidden input separately. Hidden cases follow the rules in the brief. Verify that every parcel id appears exactly once and that each destination has its parcels in the required order. Name the failed input in its check. Each clock challenge specifies how many ticks to test. The player never needs to measure elapsed time.

## Drawer API reference

Import the floor functions you need from `"inherit"`, for example `import { look } from "inherit"`. The editor also knows the types below. A parcel or inspection returned by a call is a snapshot. Changing the copy leaves the parcel on the floor where it was.

| Type | Fields and meaning |
| --- | --- |
| `Parcel` | `id: string` identifies one parcel in the batch. `colour` is `"red"` or `"blue"`. `weight: number` gives the weight in whole units. `to` is the shipping label: `"north"`, `"south"` or `"dock"`. |
| `Place` | `"belt" \| "left" \| "right" \| "cart"`. Each name matches the label on the floor. Use `display(value)` to write to the scale. |
| `Inspection` | `count: number` includes blocked parcels. `front: Parcel \| undefined` gives the first parcel, even in a jam. At the cart, it gives the first parcel dispatched. `jammed: boolean` reports a blockage. |

| Signature | What it does and parameters | Return and unsuccessful calls | Example |
| --- | --- | --- | --- |
| `take(place: Place): Parcel \| undefined` | Pick up the front parcel from the belt or a bin. | Returns a snapshot of the parcel. Returns `undefined` if the source is empty or jammed, the arm is full, or the source is the cart. A failed pickup moves nothing. | `const lifted = take("belt")` |
| `put(place: Place): boolean` | Drop the held parcel into a bin or the dispatch cart. | Returns `true` on delivery. Returns `false` if the arm is empty, the destination is jammed, or the destination is the belt. A failed drop leaves any held parcel in the arm. | `const delivered = put("left")` |
| `look(place: Place): Inspection` | Read the parcel count, front label and jam flag at a station. | Returns a fresh inspection. An empty station has a count of zero and an `undefined` front. | `const queued = look("right").count` |
| `display(value: number): void` | Write a finite number to the scale display. The scale records readings in order. | Returns no value. Invalid input leaves the display unchanged and produces a diagnostic. | `display(12)` |
| `clearJam(place: Place): boolean` | Clear the blockage at the named bin. Its front parcel stays ready for pickup. | Returns `true` if it cleared a jam and `false` if the station was clear. | `const cleared = clearJam("left")` |
| `export function onTick(): void` | Define this function in `main.ts` for a clock challenge. The clock calls it after each tick’s deliveries. It takes no arguments. | Returns no value. Deploy checks that the file exports a callable `onTick`. A failed setup leaves the current controller running. | `export function onTick() { display(look("cart").count) }` |

An unknown place or wrong argument type produces a diagnostic at the call. Show the bad value and the expected type. The editor flags these errors before Run when it can. For a diagnostic message of your own, use `console.log(value)`. For example, `console.log(look("cart").count)` writes the cart count to Console. It returns no value.

Build the reference from the signatures in `player.ts` and their JSDoc `@param`, `@returns` and `@example` tags. Show the entries each challenge uses, even on direct entry. Identify `onTick` as a function the player defines.

## Challenge briefs

Letters in the worked cases are parcel ids. A/5 means parcel A weighs 5 units. Each bullet in Checks is one row under the editor. Reset the floor and the check results for each attempt.

### `dispatch-batch` · Dispatch the waiting batch

**Condition.** Move the whole batch from the belt to the cart in one Run. Keep arrival order. Leave the arm empty and stop on the first empty pickup.

**Worked cases.** A,B,C → cart A,B,C. Empty belt → empty cart after one pickup attempt.

**Practice.** Writing a helper that tells its caller when the belt is empty.

**Learn / API.** Introduce take and put. Import the jobs from the module. A pickup returns a parcel when it succeeds, and undefined when the belt is empty. The hand stays loaded until a drop succeeds. Example: a successful pickup from the right bin leaves that bin one parcel lighter.

**Starter**

```ts
// TODO: Write a helper to lift and deliver one waiting parcel.
// TODO: Repeat successful transfers and stop at the end of the belt.
```

**Hints**

1. Use the helper's result to decide whether to continue.
2. Try one pickup per transfer. A successful drop frees the hand.

**Checks** · All ids reach the cart in order • Arm empty • One pickup attempt on an empty belt

**Reference solution sketch.** Return false from a transfer helper on an empty pickup. Otherwise return the result of dropping in the cart. Loop while the helper succeeds. The loop stops at the first empty pickup.

### `heavy-tally` · Count heavy parcels

**Condition.** Move every parcel from the belt to the cart in order. When the belt is empty, display how many weighed at least 5. The display starts blank.

**Worked cases.** A/2,B/5,C/8 → cart A,B,C and display 2. Empty belt → display 0.

**Practice.** Counting parcels that meet a weight limit, including those exactly at the limit.

**Learn / API.** Introduce display and the weight field of take's result. A weight is in whole units. The display keeps its last reading visible. Example: weights 1 and 6 contain one heavy parcel.

**Starter**

```ts
// TODO: Count the heavy labels as you unload the belt.
// TODO: Send every parcel on and print one final count.
```

**Hints**

1. Start your count before taking anything.
2. A parcel that weighs exactly 5 counts. Send lighter parcels to the cart too.

**Checks** · Boundary weight counted • All parcels dispatched in order • One final reading, including zero

**Reference solution sketch.** Initialise a count at zero. Take one parcel at a time from the belt. Add one to the count if its weight is at least 5. Drop every parcel in the cart. Display the count after the loop.

### `colour-bins` · Sort parcels by colour

**Condition.** Empty the belt. Send red parcels to the left bin and blue parcels to the right bin. Preserve arrival order within each colour.

**Worked cases.** A/red,B/blue,C/red → left A,C and right B. Two blues → empty left and both blues on the right.

**Practice.** Sorting by colour while keeping each bin in arrival order.

**Learn / API.** Use take, put and the colour field. Labels and bin swatches show the colour words. Example: a red parcel held over the blue bin still belongs on the left.

**Starter**

```ts
// TODO: Read each parcel's colour.
// TODO: Drop it in the bin marked for that colour.
```

**Hints**

1. One helper can choose a place from a colour.
2. Decide from the parcel you just lifted before making the drop.

**Checks** · Left holds reds in order • Right holds blues in order • Belt and hand empty, including monochrome input

**Reference solution sketch.** Loop over successful pickups. Have a helper return `"left"` for red or `"right"` for blue. Drop each parcel into the bin it selects.

### `route-table` · Route by shipping label

**Condition.** Route every parcel from the belt using a table. Read the `to` field on its label. Send north to the left bin, south to the right bin and dock to the cart. Keep arrivals in order at each destination.

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

**Reference solution sketch.** Build a typed table with three entries: north → left, south → right, dock → cart. Pick up each parcel from the belt. Look up its `to` field in the table and drop it at that place.

### `peak-weight` · Find the heaviest parcel

**Condition.** Move the batch from the belt to the cart. Display the heaviest weight once. Display zero for an empty belt. Weights range from 1 to 99.

**Worked cases.** A/8,B/3,C/8 → 8, cart A,B,C. Empty → 0, cart empty.

**Practice.** Tracking a maximum while handling an empty input.

**Learn / API.** Reuse take, put, display. A running maximum needs only one number. Keep the saved weight when the next parcel is lighter. Example: readings 4 then 2 still have peak 4.

**Starter**

```ts
// TODO: Keep the greatest weight seen during dispatch.
// TODO: Print the result when the batch ends.
```

**Hints**

1. Give an empty batch a defined starting maximum.
2. Update the maximum only when the new weight is greater.

**Checks** · Descending inputs keep the first maximum • Ties dispatch both ids • Empty belt displays zero • One reading after dispatch

**Reference solution sketch.** Start peak at zero. If the parcel is heavier than the saved peak, save its weight. Send the parcel to the cart either way. Display peak once at the end.

### `fragile-head` · Inspect before lifting

**Condition.** Read the label at the front of the belt. Dispatch parcels weighing 3 or less until you reach a heavier parcel or the belt is empty. Leave the heavier parcel and everything behind it on the belt. Every pickup must succeed.

**Worked cases.** A/1,B/3,C/4,D/2 → cart A,B and belt C,D. Empty belt → no arm movement.

**Practice.** Checking whether a parcel is there before trying to lift it.

**Learn / API.** Introduce look. Its front can be undefined when a station is empty. Inspection reads a label without gripping it. For example, reading a weight of 7 leaves that parcel at the front of the belt.

**Starter**

```ts
// TODO: Inspect the next parcel before touching the belt.
// TODO: Send light parcels to the cart and stop before the first heavy one.
```

**Hints**

1. Read front again after each delivery.
2. Test for absence before reading the weight.

**Checks** · Leading light parcels reach cart • First heavy parcel and those behind it stay on belt • Empty input has no pickup attempts

**Reference solution sketch.** Read the front in a loop. Stop if the belt is empty or the parcel weighs more than 3. Otherwise move it from the belt to the cart. Repeat with a fresh inspection.

### `merge-bins` · Merge two sorted bins

**Condition.** Both bins start sorted by increasing weight. Merge them into the cart in weight order. When two parcels weigh the same, take from the left bin first. Pick up each parcel once.

**Worked cases.** Left A/2,C/6 and right B/2,D/4 → A,B,D,C. Empty left and right E/1 → E.

**Practice.** Choosing between two queues when their front parcels tie or one queue is empty.

**Learn / API.** Reuse look, take and put. Read the first label in each bin before picking up a parcel. If only the right bin has a parcel, take from there.

**Starter**

```ts
// TODO: Read the front label of each bin.
// TODO: Choose which bin to unload next, even if one bin is empty.
```

**Hints**

1. Stop when both bins are empty.
2. For a tie, choose the left bin. If one bin is empty, use the other.

**Checks** · Cart sorted by weight • Equal heads favour left • Empty sides drain cleanly • One pickup per parcel

**Reference solution sketch.** Inspect both fronts. If neither exists, finish. If one bin is empty, take from the other. If both have parcels, choose the lighter one. On a tie, choose left. Move that parcel to the cart and check both bins again.

### `bin-dispatch` · Dispatch from the right bin

**Condition.** The cart takes deliveries from the right bin. Empty that bin into the cart first. Then move each incoming parcel from the belt to the right bin and from there to the cart.

**Worked cases.** P in the right bin, A and B on the belt → cart P,A,B. Both A and B pass through the right bin. Empty right bin and C on the belt → C goes to the right bin, then to the cart.

**Practice.** Designing a reusable move helper for a two-stage route.

**Learn / API.** Reuse look, take and put. The arrows show the route: belt → right bin → cart. A drop into the right bin records a visit. A parcel already waiting in that bin is ready to ship.

**Starter**

```ts
// TODO: Write a transfer helper with named source and destination.
// TODO: Dispatch the waiting batch first. Route each new parcel through the right bin.
```

**Hints**

1. Read the arrows at the two pickup points.
2. Draw the two trips for one incoming parcel before writing the loop.

**Checks** · Parcels waiting in the right bin leave first • Each incoming parcel visits the right bin • Only the right bin supplies the cart • Arm and queues end empty

**Reference solution sketch.** Write a helper that picks up from one place and drops at another. Use it to empty the right bin into the cart. Then move one parcel from the belt to the right bin. Move that parcel to the cart before taking the next one.

### `first-clock` · Dispatch on the clock

**Condition.** Deploy a controller. Watch the belt for six ticks. If a parcel is waiting, move one to the cart. Leave the arm still during setup and on empty ticks.

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
// TODO: On each tick, check the belt and dispatch at most one parcel.
```

**Hints**

1. Top-level work happens only at setup.
2. Put one guarded transfer in the exported clock function.

**Checks** · No setup transfers • Each arrival dispatched on its first available tick • Empty ticks leave the arm still • Six ticks conserve every id

**Reference solution sketch.** Export onTick with no parameters. Read the front of the belt. If a parcel is waiting, move it to the cart. Leave the function after that one transfer. The runner supplies the repetition.

### `clear-outlet` · Clear a blocked outlet

**Condition.** Empty the left bin into the cart in four ticks. If the bin is jammed, spend the tick clearing it. Otherwise, ship one waiting parcel. The bin starts with at most two parcels and may jam on up to two ticks.

**Worked cases.** A,B and obstruction before tick 2 → ship A, clear, ship B, idle. No jam and no parcels → four quiet ticks.

**Practice.** Giving jam recovery its own turn in a controller.

**Learn / API.** Read the jam flag with `look("left").jammed`. The `clearJam` function frees the bin. Its front parcel stays in place until the next tick. Review the Run/Deploy/Stop strip on entry. Example: a jam before the first pickup leaves the cart empty until the next tick.

**Starter**

```ts
// TODO: Inspect the outlet every tick.
// TODO: Handle a jam or ship a waiting parcel according to that reading.
```

**Hints**

1. Give jam recovery its own branch.
2. Return after clearing so the parcel waits for the next tick.

**Checks** · Only real jams cleared • No transfer on recovery ticks • Parcel order survives • Healthy empty ticks stay quiet

**Reference solution sketch.** Inspect the left bin in `onTick`. If the bin is jammed, clear it and return. Otherwise, move its front parcel to the cart if one is waiting. Check each tick against the jam schedule.

### `alternate-bins` · Give both bins a turn

**Condition.** Over six ticks, send one parcel to the cart whenever either bin has one. Start with the left bin. After each delivery, give the other bin the next turn. If the preferred bin is empty, use the other one. An empty tick keeps the preference.

**Worked cases.** Left A,C and right B,D → cart A,B,C,D. Only right B at tick 1, empty tick 2, both sides receive at tick 3 → serve the new left head first.

**Practice.** Maintaining fair service with state between ticks.

**Learn / API.** Reuse look, take, put and onTick. Declare a variable outside `onTick` with `let` to remember a bin between ticks. A variable declared inside the function starts fresh each tick. Review the three clock frames on direct entry.

**Starter**

```ts
// TODO: Remember which bin gets the next turn.
// TODO: Choose a bin with a parcel and update the preference after delivery.
```

**Hints**

1. Change preference after a delivery.
2. Give the next turn to the bin that did not supply this parcel.

**Checks** · Two busy bins alternate • A single busy bin drains • Empty ticks preserve preference • At most one delivery per tick

**Reference solution sketch.** Start with `"left"` as the preferred bin. Each tick, look there first. If it is empty, check the other bin. If both are empty, return. Move the chosen parcel to the cart. Give the other bin the next turn.

### `relay-controller` · Run a two-stage relay

**Condition.** Move each parcel from the belt to the right bin, then to the cart. Make at most one transfer per tick. Empty the right bin before adding another parcel. Finish by tick 8. All parcels arrive by tick 3. In a batch of four, the first parcel arrives on tick 1.

**Worked cases.** A and B on the belt at tick 1 → A to right bin, A to cart, B to right bin, B to cart. Only C on tick 3 → two idle ticks, then C to right bin and C to cart.

**Practice.** Designing a small state machine that survives gaps in supply.

**Learn / API.** Reuse look, take, put and onTick. A controller can keep an explicit phase such as waiting or dispatching. A successful transfer changes phase. An empty belt leaves the waiting phase intact. Review Run/Deploy/Stop before deploying.

**Starter**

```ts
// TODO: Represent which station needs service next.
// TODO: Advance the relay one successful move at a time and handle gaps.
```

**Hints**

1. The right bin starts empty. Which trip brings a parcel to it?
2. Switch phase only after the transfer finishes.

**Checks** · One transfer maximum each tick • At most one parcel waits in the right bin • Every parcel visits the right bin before the cart • Gaps and burst arrivals preserve order

**Reference solution sketch.** Keep the current phase outside the handler. Wait until a parcel arrives on the belt. Move it to the right bin and switch to dispatch. On the next tick, send it to the cart and switch back to waiting. A solution can also choose its next move by checking the right bin.

## Remove the v5 chapter

Paths below start at `packages/sim/src/packs/workshop/` unless they name another directory. Before deleting a shared file, check its imports, re-exports and both Vue tag spellings. Use the shared PackStudio, QuickJS bridge, clock and per-pack save. The archive reader must be able to open old code after the campaign is removed.

| Delete or replace | Exact content to retire and replacement boundary |
| --- | --- |
| `chapter.ts`, `lesson-flow.ts`, `starter.ts`, `request-checks.ts`, `story.ts`, `surface.ts`, `reference/chapter-one.ts` | Remove Bram-to-Mayor request chain, paid orders, lessons that rewrite ship, earned sections, queued reveals, license and bridge/deed finish. Replace fixtures, starters, conditions, checks and references with the twelve briefs above. |
| `campaign.ts`, `campaign-api.ts`, `town.ts`, `town-view.ts`, `panels.ts`, `prices.ts`, `catalog.ts`, `construction.ts`, `blueprints.ts` | Remove coins, wallet, prices, purchases, debt/installments, bank book, letters, inbox, town, districts, customers, orders and all building/upgrade progression. Remove the mine, furnace and press from the floor, along with the extra machines, cutter and assembler. Delete sites, plots, roads, deposits and ore/ingot/plate/wire/gear/bracket recipes. Draw a parcel belt, two bins and a dispatch cart. |
| `game.ts`, `model.ts`, `production.ts`, `transport.ts`, `primitives.ts`, `declarations.ts`, `player.ts` | Remove chapter stock, iron/copper/coal types, heat, machine wear, trips, receipts, research and low-level build surface. Replace material inspection and hand shape with Parcel, Inspection and the API above. Remove buy, repair, replyLater and payBalance. Represent jams only in fixtures that need them. |
| `Studio.vue`, `WorldView.vue`, `pack.ts`, `manifest.ts`, `cover.svg` | Remove custom studio and chapter adapter, Shed/Town/Inbox/Orders navigation, wallet pop, debt chip/bank menu, letters/toasts, unread/new badges, story speech, clock note, history/restore menu, library and machine counter. Use the standard studio, challenge metadata, pack-local shed drawing and new cover. Keep secondary Run once. |
| `save.ts`, `persistence.ts` and the standalone v4 importer | Replace playable chapter restore with a read-only archival path for code/bytes. Remove import-to-live-campaign after migrating its callers. Do not require town tables, simulate payments or deploy old code to read an archive. |
| Browser and test callers | Remove old section, economic, chapter reference and reveal expectations in pack tests, sim barrel/tests and e2e. Retire the custom Workshop branches in app.vue, useGame and runner.worker after moving shared execution/playback and archival readers. Remove MyLibrary, town-only views and bank panels after tracing callers. Keep shared visual parts used by Beginner. Replace Workshop validation and playthrough with every starter, reference, edge fixture, direct clock entry and archive recovery. |

Save the challenge id and the player’s code on completion. Players can choose any challenge from the start. Each one opens with its own starting parcels.
