# Rewards land on Hand over

Accepted 24 November 2026. Amends [ADR 0025](0025-functions-with-triggers.md), [ADR 0027](0027-shop-veins-one-delivery.md), [ADR 0028](0028-run-to-completion.md), and [ADR 0031](0031-quest-gift-before-take.md).

## Context

Taking Ines's quest turned Loop on at once. A new game could also show drone-2 on the map after a save or a start over, while My machines listed only drone-1. ADR 0025 and ADR 0028 grant a trigger on Take. ADR 0027 and ADR 0031 also give drone-2 to a save that is merely on a later quest.

## Decision

**One reward check.** Run, Loop, and `on()` are granted when the quest that names them is handed over, or when a later quest is already open or handed over. Taking the quest does not grant it and does not turn Loop on. Handing over Ines turns Loop on when the player did not already have it. The API book, the editor types, and the gutter mark read that same check. A locked call stays out of completion. The example for a trigger is inserted once, on Hand over, not on Take.

**drone-2 is that same kind of reward.** It is in the world only after Odile is handed over, or when a save already bought `drone`. The map, the machine list, the inspector, and `drones()` read `world.drones` after that check. A save that has drone-2 without either grant loses it. A save that already bought it, or has cleared Odile, keeps one. Being on Elsie, or any later quest, does not add it. The shop does not sell it, and taking a quest does not add a shop row.

**A function the quest tells you to call still opens on Take.** [ADR 0023](0023-quest-unlocks-functions.md) stays for `furnace.alloy()` and `prospect()`. Odile's checks count steel, and steel comes only from `alloy()`. The shop does not sell those calls.

**Old trigger saves.** A save with no `automation` field still keeps Run, `on()`, and `onTick`. A save that already recorded a trigger keeps it. A save whose Loop was only the premature grant, with the trigger still locked, has Loop turned off on load.

## Consequences

- The chain stays in `packages/sim/src/v8/quests.ts`. `syncSecondDrone` is the drone check. `triggerUnlocked` is the trigger check.
- The card marks a trigger and drone-2 On hand-over. A function stays On Take.
