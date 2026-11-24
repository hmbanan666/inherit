# Kettlewick balance report

The reference player handed over 8 quests in **1461 ticks (12.18 minutes)** and finished with **570 credits, 165 XP, level 7**.

Each tick represents 500 ms on the [worker clock](../../apps/web/app/lib/factory.worker.ts), using [the site interval](../../packages/sim/src/v8/sites/kettlewick.ts). Actions are immediate. Reading, editing, and thinking time are outside the estimate.

## Balance findings

| Status | Check | Measurement | Reason on record |
|---|---|---|---|
| Expected failure | `milestone/harrow` | 4.76 min (ticks 688–1259), above 3 min. | After prospect opens on Take, deliveries fill the order without another milestone. |
| Expected failure | `xp/tomas` | 5.42 min (ticks 688–1339), above 5 min. | Harrow pays no XP. Progress resumes when Tomas is paid. |
| Expected failure | `duration/harrow` | 4.76 min, outside 0.15–4 min. | The long ingot order keeps the pair hauling past the quest duration target. |
| Expected failure | `code/harrow` | Cleared with the unchanged two-drones program. | The hauler can fill the order from a visible vein without calling prospect(). |
| Expected failure | `code/tomas` | Cleared with the unchanged two-drones program. | The pair already smelts and delivers ingots. |
| Expected failure | `code/pell` | Cleared with the unchanged two-drones program. | The same smelting loop makes the required fresh ingots. |
| Expected failure | `code/wen` | Cleared with the unchanged two-drones program. | Persistent machine tasks use no findPath calls and meet the path check unchanged. |
| Expected failure | `shop/shortfall/furnace` | 300 credits / 580 price = 0.52× at tick 0 (target 1–2×). | The whole catalog opens on arrival. The starting purse cannot cover the hotter furnace. |
| Expected failure | `shop/shortfall/cpu` | 300 credits / 700 price = 0.43× at tick 0 (target 1–2×). | CPU is listed on arrival above the starting balance. |
| Expected failure | `shop/shortfall/cart+cpu+furnace+hopper` | 300 credits / 1800 price = 0.17× at tick 0 (target 1–2×). | The starting purse covers one of the four conveniences on simultaneous offer. |
| Exempt | `code/bram` | Tutorial | Manual controls introduce mining, smelting and depot delivery. |
| Exempt | `code/ines` | Tutorial | The tutorial practices Run. The same ingots can still be made by hand. |

## Quests

Balances at Take precede any purchase for that quest. Hand-over includes its reward. Idle counts the time between a milestone, a newly passed check, or an increase in shipped goods.

| Quest | Take tick (min) | Hand-over tick (min) | Duration (min) | Credits | XP | Level | Program | Longest idle (ticks) |
|---|---:|---:|---:|---:|---:|---:|---|---|
| bram | 0 (0.00) | 47 (0.39) | 0.39 | 300 → 140 | 20 | 2 | manual | 0–34 |
| ines | 47 (0.39) | 382 (3.18) | 2.79 | 140 → 230 | 40 | 3 | run | 47–88 |
| odile | 382 (3.18) | 593 (4.94) | 1.76 | 230 → 330 | 60 | 3 | steel-loop | 441–500 |
| elsie | 593 (4.94) | 688 (5.73) | 0.79 | 330 → 190 | 85 | 4 | two-drones | 621–674 |
| harrow | 688 (5.73) | 1259 (10.49) | 4.76 | 190 → 270 | 85 | 4 | two-drones | 759–779 |
| tomas | 1259 (10.49) | 1339 (11.16) | 0.67 | 270 → 370 | 110 | 5 | two-drones | 1309–1329 |
| pell | 1339 (11.16) | 1384 (11.53) | 0.38 | 370 → 450 | 135 | 6 | two-drones | 1359–1379 |
| wen | 1384 (11.53) | 1461 (12.18) | 0.64 | 450 → 570 | 165 | 7 | two-drones | 1392–1452 |

Longest gap between unlocks, quest boundaries, or edits was 4.76 min (ticks 688–1259). Including quest progress, the longest idle stretch was 0.50 min (ticks 1392–1452) on wen. The longest XP/level plateau was 5.42 min (ticks 688–1339).

## Quest timeline and balances at hand-over

The time column spans 0–12.18 minutes. Credit bars share a scale. Each level block represents one level.

```text
Quest     Time along run                    Credits at hand-over       Level
bram      ━                                 ████             140   ██ 2
ines       ━━━━━━━                          ██████           230   ███ 3
odile             ━━━━━                     █████████        330   ███ 3
elsie                  ━━                   █████            190   ████ 4
harrow                   ━━━━━━━━━━━━━      ████████         270   ████ 4
tomas                                 ━     ██████████       370   █████ 5
pell                                   ━    █████████████    450   ██████ 6
wen                                     ━━  ████████████████ 570   ███████ 7
```

## Shop on first listing

| Item | Tick | Credits before spending | Price | Purse / price |
|---|---:|---:|---:|---:|
| cart | 0 | 300 | 240 | 1.25× |
| hopper | 0 | 300 | 280 | 1.07× |
| furnace | 0 | 300 | 580 | 0.52× |
| cpu | 0 | 300 | 700 | 0.43× |
| cart+cpu+furnace+hopper | 0 | 300 | 1800 | 0.17× |

## Previous program trials

Each proposed edit gets a separate replay from Take with the same purchase policy. Trial ticks are excluded from player time. Ines practices Run even when the manual player succeeds. After the tutorial, a successful previous program stays deployed.

