# v8 first playable slice

This file is what the code does. The vision is [the concept](../concept/v8.md). The chain and the prices are `questList` and `shop` in `packages/sim/src/v8/quests.ts`. The arrangement is [the screen layout](v8-screen-layout.md). [ADR 0026](../adr/0026-quantity-quests-one-world.md) names the places this slice still disagrees with the vision. Those places are listed at the end. This file does not choose a replacement.

Where an older milestone mentioned rent, pause, speeds, bankruptcy, deadlines, a speed bonus, Mayor Hale, three starting drones, `defineModule`, or a starter that already delivers, that milestone is withdrawn.

## Playable now

Nick opens `/`. Nobody is asking until he takes a quest. Bram is first, at level 1: buttons on the furnace and the drone, and four ingots taken from the depot. **Hand over** pays that quest's credits and XP when every goal line passes. Shipping does not pay. The next villager waits until this one is handed over and the level is high enough. The clock keeps ticking while the tab is hidden. There is no pause and no speed button.

`/?packs` opens the legacy pack showcase. Pack code stays.

The site is Kettlewick Works. Its numbers live on `kettlewick` in `packages/sim/src/v8/sites/kettlewick.ts`.

- One drone, capacity 3. Vein A is poor ore and vein B is poor coal. Vein C is hidden rich ore until `prospect()`. Veins do not run out. `dump()` drops ore or coal. Mining the other rock does that on its own and writes an info line. Ingots and steel stay in the cart.
- The furnace turns 2 ore into 1 ingot in 4 ticks. The hopper holds 6 ore and 3 coal. Output holds 6 ingots and 6 steel. Unload fills the free hopper space and the drone keeps the rest.
- A fresh `main.ts` exports `smeltOnce` and does not call it. `uncleMain` is the old loop, with `const home = false`. A fresh world does not start there. Old saves can still be running it.
- Ingots and steel stay in the furnace until a drone picks them up and unloads them at the depot. `takeFromDepot` moves the open quest's goods from the depot onto the order. `ship()` on a quest draws from the depot too. A site with no quest list still ships from the furnace and can mark an order late. Kettlewick has a quest list, so `updateOrders` returns immediately and `orderSchedule` is not the live quest.
- Run, `on()`, and `onTick` unlock when Ines, Odile, and Elsie are taken. `furnace.alloy()` unlocks with Odile. `prospect()` unlocks with Harrow. The shop does not sell those. A `bought` list that still contains `alloy` or `prospect` keeps the function. Nothing is refunded.
- CPU limit 30. Tick 500 ms. Credits 300. Level 1. XP 0. Level thresholds are `levelFor`.
- `buyUpgrade` refuses an unknown id, an owned item, and an item the player cannot afford, and it does not change the balance when it refuses. A purchase that succeeds subtracts the price.

The worker runs one tick on that interval even when the tab is hidden. The visibility message does nothing. The sim has no UI and no clock of its own.

## Quest counting

`acceptQuest` opens one order. Its shipped count starts at 0. `order.due` is set far ahead, is not shown, and does not change the quest's pay.

Checks are the goal lines on the quest rail. They read the live world every tick after accept. They never complete the quest and they never cost anything. Prepare sets the baseline that quest cares about. Those baselines are the `prepare` functions on `questList`. Bram and Odile do not reset the furnace. Their delivery counts still start at zero when the quest is taken. A program that cleared the previous quest does not pass the next one.

**Hand over** pays `pay` and `xp` in full, then clears the quest id. Waste on the ledger does not reduce that payout or the balance. A tick cannot lower the balance. The shop can.

## Save and frame

The save is version 3 under `inherit.v8.kettlewick`. It stores the world, the deployed files, and the editor files. An unreadable slot is archived. Project files are kept when the world cannot be trusted. Unknown saves follow [ADR 0004](../adr/0004-v3-save-reset.md).

The frame is the standing shell, arranged in [the screen layout](v8-screen-layout.md). Goal lines are on the quest rail. The Checks tab is the error log. Deploy sits on the editor. The nav is the logo, the place, credits, level, and Settings. CPU shows in the status bar when the tick has spent at least half its budget or has hit the limit. A call that would pass the limit does not run, and the guest stops the rest of that tick's player code. The sim tick still finishes.

## Standing rules

- Game rules live in `packages/sim/src/v8/`. Player code runs only in QuickJS. The worker owns the session. The page renders snapshots.
- Do not edit pack content for a v8 change. Shared sandbox changes must keep pack tests green.
- Do not rebuild the frame. Adapt the components that are already there.
- Before a PR: `pnpm test`, `pnpm typecheck`, and `pnpm build`. Nick playtests. No browser suite and no screenshots.

## Not settled

[ADR 0026](../adr/0026-quantity-quests-one-world.md) lists the shipped behavior that still contradicts the vision. Do not invent a deadline, a rent charge, a par time, or a wipe in its place. Audit, a key to a quest branch, and the next world are not in the code.
