# Kettlewick Works progression audit · 24 November 2026

## 1. Current progression

Kettlewick’s eight quests consume **90 ingots and 14 steel**, all made in one furnace. Harrow, Tomas, and Pell take 72 of those ingots in three consecutive jobs. Their survey, mill wheel, and barrel hinges all accept the same production program. Wen’s listed finale returns to steel.

### What each hand-over buys

Rows follow the default offer order. Earned credits exclude the starting 300. Purse assumes no purchases. The depot fills the open order from stock each tick. Hand over pays once all checks pass. Players can choose among eligible requests. Below, `quests.ts` means `packages/sim/src/v8/quests.ts`. See `packages/sim/src/v8/modules/orders.ts:24–36`, `quests.ts:285–314,333–380`, `apps/web/app/components/FactoryFrame.vue:140–155`.

| Giver · minimum level | Delivery and additional checks | Unlock | Pay credits / XP | Earned / purse | Total XP → level | Source |
|---|---|---|---:|---:|---:|---|
| Bram · 1 | 2 ingots. Shipping also satisfies the ore and smelt checks. | Run on hand-over | 80 / 20 | 80 / 380 | 20 → 2 | `quests.ts:71–85` |
| Ines · 2 | 16 ingots. Same checks as Bram. On this route the player has buttons and Run for all 16. | Loop and `onTick` on hand-over. Turns Loop on if newly granted. | 90 / 20 | 170 / 470 | 40 → 3 | `quests.ts:89–104,359–366` |
| Mayor Odile · 2 | 4 steel. Shipping satisfies the coal and alloy checks. | `furnace.alloy()` on Take. Drone-2 at depot on hand-over, with drone-1’s capacity. | 100 / 20 | 270 / 570 | 60 → 3 | `quests.ts:107–123,230–255` |
| Elsie · 3 + drone-2 | 6 steel. Drone-2 must be off the depot **at hand-over**. Also have 2 ore and 1 coal together, or make steel since Take. Parking drone-2 one cell away satisfies its entire check. | `on(event, fn)` on hand-over | 140 / 25 | 410 / 710 | 85 → 4 | `quests.ts:126–146` |
| Harrow · 4 | 60 ingots. Both checks read the same shipped count. Any ore vein and manual Runs work. | `prospect()` on Take reveals C when called | 80 / 0 | 490 / 790 | 85 → 4 | `quests.ts:149–163`, `packages/sim/src/v8/modules/mining.ts:398–403` |
| Tomas · 4 | 8 ingots delivered and at least 1 newly smelted since Take | None | 100 / 25 | 590 / 890 | 110 → 5 | `quests.ts:166–180` |
| Pell · 5 | 4 ingots delivered and at least 4 newly smelted since Take | None | 80 / 25 | 670 / 970 | 135 → 6 | `quests.ts:183–197` |
| Wen · 6 | 4 steel and at most 4 calls to `findPath` across the latest 8 ticks. Eight idle ticks satisfy the path check. | None. Take sets CPU to 8, or 18 with the upgrade. | 120 / 30 | 790 / 1,090 | 165 → 7 | `quests.ts:200–217`, `packages/sim/src/v8/core/world.ts:282–285` |

**Levels.** At 0 XP, L1 offers Bram. At 20, L2 offers both Ines and Odile. At 40, L3 offers Elsie subject to the drone gift. At 65, L4 offers Harrow and Tomas. At 90, L5 offers Pell. At 115, L6 offers Wen. At 145, L7 opens nothing. There is no further threshold. Nick earned 165 XP by completing everything, 20 above the final threshold. Even six hand-overs suffice via Bram → Odile → Elsie → Tomas → Pell → Wen (145 XP). Taking Odile before Ines already makes Loop available because trigger and function grants also check list position. Drone-2 specifically requires cleared Odile or a legacy purchase. See `quests.ts:55–65,230–233,263–269,296–302,383–406`.

**Credits.** The initial 300 buys either the cart (240, +2 cargo per drone) or the hopper (280, capacity 6/3 → 12/6 ore/coal). Bram and Ines still leave a saver short of their combined 520. After Odile both fit, with 50 left. After Elsie all four are individually affordable, including the hotter furnace (580, batches 4 → 2 ticks) and CPU +10 (700). Harrow opens no new combination. Tomas makes furnace + cart or hopper affordable. Pell makes CPU + cart affordable, Wen CPU + hopper. The catalog costs 1,800 and the cheapest three cost 1,100. **Harrow, Tomas, and Pell add 260 credits without introducing another use for a machine.** Nick’s 810 equals 300 + 790 − 280, consistent with buying the hopper alone on a fresh save. He could buy either premium upgrade outright by the end. See `quests.ts:221–225,352–380`, `packages/sim/src/v8/sites/kettlewick.ts:18–24`.

