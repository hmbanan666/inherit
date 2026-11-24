# Kettlewick balance report

The reference player handed over 8 quests in **1139 ticks (9.49 minutes)** and finished with **180 credits, 170 XP, level 7**.

Each tick represents 500 ms on the [worker clock](../../apps/web/app/lib/factory.worker.ts), using [the site interval](../../packages/sim/src/v8/sites/kettlewick.ts). Actions are immediate. Reading, editing, and thinking time are outside the estimate.

## Balance findings

| Status | Check | Measurement | Reason on record |
|---|---|---|---|
| Expected failure | `milestone/harrow` | 5.28 min (ticks 306–939), above 3 min. | After prospect opens on Take, deliveries fill the order without another milestone. |
| Expected failure | `xp/harrow` | 5.28 min (ticks 306–939), above 5 min. | The 60 ingot order runs longer than the XP plateau bound. The pay lands at hand-over, so the wait is the job itself. Step 3 replaces this request. |
| Expected failure | `duration/harrow` | 5.28 min, outside 0.15–4 min. | The long ingot order keeps the pair hauling past the quest duration target. |
| Expected failure | `code/harrow` | Cleared with the unchanged grates program. | The hauler can fill the order from a visible vein without calling prospect(). |
| Expected failure | `code/tomas` | Cleared with the unchanged grates program. | The pair already smelts and delivers ingots. |
| Expected failure | `code/pell` | Cleared with the unchanged grates program. | The same smelting loop makes the required fresh ingots. |
| Expected failure | `code/wen` | Cleared with the unchanged grates program. | Persistent machine tasks use no findPath calls and meet the path check unchanged. |
| Expected failure | `shop/shortfall/cart` | 80 credits / 150 price = 0.53× at tick 0 (target 1–2×). | The four opening conveniences are listed above the starting purse. |
| Expected failure | `shop/shortfall/hopper` | 80 credits / 240 price = 0.33× at tick 0 (target 1–2×). | The bigger hopper is listed on arrival above the starting purse. |
| Expected failure | `shop/shortfall/furnace` | 80 credits / 350 price = 0.23× at tick 0 (target 1–2×). | The hotter furnace is listed on arrival above the starting purse. |
| Expected failure | `shop/shortfall/cpu` | 80 credits / 580 price = 0.14× at tick 0 (target 1–2×). | CPU is listed on arrival above the starting purse. |
| Expected failure | `shop/shortfall/cart+cpu+furnace+hopper` | 80 credits / 1320 price = 0.06× at tick 0 (target 1–2×). | The starting purse covers none of the four conveniences on simultaneous offer. |
| Expected failure | `shop/shortfall/racks` | 110 credits / 450 price = 0.24× at tick 202 (target 1–2×). | Output racks open with the press, above the purse after Odile. |
| Expected failure | `shop/shortfall/spare` | 110 credits / 720 price = 0.15× at tick 202 (target 1–2×). | The spare press opens with the press, above the purse after Odile. |
| Expected failure | `shop/shortfall/racks+spare` | 110 credits / 1170 price = 0.09× at tick 202 (target 1–2×). | Racks and the spare press open together, above the purse after Odile. |

## Quests

Balances at Take precede any purchase for that quest. Hand-over includes its reward. Idle counts the time between a milestone, a newly passed check, or an increase in shipped goods.

| Quest | Take tick (min) | Hand-over tick (min) | Duration (min) | Credits | XP | Level | Program | Longest idle (ticks) |
|---|---:|---:|---:|---:|---:|---:|---|---|
| bram | 0 (0.00) | 32 (0.27) | 0.27 | 80 → 120 | 10 | 2 | run | 0–24 |
| ines | 32 (0.27) | 55 (0.46) | 0.19 | 120 → 180 | 20 | 3 | survey | 32–55 |
| odile | 55 (0.46) | 202 (1.68) | 1.23 | 180 → 110 | 40 | 4 | steel-loop | 55–106 |
| elsie | 202 (1.68) | 306 (2.55) | 0.87 | 110 → 210 | 60 | 4 | grates | 202–295 |
| harrow | 306 (2.55) | 939 (7.83) | 5.28 | 210 → 320 | 85 | 5 | grates | 322–375 |
| tomas | 939 (7.83) | 1025 (8.54) | 0.72 | 320 → 450 | 110 | 5 | grates | 957–975 |
| pell | 1025 (8.54) | 1053 (8.78) | 0.23 | 450 → 250 | 140 | 6 | grates | 1037–1048 |
| wen | 1053 (8.78) | 1139 (9.49) | 0.72 | 250 → 180 | 170 | 7 | grates | 1083–1139 |

