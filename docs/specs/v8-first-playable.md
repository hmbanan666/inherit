# v8 first playable slice

Governs: [ADR 0022](../adr/0022-quest-loop-no-loss.md), [ADR 0025](../adr/0025-functions-with-triggers.md), [ADR 0021](../adr/0021-v8-inherit-a-factory.md), [v8 concept](../concept/v8.md).

This file is the slice that is in the code. The quest table, the shop prices, and the later rules live in the concept and in ADR 0022. Where an older milestone mentioned rent, pause, speeds, bankruptcy, deadlines, Mayor Hale, three starting drones, `defineModule`, or a starter that already delivers, that milestone is withdrawn.

## Playable now

Nick opens `/` and reads one villager's quest: the goal, the why line, and the checks under the editor. Uncle's cart never comes home. He edits that, deploys, and presses Complete quest. Credits and XP arrive then. The next quest waits until he takes it. Credits fall only in the shop and never go below zero. The clock keeps ticking. There is no pause and no speed button.

`/?packs` opens the legacy pack showcase. Pack code stays.

The site is Kettlewick Works.

- One drone, capacity 3. Vein A is poor ore and vein B is poor coal: 5 ticks for 1 rock. Vein C is hidden rich ore: 1 tick for 2 rock. Veins do not run out. `dump()` drops ore or coal; mining the other rock does that on its own and writes an info line. Ingots and steel stay in the cart.
- Furnace: 2 ore to 1 ingot in 4 ticks. The hopper holds 6 ore and 3 coal. Steel is 2 ore and 1 coal through `furnace.alloy()`, granted by taking Odile's quest. `prospect()` is granted by taking Harrow's quest, Bring Harrow 60 ingots, offered at level 4 before Tomas.
- CPU limit 30. Tick 500 ms. Credits 300. Level 1. XP 0.
- A fresh `main.ts` exports `smeltOnce` and does not call it. Uncle's loop still mines vein A and never returns (`const home = false`).
- Ingots and steel stay in the furnace until a drone picks them up and unloads them at the depot. Villagers take them from the depot. The furnace holds 6 of each. Run, `on()`, and `onTick` unlock when Ines, Odile, and Elsie are taken.

The worker runs one tick on that interval even when the tab is hidden. The visibility message does nothing. The sim has no UI and no clock of its own.

## Quest counting

`acceptQuest` opens one order for the quest. Its shipped count starts at 0. `updateOrders` does nothing while the site has a quest list, so the unused schedule on the site is not the live quest. `order.due` is set far ahead, is not shown, and does not change pay.

Checks are evaluated on the live world every tick after accept. Prepare sets the baseline the quest cares about:

- Elsie sets `holdTicks` to 48 and `coalHold` to 24 and remembers `steelMade`. Ore waiting longer than 48 ticks is cleared. Coal waiting longer than 24 ticks is cleared.
- Tomas sets `ingotsMade` to 0. The checks are an ingot smelted this quest, and Tomas receiving 8 ingots.
- Pell sets `ingotsMade` to 0. "Pell receives 4 ingots" also requires four ingots smelted this quest.
- Wen sets the CPU limit to 18 if CPU +10 is owned, otherwise 8, and clears the path window. "The route is remembered" needs 8 recorded ticks whose `findPath` calls sum to at most 4.

Bram and Odile do not reset the furnace. Their delivery checks still start at zero when the quest is taken. A program that cleared the previous quest does not pass the next one. The quest test locks that.

Complete pays `pay` and `xp` in full, then clears the quest id. Waste on the ledger does not reduce the payout or the balance.

## Shop and frame

Shop items and prices are the concept's list. `buyUpgrade` refuses an unknown id, an owned item, and an item the player cannot afford, and it does not change the balance when it refuses. `alloy` and `prospect` are not shop ids. A `bought` list that still contains them keeps those functions.

The frame is the standing shell, arranged in [the screen layout](v8-screen-layout.md). The quest card and portrait are on the left, the works are in the center, and Monaco and the file tree are on the right. Checks and Console share the pane to the right of the code. Deploy sits on the editor when the code differs. The nav says Running. Settings open API and Charts. The CPU line is `used/limit`. A call that would pass the limit does not run, and the guest stops the rest of `onTick`. The sim tick still finishes.

The save is version 3 under `inherit.v8.kettlewick`. It stores the world, the deployed files, and the editor files. An unreadable slot is archived. Project files are kept when the world cannot be trusted. Unknown saves follow [ADR 0004](../adr/0004-v3-save-reset.md).

## Standing rules

- Game rules live in `packages/sim/src/v8/`. Player code runs only in QuickJS. The worker owns the session. The page renders snapshots.
- Do not edit pack content for a v8 change. Shared sandbox changes must keep pack tests green.
- Do not rebuild the frame. Adapt the components that are already there.
- Before a PR: `pnpm test`, `pnpm typecheck`, `pnpm build`. Nick playtests. No browser suite and no screenshots.

## Later

Not in the code. [ADR 0022](../adr/0022-quest-loop-no-loss.md) has the decisions. Do not invent a deadline, a rent charge, or a wipe in their place.

- Speed XP bonus, with a par time on the card and no penalty.
- Shop tiers by level. Villager unlocks by level are already in.
- Audit: a chapter summary after the chain.
- Next inheritance: a new site, the player's `lib/` carried over, credits and XP kept.

## Out

Art, a market, more sites, deleting packs, pause, speeds, rent, bankruptcy, deadlines, a shop of API versions, `defineModule`, Mayor Hale, and three drones at the start.