**The floor.** The 16 × 6 map starts with a capacity-3 drone, depot (1,1), and furnace (2,1). A (6,2) yields 1 ore per 5 digging ticks, B (14,2) yields 1 coal per 5, D (8,3) yields 1 ore per 2, and hidden C (10,4) yields 2 ore per tick, limited by cart space. All four are infinite. B and any one ore source can supply the whole chain. In 4 ticks the furnace makes 1 ingot from 2 ore, or 1 steel from 2 ore + 1 coal. It holds 6 finished units of each. Ticks are 0.5 seconds. CPU starts at 30, reads cost 0, actions 1, and an explicit path search 3. QuickJS finishes each player call in one tick. Drone tasks carry the walk and load across ticks. A task-based steel program can pass Wen with zero explicit path searches. See `packages/sim/src/v8/sites/kettlewick.ts:4–31`, `packages/sim/src/v8/core/world.ts:36–40`, `packages/sim/src/v8/modules/smelting.ts:5,64–84`, `packages/sim/src/v8/modules/mining.ts:111–129,149–158,300–306`, `packages/sandbox/src/runtime.ts:267–275`.

### Where the record diverges

- The first-playable spec says the previous program fails the next quest. The chain test itself redeploys Harrow’s successful `richHaul` to clear Tomas. Its negative cases for Tomas and Pell substitute a steel program. An uncapped ingot loop satisfies all three with time. The chain test starts with legacy automation enabled. A new game starts with buttons. See `docs/specs/v8-first-playable.md:29`, `tests/v8/quests.test.ts:290–301,346–372`, `packages/sandbox/src/v8.ts:5–8`, `apps/web/app/components/FactoryFrame.vue:556`.
- ADR 0029 says taking Ines gives Loop before the long count. ADR 0032 moved that reward to hand-over. Ines’s and Elsie’s inserted hints still suggest triggers normally earned **after** their jobs. ADR 0027 and the spec’s open list still describe a no-manual-run Harrow check. ADR 0029 removed the lock. The first-playable spec also still calls for pack tests after ADR 0030 removed them. See `docs/adr/0029-pure-functions-machine-tasks.md:21–25`, `docs/adr/0032-rewards-on-hand-over.md:11–15`, `quests.ts:96–99,133–138,158–162`, `docs/adr/0027-shop-veins-one-delivery.md:31`, `docs/specs/v8-first-playable.md:42–48`, `docs/adr/0030-packs-removed.md:11–15`.
- ADR 0029 says 470 is 10 short of a 580 furnace. The gap is 110. A 570 purse is 10 short. Its “CPU leaves nothing for a second item” also stops holding at 940. ADR 0022’s older one-level-per-quest description misses Odile and Harrow on the default route. See `docs/adr/0029-pure-functions-machine-tasks.md:23`, `docs/adr/0022-quest-loop-no-loss.md:27`, `quests.ts:55–57,118,158,221–225`.

## 2. Five hours in region 1

Elsie gets a grate she can fit in her oven. Pell gets a hinge whose plate and pin came through different machines. Each request changes what the program must make or where a cart must take it.

| Phase | Minutes | Work at the keyboard and on the floor |
|---|---:|---|
| Start the works · Q1–2 | 0–35 (35) | Try the controls, write a furnace command, then dispatch a cart to survey stock at D. |
| Supply the bakery · Q3–4 | 35–90 (55) | Balance ore against coal, earn drone-2, and split supply and hauling to press a grate. |
| Rebuild the mill · Q5–6 | 90–160 (70) | Change dies on the press, fit out the lathe, and route blanks to its cutter. |
| Fit barrels and lamps · Q7–8 | 160–240 (80) | Join two streams of parts at the bench, then send a partly worked piece back through the press. |
| Equip the bridge crew · Q9 | 240–300 (60) | Make a reusable controller for two different repair kits. Inspect missing parts, queue work, and deliver both. |

These estimates include reading, writing, and debugging. If most of a phase passes after the first successful batch, cut the quantity.

### Floor and recipes

Keep all four veins and their rates. Put a **press at (5,1)** between the furnace and the cuts, a **lathe at the mill (9,1)**, and a **fitting bench at the riverside (12,4)**, all on the existing floor. D supplies the survey job, C gives the mill a rich ore option, and B keeps the steel line supplied. Finished grates can travel press → depot. Gear blanks go press → mill and hinges draw parts from both buildings. Two drones serve the entire map.

