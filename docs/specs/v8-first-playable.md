# v8 first playable slice

This file is what the code does. The vision is [the concept](../concept/v8.md). The chain and the prices are `questList` and `shop` in `packages/sim/src/v8/quests.ts`. The arrangement is [the screen layout](v8-screen-layout.md). [ADR 0027](../adr/0027-shop-veins-one-delivery.md) names what is still open. Those places are listed at the end. This file does not choose a replacement.

Where an older milestone mentioned rent, pause, speeds, bankruptcy, deadlines, a speed bonus, Mayor Hale, three starting drones, `defineModule`, or a starter that already delivers, that milestone is withdrawn.

## Playable now

Nick opens `/`. Nobody is asking until he takes a quest. Bram is first, at level 1: buttons on the furnace and the drone, and two ingots taken from the depot. **Hand over** pays that quest's credits and XP when every goal line passes. Shipping does not pay. The next villager waits until this one is handed over and the level is high enough. The clock keeps ticking while the tab is hidden. There is no pause and no speed button.

`/` is the game. Packs were removed ([ADR 0030](../adr/0030-packs-removed.md)). The logo opens this page and the current save.

The site is Kettlewick Works. Its numbers live on `kettlewick` in `packages/sim/src/v8/sites/kettlewick.ts`.

- One drone, capacity 3, until Odile is handed over. That hand-over puts drone-2 at the depot. Vein A is poor ore (5 ticks, 1 rock) and vein B is poor coal. Vein D is normal ore (2 ticks, 1 rock), further out than A and closer than vein C. Vein C is hidden rich ore (1 tick, 2 rocks) until `prospect()`. Veins do not run out. `dump()` drops ore or coal. Mining the other rock does that on its own and writes an info line. Ingots and steel stay in the cart.
- The furnace turns 2 ore into 1 ingot in 4 ticks. The hopper holds 6 ore and 3 coal. Output holds 6 ingots and 6 steel. Unload fills the free hopper space and the drone keeps the rest.
- A fresh `main.ts` exports `smeltOnce` and does not call it. `uncleMain` is the old loop, with `const home = false`. A fresh world does not start there. Old saves can still be running it.
- Ingots and steel stay in the furnace until a drone picks them up and unloads them at the depot. Collect is that pickup. `takeFromDepot` moves the open quest's goods from the depot onto the order. That is the only delivery. `ship()` does not move goods. An old file may still import it. The call does nothing, and the file still runs. There is no shipment from the furnace and no half pay.
- Run unlocks when Bram is handed over and calls one exported function once. The drone keeps the command. Loop and `onTick` unlock when Ines is handed over and call `onTick` every tick. `on()` unlocks when Elsie is handed over. `furnace.alloy()` unlocks when Odile is taken. `prospect()` unlocks when Harrow is taken. The shop does not sell those, and it does not sell drone-2. A `bought` list that still contains `alloy`, `prospect`, or `drone` keeps what it already granted. Nothing is refunded. Credits are not reset. A save with no `automation` field keeps every trigger. A save that already recorded them keeps the ones it had. A Harrow save that already delivered 60 ingots can still be handed over.
- CPU limit 30. Tick 500 ms. Credits 300. Level 1. XP 0. Level thresholds are `levelFor`.
- `buyUpgrade` refuses an unknown id, an owned item, and an item the player cannot afford, and it does not change the balance when it refuses. A purchase that succeeds subtracts the price.

The worker runs one tick on that interval even when the tab is hidden. The visibility message does nothing. The sim has no UI and no clock of its own.

## Quest counting

`acceptQuest` opens one order. Its shipped count starts at 0. The order has no due tick.

The rail shows the title, the ask, what is needed, and one quantity bar. Checks are the test rows beside the code. They read the live world every tick after accept. They never complete the quest and they never cost anything. Prepare sets the baseline that quest cares about. Those baselines are the `prepare` functions on `questList`. Bram and Odile do not reset the furnace. Their delivery counts still start at zero when the quest is taken. A program that cleared the previous quest does not pass the next one.

**Hand over** pays `pay` and `xp` in full, then clears the quest id. Odile's hand-over also grants drone-2. A tick cannot lower the balance. The shop can. Empty `smelt()` or `alloy()` does not change the balance.

## Save and frame

The save is version 3 under `inherit.v8.kettlewick`. It stores the world, the deployed files, and the editor files. An unreadable slot is archived. Project files are kept when the world cannot be trusted. Unknown saves follow [ADR 0004](../adr/0004-v3-save-reset.md).

The frame is the standing shell, arranged in [the screen layout](v8-screen-layout.md). Goal lines are on the quest rail. Tests and Console share the pane beside the code. A failed save, a failed restore, and a floor renderer error are console rows, and the same line stays above the list. Deploy sits on the editor. The nav is the logo, the place, credits, level, and Settings. CPU shows in the status bar when the tick has spent at least half its budget or has hit the limit. A call that would pass the limit does not run, and the guest stops the rest of that tick's player code. The sim tick still finishes.

## Standing rules

- Game rules live in `packages/sim/src/v8/`. Player code runs only in QuickJS. The worker owns the session. The page renders snapshots.
- Do not edit pack content for a v8 change. Shared sandbox changes must keep pack tests green.
- Do not rebuild the frame. Adapt the components that are already there.
- Before a PR: `pnpm test`, `pnpm typecheck`, and `pnpm build`. Nick playtests. No browser suite and no screenshots.

## Not settled

[ADR 0027](../adr/0027-shop-veins-one-delivery.md) leaves three things open: the level curve after this chain, what fills the ten-hour world, and Harrow's no-manual-runs check with its zero XP. Do not invent a deadline, a rent charge, a par time, a key, or a wipe in their place. Audit and the next world are not in the code.
