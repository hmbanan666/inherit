# Shop, veins, and one delivery

Accepted 24 November 2026. Amends [ADR 0022](0022-quest-loop-no-loss.md), [ADR 0023](0023-quest-unlocks-functions.md), [ADR 0025](0025-functions-with-triggers.md), and [ADR 0026](0026-quantity-quests-one-world.md).

## Context

[ADR 0026](0026-quantity-quests-one-world.md) left the shop key undecided and listed behavior that still contradicted the vision. Nick answered those questions on 24 November 2026. This ADR records the answers. The level steps in `levelFor` and the contents of the ten-hour world are not among them.

## Decision

**Credits.** A quest pays credits on Hand over. The shop spends them. The balance never goes negative: a tick cannot lower it, and the shop refuses a purchase the player cannot pay. There is no rent. Wording that says credits only rise is withdrawn, including the "credits only accumulate" sentence in ADR 0023.

**Elsie.** Elsie asks for a count of steel. Ore and coal do not cool and do not expire. Taking the quest still grants `onTick`. The cooling timer is gone.

**Wen.** Wen's check stays a check on `findPath`. It is not only a count of steel.

**The shop.** The shop sells conveniences only: a hotter furnace, a bigger cart, a bigger hopper, and CPU. There is no key to a quest branch. ADR 0026's key is withdrawn from the vision. The second drone is not for sale.

**Veins.** A poor vein spends 5 ticks to yield 1 rock. A normal vein spends 2 ticks to yield 1. A rich vein spends 1 tick and yields 2. On the Kettlewick map, vein A is poor ore and vein B is poor coal. A normal ore vein sits further from the depot than those early cuts and closer than vein C. Vein C stays hidden rich ore until `prospect()`.

**The second drone.** Handing over Odile's quest, the quest before Elsie, puts drone-2 at the depot. Elsie's check that drone-2 leaves the depot does not require a purchase. A save that already bought the drone keeps that drone. A save that has already cleared Odile, or is on a later quest, gains drone-2 if it is missing. Nothing is refunded. Credits are not reset.

**One delivery.** Goods reach a quest only from the depot. `takeFromDepot` is the mechanism: on each tick it moves the open quest's ingots or steel from the depot onto the order. `ship()` does not move goods. An old file may still import `ship`; the call does nothing, so the file still runs. There is no shipment from the furnace and no half pay after a due tick. The waste penalty is gone. `ledger.waste` is not stored. `order.due` is not stored. An old save still loads. Shipped counts, credits, and XP stay.

**Run.** In the workshop pack the try-once button is Try. Run is only the gutter mark on the v8 editor.

## Still open

- The level curve after this chain. The steps in `levelFor` stay as they are.
- What fills the ten-hour world. The Kettlewick grid on screen is still the first slice.
- Harrow's check that the ingots arrived with no manual runs, and that the quest pays no XP. It is unchanged.

## Consequences

- The vision is [the v8 concept](../concept/v8.md). The chain and the shop catalog stay in `packages/sim/src/v8/quests.ts`. The arrangement stays in [the screen layout](../specs/v8-screen-layout.md). The glossary is `CONTEXT.md`.
- Do not add a key, a cooling timer, a second delivery path, a due field, or a wipe to fill a gap this ADR left open.
