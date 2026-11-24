# Kettlewick balance report

The reference player handed over 9 quests in **977 ticks (8.14 minutes)** and finished with **1120 credits, 210 XP, level 7**.

Each tick represents 500 ms on the [worker clock](../../apps/web/app/lib/factory.worker.ts), using [the site interval](../../packages/sim/src/v8/sites/kettlewick.ts). Actions are immediate. Reading, editing, and thinking time are outside the estimate.

## Balance findings

| Status | Check | Measurement | Reason on record |
|---|---|---|---|

## Quests

Balances at Take precede any purchase for that quest. Hand-over includes its reward. Idle counts the time between a milestone, a newly passed check, or an increase in shipped goods.

| Quest | Take tick (min) | Hand-over tick (min) | Duration (min) | Credits | XP | Level | Program | Longest idle (ticks) |
|---|---:|---:|---:|---:|---:|---:|---|---|
| bram | 0 (0.00) | 32 (0.27) | 0.27 | 80 → 120 | 10 | 2 | run | 0–24 |
| ines | 32 (0.27) | 55 (0.46) | 0.19 | 120 → 180 | 20 | 3 | survey | 32–55 |
| odile | 55 (0.46) | 166 (1.38) | 0.93 | 180 → 260 | 40 | 4 | steel-loop | 55–96 |
| elsie | 166 (1.38) | 258 (2.15) | 0.77 | 260 → 360 | 60 | 4 | grates | 166–247 |
| harrow | 258 (2.15) | 320 (2.67) | 0.52 | 360 → 470 | 85 | 5 | dies | 259–292 |
| tomas | 320 (2.67) | 418 (3.48) | 0.82 | 470 → 600 | 110 | 5 | gears | 320–378 |
| pell | 418 (3.48) | 590 (4.92) | 1.43 | 600 → 750 | 140 | 6 | hinges | 418–535 |
| wen | 590 (4.92) | 646 (5.38) | 0.47 | 750 → 920 | 170 | 7 | shutters | 590–635 |
| crew | 646 (5.38) | 977 (8.14) | 2.76 | 920 → 1120 | 210 | 7 | kits | 646–838 |

Longest gap between unlocks, quest boundaries, or edits was 2.76 min (ticks 646–977). Including quest progress, the longest idle stretch was 1.60 min (ticks 646–838) on crew. The longest XP/level plateau was 2.76 min (ticks 646–977).

## Quest timeline and balances at hand-over

The time column spans 0–8.14 minutes. Credit bars share a scale. Each level block represents one level.

```text
Quest     Time along run                    Credits at hand-over       Level
bram      ━                                 ██               120   ██ 2
ines       ━                                ███              180   ███ 3
odile       ━━━                             ████             260   ████ 4
elsie          ━━━                          █████            360   ████ 4
harrow            ━━                        ███████          470   █████ 5
tomas               ━━━━                    █████████        600   █████ 5
pell                    ━━━━━               ███████████      750   ██████ 6
wen                          ━━             █████████████    920   ███████ 7
crew                           ━━━━━━━━━━━  ████████████████ 1120  ███████ 7
```

## Shop at the planned hand-over

Each convenience is priced against the unspent purse at the hand-over that can first afford it. The reference run does not buy.

| Item | Quest | Tick | Credits | Price | Purse / price |
|---|---|---:|---:|---:|---:|
| cart | Ore from the normal cut | 55 | 180 | 150 | 1.20× |
| hopper | Steel for the bridge | 166 | 260 | 240 | 1.08× |
| furnace | A grate for the oven | 258 | 360 | 350 | 1.03× |
| racks | Iron from the hill | 320 | 470 | 450 | 1.04× |
| cpu | Gears for the mill wheel | 418 | 600 | 580 | 1.03× |
| spare | Hinges for the barrels | 590 | 750 | 720 | 1.04× |

## Previous program trials

Each proposed edit gets a separate replay from Take with the same purchase policy. Trial ticks are excluded from player time. A failed trial deploys the next program. A successful previous program stays deployed.

| Quest | Previous program | Trial ticks | Checks still open |
|---|---|---:|---|
| bram | manual | 960 | smeltOnce starts a batch · Bram receives 1 ingot |
| ines | run | 960 | Vein D ore reaches the depot · Ines receives 3 ore from vein D |
| odile | survey | 960 | Coal reaches the furnace · The furnace makes steel · Odile receives 2 steel |
| elsie | steel-loop | 960 | Each cart hauls steel or a grate · Elsie receives 2 grates |
| harrow | grates | 960 | Harrow receives 1 plate · Harrow receives 1 blank |
| tomas | dies | 960 | Tomas receives 2 gears |
| pell | gears | 960 | Pell receives 2 hinges |
| wen | hinges | 960 | Wen receives 2 shutters |
| crew | shutters | 960 | The winch crate is received · The lamp crate is received |

## Event ledger