Longest gap between unlocks, quest boundaries, or edits was 5.28 min (ticks 306–939). Including quest progress, the longest idle stretch was 0.78 min (ticks 202–295) on elsie. The longest XP/level plateau was 5.28 min (ticks 306–939).

## Quest timeline and balances at hand-over

The time column spans 0–9.49 minutes. Credit bars share a scale. Each level block represents one level.

```text
Quest     Time along run                    Credits at hand-over       Level
bram      ━                                 ████             120   ██ 2
ines       ━                                ██████           180   ███ 3
odile       ━━━━                            ████             110   ████ 4
elsie           ━━━                         ███████          210   ████ 4
harrow             ━━━━━━━━━━━━━━━━━        ███████████      320   █████ 5
tomas                               ━━━     ████████████████ 450   █████ 5
pell                                   ━    █████████        250   ██████ 6
wen                                     ━━  ██████           180   ███████ 7
```

## Shop on first listing

| Item | Tick | Credits before spending | Price | Purse / price |
|---|---:|---:|---:|---:|
| cart | 0 | 80 | 150 | 0.53× |
| hopper | 0 | 80 | 240 | 0.33× |
| furnace | 0 | 80 | 350 | 0.23× |
| cpu | 0 | 80 | 580 | 0.14× |
| cart+cpu+furnace+hopper | 0 | 80 | 1320 | 0.06× |
| racks | 202 | 110 | 450 | 0.24× |
| spare | 202 | 110 | 720 | 0.15× |
| racks+spare | 202 | 110 | 1170 | 0.09× |

## Previous program trials

Each proposed edit gets a separate replay from Take with the same purchase policy. Trial ticks are excluded from player time. A failed trial deploys the next program. A successful previous program stays deployed.

| Quest | Previous program | Trial ticks | Checks still open |
|---|---|---:|---|
| bram | manual | 960 | smeltOnce starts a batch · Bram receives 1 ingot |
| ines | run | 960 | Vein D ore reaches the depot · Ines receives 3 ore from vein D |
| odile | survey | 960 | Coal reaches the furnace · The furnace makes steel · Odile receives 2 steel |
| elsie | steel-loop | 960 | Each cart hauls steel or a grate · Elsie receives 2 grates |

## Event ledger