| Quest | Previous program | Trial ticks | Checks still open |
|---|---|---:|---|
| ines | manual | 335 | Cleared |
| odile | run | 960 | Coal reaches the furnace · The furnace makes steel · Odile receives 4 steel |
| elsie | steel-loop | 960 | drone-2 leaves the depot |

## Event ledger

| Tick | Minute | Event | Detail | Credits | XP | Level |
|---:|---:|---|---|---:|---:|---:|
| 0 | 0.00 | unlock | tick, memory, depot, cpu.used, cpu.limit, drones, veins, findPath, drone.isNear, drone.moveAlong, drone.cargoKind, drone.busy, drone.task, drone.dump, depot.ore, depot.coal, depot.ingots, depot.steel, drone.mine, drone.unload, drone.pickup, drone.transfer, furnace, furnace.input, furnace.output, furnace.coal, furnace.inputMax, furnace.coalMax, furnace.steel, furnace.clear, furnace.smelt, furnace.start, depot.count, credits, orders, Machine · furnace, Machine · depot, Machine · drone-1, Machine · Vein A, Machine · Vein B, Machine · Vein D, Shop · Bigger cart, Shop · Bigger hopper, Shop · Hotter furnace, Shop · CPU +10 | 300 | 0 | 1 |
| 0 | 0.00 | start | Horseshoes for the mail horse | 300 | 0 | 1 |
| 0 | 0.00 | purchase | Bigger cart (−240) | 60 | 0 | 1 |
| 47 | 0.39 | finish | Horseshoes for the mail horse | 140 | 20 | 2 |
| 47 | 0.39 | unlock | Run | 140 | 20 | 2 |
| 47 | 0.39 | start | Ingots for the storehouse | 140 | 20 | 2 |
| 47 | 0.39 | code change | manual → run. Use the newly earned Run to fire the furnace. | 140 | 20 | 2 |
| 382 | 3.18 | finish | Ingots for the storehouse | 230 | 40 | 3 |
| 382 | 3.18 | unlock | Loop | 230 | 40 | 3 |
| 382 | 3.18 | start | Steel for the bridge | 230 | 40 | 3 |
| 382 | 3.18 | unlock | furnace.alloy | 230 | 40 | 3 |
| 382 | 3.18 | code change | run → steel-loop. Loop must fetch coal and alloy steel. | 230 | 40 | 3 |
| 593 | 4.94 | finish | Steel for the bridge | 330 | 60 | 3 |
| 593 | 4.94 | unlock | press, press.installed, press.count, press.start, Machine · press, Machine · drone-2 | 330 | 60 | 3 |
| 593 | 4.94 | start | A grate for the oven | 330 | 60 | 3 |
| 593 | 4.94 | purchase | Bigger hopper (−280) | 50 | 60 | 3 |
| 593 | 4.94 | code change | steel-loop → two-drones. Send the second cart for coal and depot deliveries. | 50 | 60 | 3 |
| 688 | 5.73 | finish | A grate for the oven | 190 | 85 | 4 |
| 688 | 5.73 | unlock | on | 190 | 85 | 4 |
| 688 | 5.73 | start | Iron from the hill | 190 | 85 | 4 |
| 688 | 5.73 | unlock | prospect | 190 | 85 | 4 |
| 1259 | 10.49 | finish | Iron from the hill | 270 | 85 | 4 |
| 1259 | 10.49 | start | Iron for the mill wheel | 270 | 85 | 4 |
| 1339 | 11.16 | finish | Iron for the mill wheel | 370 | 110 | 5 |
| 1339 | 11.16 | start | Hinges for the barrels | 370 | 110 | 5 |
| 1384 | 11.53 | finish | Hinges for the barrels | 450 | 135 | 6 |
| 1384 | 11.53 | start | Steel for the lamps | 450 | 135 | 6 |
| 1461 | 12.18 | finish | Steel for the lamps | 570 | 165 | 7 |

<details>
<summary>All intervals between quest progress or milestones</summary>

| Quest | Tick ranges |
|---|---|
| bram | 0–34, 34–39, 39–42, 42–47 |
| ines | 47–88, 88–93, 93–99, 99–140, 140–145, 145–186, 186–191, 191–197, 197–238, 238–243, 243–284, 284–289, 289–295, 295–336, 336–341, 341–382 |
| odile | 382–433, 433–438, 438–441, 441–500, 500–534, 534–593 |
| elsie | 593–597, 597–602, 602–621, 621–674, 674–678, 678–683, 683–688 |
| harrow | 688–689, 689–697, 697–702, 702–707, 707–712, 712–729, 729–734, 734–739, 739–754, 754–759, 759–779, 779–784, 784–789, 789–804, 804–809, 809–829, 829–834, 834–839, 839–854, 854–859, 859–879, 879–884, 884–889, 889–904, 904–909, 909–929, 929–934, 934–939, 939–954, 954–959, 959–979, 979–984, 984–989, 989–1004, 1004–1009, 1009–1029, 1029–1034, 1034–1039, 1039–1054, 1054–1059, 1059–1079, 1079–1084, 1084–1089, 1089–1104, 1104–1109, 1109–1129, 1129–1134, 1134–1139, 1139–1154, 1154–1159, 1159–1179, 1179–1184, 1184–1189, 1189–1204, 1204–1209, 1209–1229, 1229–1234, 1234–1239, 1239–1254, 1254–1259 |
| tomas | 1259–1278, 1278–1279, 1279–1284, 1284–1289, 1289–1304, 1304–1309, 1309–1329, 1329–1334, 1334–1339 |
| pell | 1339–1353, 1353–1354, 1354–1359, 1359–1379, 1379–1384 |
| wen | 1384–1385, 1385–1392, 1392–1452, 1452–1456, 1456–1461 |

</details>