| Machine | How the first one arrives | Recipes, one output per batch |
|---|---|---|
| Furnace | Existing, available at start | Existing ingot and steel recipes, 4 ticks each |
| Press | Odile installs the base press on Q3 hand-over | 2 steel → grate, 1 ingot → plate, 1 steel → blank, 1 slotted plate → shutter. Each takes 4 ticks. |
| Lathe | Harrow’s Q5 plate and blank fit the mill’s lathe on hand-over | 1 blank → gear, 1 steel → pin, 1 plate → slotted plate. Each takes 6 ticks. |
| Fitting bench | Tomas supplies its geared drive on Q6 hand-over | 1 plate + 1 pin → hinge in 4 ticks. Pack the active kit’s listed parts into 1 labeled crate in 6 ticks. |

Each new base machine is a free, one-time quest grant. Unlock dies and drawings on the Take that first uses them. Give each new machine one active batch, room for 3 of each input and 3 finished pieces total. A proposed `start(recipe)` consumes inputs and reserves an output slot. A drone’s `transfer(item, from, to, qty)` owns the pickup and delivery across ticks. Keep the existing furnace-to-depot pickup working. Only depot intake credits quest shipments. This extends `packages/sim/src/v8/core/world.ts:6–23,132–145`, `packages/sim/src/v8/modules/mining.ts:201–214,434–445`, `packages/sim/src/v8/modules/orders.ts:24–35`.

### Proposed quests, grants, and wallet

Start with **80 credits and 0 XP**. Purse assumes no purchases. L1–7 begin at **0 / 10 / 20 / 40 / 85 / 140 / 170 XP**. Each job also requires the previous hand-over. L7 opens the bridge contract with an hour left to use it.

Move Run to the starter file alongside the manual controls so Bram can ask for one working function. Ines still grants Loop and Elsie grants events. Check shipments and machine actions. Leave the choice of TypeScript syntax to the player.

| Quest · giver · level | Request | Pay credits / XP | Purse / total XP | Unlocks and new work for the program |
|---|---|---:|---:|---|
| 1 · Bram · L1 | Deliver 1 test ingot from a batch started by the player’s exported function. Buttons can fill the hopper and haul it home. | 40 / 10 | 120 / 10 | Starter Run. Add the first command to the empty `smeltOnce`. Observe a completed batch after the function returns. Hand-over opens Ines. |
| 2 · Ines · L2 | Stock the depot with 3 survey ore from D using the deployed cart commands. Count the source on unload. | 60 / 10 | 180 / 20 | Select D from `veins()`. On successive Runs, send an empty cart to mine and a loaded one to the depot. The furnace-only function cannot haul. Hand-over grants Loop. |
| 3 · Mayor Odile · L3 | Deliver 2 bridge steel. | 80 / 20 | 260 / 40 | Take grants `alloy()`. Use `onTick` to choose ore or coal from hopper stock and leave a busy drone on task. Hand-over grants drone-2 and the press. |
| 4 · Elsie · L4 | Deliver 2 oven grates. Record a completed steel supply or product haul by **each** drone during the job. | 100 / 20 | 360 / 60 | Take opens the grate die and station transfers. Between mining trips, assign one drone furnace → press and the other press → depot. A parked second cart earns no haul. Hand-over grants events. |
| 5 · Harrow · L4 | Deliver 1 plate and 1 blank for the mill lathe. | 110 / 25 | 470 / 85 | Take opens both dies and `prospect()`. Select the press recipe from the outstanding order lines and switch furnace feed between ingots and steel. A ready event can dispatch a hauler. Hand-over installs the lathe. |
| 6 · Tomas · L5 | Deliver 2 cut gears for the fitting bench drive. | 130 / 25 | 600 / 110 | Take opens gear cutting. Route each blank to the lathe, start a cut when its input arrives, then collect the gear. The previous dispatcher sends blanks to the depot. Hand-over installs the bench. |
| 7 · Pell · L5 | Deliver 2 working barrel hinges. | 150 / 30 | 750 / 140 | Take opens the pin cutter and hinge drawing. Join plates from the press with pins from the lathe. Choose the missing input, including loads already on their way. Hand-over opens Wen. |
| 8 · Wen · L6 | Deliver 2 folded lamp shutters. | 170 / 30 | 920 / 170 | Take opens the slit cutter and folding die. Route by the **part in the cart**. Plate → lathe, slotted plate → same press, shutter → depot. A fixed destination per machine fails here. Hand-over opens the bridge contract. |
| 9 · Mayor Odile · L7 | Deliver a winch crate (1 gear + 2 hinges), then a lamp crate (2 shutters + 1 hinge). | 200 / 40 | 1,120 / 210 | Take opens the packing drawing and ordered manifests. Read the current crate, expand missing parts into jobs, and advance once its labeled crate ships. The shutter line alone cannot fill either crate. Hand-over equips the bridge crew and closes this chapter. |