| Tick | Minute | Event | Detail | Credits | XP | Level |
|---:|---:|---|---|---:|---:|---:|
| 0 | 0.00 | unlock | tick, memory, depot, cpu.used, cpu.limit, drones, veins, findPath, drone.isNear, drone.moveAlong, drone.cargoKind, drone.busy, drone.task, drone.dump, depot.ore, depot.coal, depot.ingots, depot.steel, drone.mine, drone.unload, drone.pickup, drone.transfer, furnace, furnace.input, furnace.output, furnace.coal, furnace.inputMax, furnace.coalMax, furnace.steel, furnace.clear, furnace.smelt, furnace.start, depot.count, credits, orders, Run, Machine · furnace, Machine · depot, Machine · drone-1, Machine · Vein A, Machine · Vein B, Machine · Vein D, Shop · Bigger cart, Shop · Bigger hopper, Shop · Hotter furnace, Shop · CPU +10 | 80 | 0 | 1 |
| 0 | 0.00 | start | Horseshoes for the mail horse | 80 | 0 | 1 |
| 0 | 0.00 | code change | manual → run. smeltOnce starts the batch. Buttons may fill the hopper and haul. | 80 | 0 | 1 |
| 32 | 0.27 | finish | Horseshoes for the mail horse | 120 | 10 | 2 |
| 32 | 0.27 | start | Ore from the normal cut | 120 | 10 | 2 |
| 32 | 0.27 | code change | run → survey. Mine vein D and unload that ore at the depot. | 120 | 10 | 2 |
| 55 | 0.46 | finish | Ore from the normal cut | 180 | 20 | 3 |
| 55 | 0.46 | unlock | Loop | 180 | 20 | 3 |
| 55 | 0.46 | start | Steel for the bridge | 180 | 20 | 3 |
| 55 | 0.46 | unlock | furnace.alloy | 180 | 20 | 3 |
| 55 | 0.46 | purchase | Bigger cart (−150) | 30 | 20 | 3 |
| 55 | 0.46 | code change | survey → steel-loop. Loop fetches coal and alloys steel. | 30 | 20 | 3 |
| 202 | 1.68 | finish | Steel for the bridge | 110 | 40 | 4 |
| 202 | 1.68 | unlock | press, press.installed, press.count, press.start, Machine · press, Machine · drone-2, Shop · Output racks, Shop · Spare press | 110 | 40 | 4 |
| 202 | 1.68 | start | A grate for the oven | 110 | 40 | 4 |
| 202 | 1.68 | code change | steel-loop → grates. Each cart hauls steel to the press or a grate to the depot. | 110 | 40 | 4 |
| 306 | 2.55 | finish | A grate for the oven | 210 | 60 | 4 |
| 306 | 2.55 | unlock | on | 210 | 60 | 4 |
| 306 | 2.55 | start | Iron from the hill | 210 | 60 | 4 |
| 306 | 2.55 | unlock | prospect | 210 | 60 | 4 |
| 939 | 7.83 | finish | Iron from the hill | 320 | 85 | 5 |
| 939 | 7.83 | start | Iron for the mill wheel | 320 | 85 | 5 |
| 1025 | 8.54 | finish | Iron for the mill wheel | 450 | 110 | 5 |
| 1025 | 8.54 | start | Hinges for the barrels | 450 | 110 | 5 |
| 1025 | 8.54 | purchase | Hotter furnace (−350) | 100 | 110 | 5 |
| 1053 | 8.78 | finish | Hinges for the barrels | 250 | 140 | 6 |
| 1053 | 8.78 | start | Steel for the lamps | 250 | 140 | 6 |
| 1053 | 8.78 | purchase | Bigger hopper (−240) | 10 | 140 | 6 |
| 1139 | 9.49 | finish | Steel for the lamps | 180 | 170 | 7 |

<details>
<summary>All intervals between quest progress or milestones</summary>

| Quest | Tick ranges |
|---|---|
| bram | 0–24, 24–25, 25–32 |
| ines | 32–55 |
| odile | 55–106, 106–140, 140–168, 168–202 |
| elsie | 202–295, 295–306 |
| harrow | 306–315, 315–322, 322–375, 375–382, 382–389, 389–400, 400–407, 407–425, 425–432, 432–439, 439–450, 450–457, 457–475, 475–482, 482–489, 489–500, 500–507, 507–525, 525–532, 532–539, 539–550, 550–557, 557–575, 575–582, 582–589, 589–600, 600–607, 607–625, 625–632, 632–639, 639–650, 650–657, 657–675, 675–682, 682–689, 689–700, 700–707, 707–725, 725–732, 732–739, 739–750, 750–757, 757–775, 775–782, 782–789, 789–800, 800–807, 807–825, 825–832, 832–839, 839–850, 850–857, 857–875, 875–882, 882–889, 889–900, 900–907, 907–925, 925–932, 932–939 |
| tomas | 939–946, 946–950, 950–957, 957–975, 975–982, 982–989, 989–1000, 1000–1007, 1007–1025 |
| pell | 1025–1028, 1028–1032, 1032–1037, 1037–1048, 1048–1053 |
| wen | 1053–1061, 1061–1073, 1073–1078, 1078–1083, 1083–1139 |

</details>