| Tick | Minute | Event | Detail | Credits | XP | Level |
|---:|---:|---|---|---:|---:|---:|
| 0 | 0.00 | unlock | tick, memory, depot, cpu.used, cpu.limit, drones, veins, findPath, drone.isNear, drone.moveAlong, drone.cargoKind, drone.busy, drone.task, drone.dump, depot.ore, depot.coal, depot.ingots, depot.steel, drone.mine, drone.unload, drone.pickup, drone.transfer, furnace, furnace.input, furnace.output, furnace.coal, furnace.inputMax, furnace.coalMax, furnace.steel, furnace.clear, furnace.smelt, furnace.start, manifest, depot.count, credits, orders, Run, Machine · furnace, Machine · depot, Machine · drone-1, Machine · Vein A, Machine · Vein B, Machine · Vein D, Shop · Bigger cart, Shop · Bigger hopper, Shop · Hotter furnace, Shop · CPU +10 | 80 | 0 | 1 |
| 0 | 0.00 | start | Horseshoes for the mail horse | 80 | 0 | 1 |
| 0 | 0.00 | code change | manual → run. smeltOnce starts the batch. Buttons may fill the hopper and haul. | 80 | 0 | 1 |
| 32 | 0.27 | finish | Horseshoes for the mail horse | 120 | 10 | 2 |
| 32 | 0.27 | start | Ore from the normal cut | 120 | 10 | 2 |
| 32 | 0.27 | code change | run → survey. Mine vein D and unload that ore at the depot. | 120 | 10 | 2 |
| 55 | 0.46 | finish | Ore from the normal cut | 180 | 20 | 3 |
| 55 | 0.46 | unlock | Loop | 180 | 20 | 3 |
| 55 | 0.46 | start | Steel for the bridge | 180 | 20 | 3 |
| 55 | 0.46 | unlock | furnace.alloy | 180 | 20 | 3 |
| 55 | 0.46 | code change | survey → steel-loop. Loop fetches coal and alloys steel. | 180 | 20 | 3 |
| 166 | 1.38 | finish | Steel for the bridge | 260 | 40 | 4 |
| 166 | 1.38 | unlock | press, press.installed, press.count, press.start, Machine · press, Machine · drone-2, Shop · Output racks, Shop · Spare press | 260 | 40 | 4 |
| 166 | 1.38 | start | A grate for the oven | 260 | 40 | 4 |
| 166 | 1.38 | code change | steel-loop → grates. Each cart hauls steel to the press or a grate to the depot. | 260 | 40 | 4 |
| 258 | 2.15 | finish | A grate for the oven | 360 | 60 | 4 |
| 258 | 2.15 | unlock | on | 360 | 60 | 4 |
| 258 | 2.15 | start | Iron from the hill | 360 | 60 | 4 |
| 258 | 2.15 | unlock | prospect | 360 | 60 | 4 |
| 258 | 2.15 | code change | grates → dies. The order names a plate and a blank, so the press die has to change. | 360 | 60 | 4 |
| 259 | 2.16 | unlock | Machine · Vein C | 360 | 60 | 4 |
| 320 | 2.67 | finish | Iron from the hill | 470 | 85 | 5 |
| 320 | 2.67 | unlock | lathe, lathe.installed, lathe.count, lathe.start, Machine · lathe | 470 | 85 | 5 |
| 320 | 2.67 | start | Gears for the mill wheel | 470 | 85 | 5 |
| 320 | 2.67 | code change | dies → gears. A blank is cut into a gear on the lathe. | 470 | 85 | 5 |
| 418 | 3.48 | finish | Gears for the mill wheel | 600 | 110 | 5 |
| 418 | 3.48 | unlock | bench, bench.installed, bench.count, bench.start, Machine · bench | 600 | 110 | 5 |
| 418 | 3.48 | start | Hinges for the barrels | 600 | 110 | 5 |
| 418 | 3.48 | code change | gears → hinges. A hinge joins a plate from the press with a pin from the lathe. | 600 | 110 | 5 |
| 590 | 4.92 | finish | Hinges for the barrels | 750 | 140 | 6 |
| 590 | 4.92 | start | Shutters for the lamps | 750 | 140 | 6 |
| 590 | 4.92 | code change | hinges → shutters. A plate goes to the lathe, and the cut plate comes back to the press. | 750 | 140 | 6 |
| 646 | 5.38 | finish | Shutters for the lamps | 920 | 170 | 7 |
| 646 | 5.38 | start | Kits for the bridge crew | 920 | 170 | 7 |
| 646 | 5.38 | code change | shutters → kits. Pack the winch crate, then the lamp crate. | 920 | 170 | 7 |
| 977 | 8.14 | finish | Kits for the bridge crew | 1120 | 210 | 7 |

<details>
<summary>All intervals between quest progress or milestones</summary>

| Quest | Tick ranges |
|---|---|
| bram | 0–24, 24–25, 25–32 |
| ines | 32–55 |
| odile | 55–96, 96–122, 122–141, 141–166 |
| elsie | 166–247, 247–258 |
| harrow | 258–259, 259–292, 292–320 |
| tomas | 320–378, 378–418 |
| pell | 418–535, 535–590 |
| wen | 590–635, 635–646 |
| crew | 646–838, 838–977 |

</details>