**Shop pacing.** List every convenience from the start. All nine jobs need a working solution on base equipment at 30 CPU. The rack and spare press can be fitted once their base machines exist. The table assumes saving from the start.

| Optional purchase | Effect | Price | First affordable |
|---|---|---:|---|
| Bigger cart | Capacity 3 → 5 on both drones | 150 | After Ines, 180 |
| Bigger hopper | Furnace holds 12 ore / 6 coal | 240 | After Odile’s bridge steel, 260 |
| Hotter furnace | Furnace batches take 2 ticks | 350 | After Elsie, 360 |
| Output racks | Each downstream machine holds 6 finished parts instead of 3 | 450 | After Harrow, 470 |
| CPU +10 | 40 CPU for a larger controller | 580 | After Tomas, 600 |
| Spare press | A second press at (5,4) can keep another die working. The first press supports every recipe. | 720 | After Pell, 750 |

For a player who spends, a cart after Ines leaves 30. By Tomas that player has 450 for racks. Wen then leaves 320, enough for the hopper with 80 left. The final purse is 280. Buying the cart after Ines and saving for the spare press after Wen instead leaves 50 going into the last job.

## 3. Risks and ten changes in priority order

Watch for three failures in the first playtest. For **idle time**, record the edit that first produces the part and the wait that follows. For **stranded carts**, reserve both stock and receiving space when a transfer starts and release both on cancellation. For **stranded saves**, use distinct contract IDs and preserve old progress. One existing fixture already leaves Elsie active with drone-2 removed. Offer a route back to Odile that preserves Elsie’s shipped goods. See `tests/v8/quests.test.ts:30–40`, `quests.ts:140–146,333–336`.

| Priority | Implementable change | Main area | Size |
|---:|---|---|:---:|
| 1 | Capture the actual previous solution and carry it into the next job. Start a fresh session, verify the missing operation, then complete with the revised program and zero purchases. Keep a separate legacy run. | `tests/v8/quests.test.ts`, `packages/sandbox/src/v8.ts` | M |
| 2 | Add item quantities by station and per-line depot orders. Preserve old single-item orders. Track D on survey unload and who started Bram’s test batch. | `v8/core/world.ts`, `v8/modules/orders.ts` in `packages/sim/src` | L |
| 3 | Add the persistent station-to-station transfer task, tagged cargo, reservations and cancellation. Exercise two carts claiming the last piece and save/load mid-haul. | `v8/modules/mining.ts`, `v8/core/world.ts`, `tests/v8/save.test.ts` | L |
| 4 | Ship Q1–4 as a playable slice with the press, explicit tutorial grants and a real haul by each drone. | `v8/quests.ts`, `v8/modules/smelting.ts`, `v8/triggers.ts`, `v8/sites/kettlewick.ts` | L |
| 5 | Put granted machines on the floor as each arrives. Show recipe, missing input, reserved load and output space in the existing inspector and API book. | `apps/web/app/lib/floor.ts`, `FactoryFrame.vue`, `v8/triggers.ts`, `v8/apiBook.ts` | M |
| 6 | Replace the 60/8-ingot stretch with Harrow’s two dies and Tomas’s press-to-lathe gear run. | `v8/quests.ts`, `v8/modules/`, `v8/sites/kettlewick.ts` | M |
| 7 | Build the fitting bench, Pell’s two-input assembly and Wen’s return trip through the press. Remove the CPU cut and path-call quota from the new Wen contract. | `v8/modules/`, `v8/quests.ts`, `v8/checkFacts.ts` | M |
| 8 | Add two ordered manifests, labeled crates, and the bridge hand-over. Persist the active manifest and partial deliveries. | `v8/modules/orders.ts`, `v8/quests.ts`, `v8/core/world.ts` | M |
| 9 | Apply the proposed purse, XP thresholds, prices and six upgrades. Test the saving and spending routes above, including a cart bought before drone-2 arrives. | `v8/quests.ts`, `v8/sites/kettlewick.ts`, `tests/v8/economy.test.ts` | M |
| 10 | Version the quest chain in saves. Keep old active jobs finishable, map prior grants explicitly, and offer returning players the new fabrication work with their purse, level and files intact. | `v8/core/world.ts`, `apps/web/app/lib/factoryProtocol.ts`, `tests/v8/save.test.ts` | M |

Audited main SHA `2f10b43`.

**Open question**

- How many minutes does a first-time player actually spend diagnosing the two-drone handoff and the first multi-input assembly? Those observations determine whether the 55- and 80-minute phase budgets hold.
