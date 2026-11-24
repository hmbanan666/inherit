# Quest unlocks, hopper, infinite veins

Accepted 23 November 2026. Amends [ADR 0022](0022-quest-loop-no-loss.md). Amended by [ADR 0027](0027-shop-veins-one-delivery.md): credits are spent in the shop, and the second drone is Odile's reward, not a shop item. The sentences below that say otherwise are the record of that day. They are not in force.

## Context

ADR 0022 put `furnace.alloy()` and `prospect()` on the shop, at level 2 and level 4. Buying the function was the only way to call it. That felt like a toll on the quest that needed the function. The furnace also accepted every rock the cart brought, and a vein that ran out simply stopped the tick.

## Decision

**Functions come from quests.** Taking a quest that needs a new function grants it immediately. The shop sells conveniences and limits only: a hotter furnace, a bigger cart, a second drone, a bigger hopper, and CPU. It does not sell a function, and buying a convenience does not pass a check.

**Odile.** Taking Steel for the bridge grants `furnace.alloy()`. The card shows `Unlocks: furnace.alloy(): 2 ore + 1 coal -> 1 steel`. That line is the recipe, which a hint may show. Calling `smelt()` while the open quest asks for steel leaves one console note: `smelt() makes ingots. Steel comes from furnace.alloy().` Calling `alloy()` before the quest throws `furnace.alloy() unlocks with the quest Steel for the bridge (level 3).` [ADR 0036](0036-region-1-fabrication-chain.md) sets that level.

**Veins do not run out.** Ore and coal are infinite. What changes is the rate. Vein A and vein B are poor: `mine()` spends 5 ticks to put 1 rock in the cart, and a bar on the drone and the vein shows that progress. A normal vein spends 2 ticks for 1 rock. A rich vein spends 1 tick and yields 2. `vein.purity`, `vein.ticksPerUnit`, and `vein.yield` are readonly. A saved `left` count is dropped. Quests are quantities, never a rate and never a deadline. Harrow asks for 60 ingots and the why line says a richer vein is hidden. Taking that quest grants `prospect()`, which reveals vein C, and vein C is rich. The mill still asks for a count of ingots. A saved `bought` list that already contains `alloy` or `prospect` keeps the function. Nothing is refunded. Credits only accumulate. `dump()` drops ore or coal. Mining the other rock dumps the raw cargo and writes an info line. Ingots and steel stay in the cart.

**The hopper.** The furnace holds 6 ore and 3 coal. Those caps live on the site. Unload fills the free space and the drone keeps the rest. When there is no space it throws, and the sentence names the drone, what it still carries, and the hopper, for example `drone-1 keeps 2 ore; Furnace is full (6/6 ore). Wait for smelt() or unload at the depot.` The depot stays unlimited. `furnace.inputMax` and `furnace.coalMax` are readonly. Bigger hopper, in the shop, raises the caps to 12 and 6. A saved furnace that already holds more than the cap keeps the surplus and accepts nothing more until it is under the cap. A stuck check says `furnace full` when the hopper is what blocks the ingot or the steel.

**Showing the grant.** The API panel and the editor types list the function as soon as it unlocks. While that quest is the open one, the entry is marked new. The mark goes when the quest is completed.

## Consequences

- ADR 0022's shop-tier list (alloy at level 2, prospect at level 4) no longer applies.
- The concept, the first-playable spec, and the screen layout follow this ADR.
