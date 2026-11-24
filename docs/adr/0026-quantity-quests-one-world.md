# Quantity quests, one map per world

Accepted 23 November 2026. Amends [ADR 0022](0022-quest-loop-no-loss.md). Supersedes ADR 0022's speed-bonus and par-time clause, ADR 0022's shop-tier schedule, and the "a vein runs out" example in [ADR 0021](0021-v8-inherit-a-factory.md). Does not replace [ADR 0023](0023-quest-unlocks-functions.md), [ADR 0024](0024-quest-rail-and-status.md), or [ADR 0025](0025-functions-with-triggers.md). Amended by [ADR 0027](0027-shop-veins-one-delivery.md), [ADR 0028](0028-run-to-completion.md), and [ADR 0036](0036-region-1-fabrication-chain.md).

## Context

Nick's product vision of 23 November 2026 is the game. #88 and #89 already grant a function when the quest that needs it is taken, keep veins infinite, deliver quest goods through the depot, and unlock buttons, then Run, then `on()`, then `onTick`. This ADR writes down the rest of that vision and withdraws the earlier clauses that contradict it. [ADR 0027](0027-shop-veins-one-delivery.md) chooses the replacements this ADR left open.

## Decision

**Quantity quests.** A quest asks for a count of goods. It does not ask for a rate, a deadline, or a par time. There is no speed bonus. ADR 0022's bonus of 25% XP for finishing within a par time is withdrawn. That bonus was never in the code. No pause and no speed buttons stay as ADR 0022 decided them. The game is calm.

**Veins.** [ADR 0023](0023-quest-unlocks-functions.md) already decided this: veins are infinite, each with a purity and a rate, and the early veins are poor and slow. ADR 0021's example that a vein runs out is withdrawn.

**The shop.** [ADR 0023](0023-quest-unlocks-functions.md) already decided that a new function is granted by taking the quest that needs it, and is never bought. The shop sells conveniences only. ADR 0022's level-by-level shop schedule, including the lines that put alloy and prospect on sale, is withdrawn. The shop lists every convenience at once. A purchase spends credits. [ADR 0027](0027-shop-veins-one-delivery.md) is the catalog, the veins, and the delivery path.

**One world, one map.** A world is one continuous map. There are no rooms. A world is about ten hours of play. New content ships as a new world. The player's files, credits, and XP are not wiped to start it. ADR 0022's audit, if it is built, is a summary and not a wipe. The Kettlewick grid on screen now is the first slice of a map, not a room and not those ten hours.

**Code is the automation.** Satisfactory is the reference, kept small. The player works the machines by hand first. Code is how the works run after that. The order is the one in [ADR 0028](0028-run-to-completion.md): buttons, then Run until the function returns, then Loop and `onTick`, then `on(event)`. This ADR adds no new machine and no new system.

**Depot.** [ADR 0025](0025-functions-with-triggers.md) already decided this, and [ADR 0027](0027-shop-veins-one-delivery.md) keeps one path. A quest takes ingots and steel from the depot. Those goods stay in the furnace until a drone picks them up and unloads them there.

**Screens.** [ADR 0021](0021-v8-inherit-a-factory.md) and [ADR 0022](0022-quest-loop-no-loss.md) already decided this. Build on the frame and the components that are there.

## Still open

[ADR 0027](0027-shop-veins-one-delivery.md) settles the shop, Elsie, Wen, the veins, the second drone, and delivery. These stay open:

- The level curve after this chain. The steps in `levelFor` stay as they are.
- What fills the ten-hour world. The map on screen is still a 16 by 6 grid, the first slice.
- Harrow's quest checks that the goods arrived with no manual runs, and it pays no XP.

## Consequences

- The vision lives in [the v8 concept](../concept/v8.md). The chain and the shop catalog live in `packages/sim/src/v8/quests.ts`. The arrangement lives in [the screen layout](../specs/v8-screen-layout.md). The glossary is `CONTEXT.md`.
- Do not add a par time, a rate goal, rent, or a wipe to fill a gap this ADR left open.
