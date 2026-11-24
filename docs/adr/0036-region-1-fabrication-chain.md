# Region 1 fabrication chain

Accepted 24 November 2026. Amends [ADR 0022](0022-quest-loop-no-loss.md), [ADR 0026](0026-quantity-quests-one-world.md), [ADR 0027](0027-shop-veins-one-delivery.md), [ADR 0029](0029-pure-functions-machine-tasks.md), [ADR 0031](0031-quest-gift-before-take.md), and [ADR 0032](0032-rewards-on-hand-over.md). The balance gate is [ADR 0035](0035-balance-simulation-gate.md).

## Context

Kettlewick’s eight quests all asked the furnace for ingots or steel. Harrow, Tomas, and Pell took the same ingot program three times. The map, the veins, and the two drones already cover the work. A new region is not required.

Nick chose the fabrication chain from the 24 November 2026 progression audit. The audit stays on `audit/astra-progression-2026-11-24`. This ADR is the decision. Quests 1–9, the lathe, and the assembly table are live in `packages/sim/src/v8/quests.ts`. Mining stays infinite. There is no efficiency goal, no rate, and no deadline.

## Decision

**One map.** Region 1 is still Kettlewick Works. No new world and no new room. Two drones serve the whole floor. A player function still finishes in one tick ([ADR 0029](0029-pure-functions-machine-tasks.md)). A machine holds the multi-tick batch.

**Three phases.** The minute bands are the target, including reading and debugging. If a phase is mostly waiting after the first good batch, cut the quantity.

| Phase | Quests | Minutes | What is new |
|---|---|---:|---|
| Open the works, then press a grate | 1–4 | 0–90. Opening 0–35. Bakery 35–90. | The furnace, then the press. Two carts split supply and hauling. |
| Cut the mill parts | 5–6 | 90–160 | The lathe. Blanks go from the press to the cutter. |
| Assemble and pack | 7–9 | 160–300. Barrels and lamps 160–240. Bridge crew 240–300. | The assembly table. Two streams meet, and one part goes back through the press. |

**Machines.** A new machine is a quest reward. It is never a shop key. The shop sells conveniences only. Each new machine runs one batch at a time, holds 3 of each input, and holds 3 finished pieces in total. `start(recipe)` consumes the inputs and reserves an output slot. The batch finishes on its own.

| Machine | Where | How it arrives | Recipes, one output per batch |
|---|---|---|---|
| Furnace | (2, 1), already there | At the start | Ingot and steel, 4 ticks. Unchanged. |
| Press | (5, 1), between the furnace and the cuts | Odile’s Hand over, with drone-2 | 2 steel → grate, 1 ingot → plate, 1 steel → blank, each 4 ticks. 1 cut plate → shutter, 4 ticks, when the folding die is open. |
| Lathe | (9, 1), the mill | Harrow’s Hand over | 1 blank → gear, 1 steel → pin, 1 plate → cut plate. Each takes 6 ticks. |
| Assembly table | (12, 4), the riverside. The audit calls this the fitting bench. | Tomas’s Hand over | 1 plate + 1 pin → hinge, 4 ticks. The active kit’s parts → 1 labeled crate, 6 ticks. |

Dies and drawings open on the Take that first uses them. The spare press in the shop is a second press, not the machine a quest requires. The first press runs every press recipe.

**Stations hold goods.** The furnace, the press, the lathe, the assembly table, the depot, and a drone can each hold any kind of goods. A drone still carries one kind at a time. `transfer(item, from, to, qty)` reserves that cargo and the receiving space, walks the haul, and releases both if the task is cancelled. Only a receipt at the depot counts toward a quest. `smelt()` and `alloy()` call `start()` and keep their current results.

**Grants are a map.** Odile’s Hand over installs drone-2 and the press. A save that already bought the drone keeps that drone and does not gain the press. A later quest does not add either gift by itself. An old save loads. Credits, XP, files, and shipped counts stay.

**Nine quests.** Each one makes the previous program miss. The pay, the purse, and the level thresholds are the target. The purse assumes nothing was bought. A fresh works starts at 80 credits and 0 XP. Levels change at 0 / 10 / 20 / 40 / 85 / 140 / 170 XP. Each job also needs the previous Hand over.

