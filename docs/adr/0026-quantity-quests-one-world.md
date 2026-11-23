# Quantity quests, one map per world

Accepted 23 November 2026. Amends [ADR 0022](0022-quest-loop-no-loss.md). Supersedes ADR 0022's speed-bonus and par-time clause, ADR 0022's shop-tier schedule, and the "a vein runs out" example in [ADR 0021](0021-v8-inherit-a-factory.md). Does not replace [ADR 0023](0023-quest-unlocks-functions.md), [ADR 0024](0024-quest-rail-and-status.md), or [ADR 0025](0025-functions-with-triggers.md).

## Context

Nick's product vision of 23 November 2026 is the game. #88 and #89 already grant a function when the quest that needs it is taken, keep veins infinite, deliver quest goods through the depot, and unlock buttons, then Run, then `on()`, then `onTick`. This ADR writes down the rest of that vision and withdraws the earlier clauses that contradict it. Where the code still does something the vision forbids, this ADR does not choose a replacement.

## Decision

**Quantity quests.** A quest asks for a count of goods. It does not ask for a rate, a deadline, or a par time. There is no speed bonus. ADR 0022's bonus of 25% XP for finishing within a par time is withdrawn. That bonus was never in the code. No pause and no speed buttons stay as ADR 0022 decided them. The game is calm.

**Veins.** [ADR 0023](0023-quest-unlocks-functions.md) already decided this: veins are infinite, each with a purity and a rate, and the early veins are poor and slow. ADR 0021's example that a vein runs out is withdrawn.

**The shop.** [ADR 0023](0023-quest-unlocks-functions.md) already decided that a new function is granted by taking the quest that needs it, and is never bought. The shop sells conveniences and keys to new quest branches. A key is not a function. ADR 0022's level-by-level shop schedule, including the lines that put alloy and prospect on sale, is withdrawn. The shop lists every convenience at once. What a key is, which branches exist, and whether a purchase spends credits are not decided here.

**One world, one map.** A world is one continuous map. There are no rooms. A world is about ten hours of play. New content ships as a new world. The player's files, credits, and XP are not wiped to start it. ADR 0022's audit, if it is built, is a summary and not a wipe. The Kettlewick grid on screen now is the first slice of a map, not a room and not those ten hours.

**Code is the automation.** Satisfactory is the reference, kept small. The player works the machines by hand first. Code is how the works run after that. The order is the one in [ADR 0025](0025-functions-with-triggers.md): buttons, then a function with Run, then `on(event)`, then `onTick`. This ADR adds no new machine and no new system.

**Depot.** [ADR 0025](0025-functions-with-triggers.md) already decided this. A quest takes ingots and steel from the depot. Those goods stay in the furnace until a drone picks them up and unloads them there.

**Screens.** [ADR 0021](0021-v8-inherit-a-factory.md) and [ADR 0022](0022-quest-loop-no-loss.md) already decided this. Build on the frame and the components that are there.

## Still in the code

These contradict the decision above. This ADR does not change them, and it does not say what should replace them.

- Elsie's quest clears ore after 48 ticks and coal after 24, and the ask says the ore cools.
- Wen's quest checks how often `findPath` was called, not only how much steel arrived.
- Harrow's quest checks that the goods arrived with no manual runs, and it pays no XP.
- The shop subtracts credits. There is no key.
- The map is a 16 by 6 grid.
- A site with no quest list still ships from the furnace and can cut pay after `due`. Kettlewick has a quest list, so that path is not what the player hits. `order.due` is still stored on a quest order.
- Villagers also take depot goods on their own, and `ship()` can draw from the depot as well.

## Consequences

- The vision lives in [the v8 concept](../concept/v8.md). The chain and the shop catalog live in `packages/sim/src/v8/quests.ts`. The arrangement lives in [the screen layout](../specs/v8-screen-layout.md). The glossary is `CONTEXT.md`.
- Do not add a par time, a rate goal, rent, or a wipe to fill a gap this ADR left open.