| Quest | Request | Pay credits / XP | Purse / XP | What the program has to learn |
|---|---|---:|---:|---|
| 1 · Bram · L1 | 1 ingot from a batch the player’s function started. Buttons may fill the hopper and haul it. | 40 / 10 | 120 / 10 | Put the first command in `smeltOnce`. The batch finishes after the function returns. |
| 2 · Ines · L2 | 3 ore from vein D, counted on unload at the depot. | 60 / 10 | 180 / 20 | Choose D. On one Run send an empty cart to mine, and on the next send a loaded cart home. Hand over grants Loop. |
| 3 · Odile · L3 | 2 steel. | 80 / 20 | 260 / 40 | Take grants `alloy()`. `onTick` chooses ore or coal and leaves a busy drone on its task. Hand over grants drone-2 and the press. |
| 4 · Elsie · L4 | 2 grates. Each drone must haul steel or a grate during the job. | 100 / 20 | 360 / 60 | Take opens the grate die and `transfer`. Between mining trips, one drone runs furnace → press and the other press → depot. A parked second cart earns no haul. Hand over grants events. |
| 5 · Harrow · L4 | 1 plate and 1 blank. | 110 / 25 | 470 / 85 | Take opens both dies and `prospect()`. Pick the press recipe from the order and switch the furnace between ingots and steel. A ready event can send the hauler. Hand over installs the lathe. |
| 6 · Tomas · L5 | 2 gears. | 130 / 25 | 600 / 110 | Take opens gear cutting. Send each blank to the lathe, start the cut when it arrives, and take the gear to the depot. The previous dispatcher sends blanks to the depot. Hand over installs the assembly table. |
| 7 · Pell · L5 | 2 hinges. | 150 / 30 | 750 / 140 | Take opens the pin cutter and the hinge drawing. Join plates from the press with pins from the lathe, including loads already on the way. |
| 8 · Wen · L6 | 2 shutters. | 170 / 30 | 920 / 170 | Take opens the slit cutter and the folding die. Route by the part in the cart: plate to the lathe, cut plate back to the press, shutter to the depot. |
| 9 · Odile · L7 | A winch crate (1 gear + 2 hinges), then a lamp crate (2 shutters + 1 hinge). | 200 / 40 | 1,120 / 210 | Take opens packing. Read the crate, expand the missing parts, and advance when that crate is received at the depot. |

Run stays in the starter file, so Bram can ask for one function. Ines still grants Loop and Elsie still grants events. Checks read shipments and machine actions. The player chooses the TypeScript.

**Shop target.** Every convenience is listed from the start. All nine jobs can be finished on the base works at 30 CPU. The rack and the spare press can be bought once their base machine exists.

| Purchase | Effect | Price | First affordable, if the player saves |
|---|---|---:|---|
| Bigger cart | Capacity 3 → 5 on both drones | 150 | After Ines, purse 180 |
| Bigger hopper | Furnace holds 12 ore and 6 coal | 240 | After Odile, purse 260 |
| Hotter furnace | Furnace batches take 2 ticks | 350 | After Elsie, purse 360 |
| Output racks | Each later machine holds 6 finished parts instead of 3 | 450 | After Harrow, purse 470 |
| CPU +10 | 40 CPU | 580 | After Tomas, purse 600 |
| Spare press | A second press at (5, 4) | 720 | After Pell, purse 750 |

A cart bought after Ines leaves 30. By Tomas that purse is 450, which buys the racks. Wen then leaves 320, enough for the hopper with 80 left, and the final purse is 280. Buying the cart after Ines and saving through Pell leaves 600, which is 120 short of the spare press. The spare press fits when nothing earlier was bought.

## Consequences

- The chain, when it is retuned, stays in `packages/sim/src/v8/quests.ts`. Recipe ticks, machine caps, and the press cell live in one module so a quest file does not keep a second copy.
- Quests 1–9 and the six shop conveniences are live. Bram asks for 1 function-started ingot, Ines for 3 ore from vein D, Odile for 2 steel, and Elsie for 2 grates with a haul from each cart. Odile’s Hand over places drone-2 and the press. Elsie’s Take opens the grate die. Harrow asks for 1 plate and 1 blank and hands over the lathe. Tomas asks for 2 gears and hands over the assembly table. Pell asks for 2 hinges. Wen asks for 2 shutters, and the route depends on the part in the cart. Wen no longer cuts the CPU limit and no longer checks findPath. Odile’s last contract, at level 7, is two ordered crates: a winch crate, then a lamp crate. The active crate and parts already set aside survive a save. A later quest does not install the lathe or the assembly table by itself. An open order whose item or quantity is a previous contract stays finishable on that saved count, and a Harrow save that already shipped 60 ingots can still be handed over.
- `takeFromDepot` remains the only count toward a quest. A grate on the press does not ship.
- Veins stay infinite. Nothing in this chain adds a rate, a par time, or a second region.
