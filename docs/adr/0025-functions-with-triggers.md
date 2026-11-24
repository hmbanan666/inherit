# Functions with triggers

Accepted 23 November 2026. Amends [ADR 0022](0022-quest-loop-no-loss.md) and builds on [ADR 0023](0023-quest-unlocks-functions.md) and [ADR 0024](0024-quest-rail-and-status.md). Amended by [ADR 0027](0027-shop-veins-one-delivery.md): goods reach a quest only through `takeFromDepot`. `ship()` does not deliver, and a site does not ship from the furnace. [ADR 0028](0028-run-to-completion.md) supersedes the trigger order and the one-tick Run in this ADR.

## Context

The works already tick, and `onTick` is the only way a program runs. A new player meets a file that mines and never comes home. Buttons on the machines, a Run mark on a function, and `on()` are the steps before that loop. ADR 0023 grants a function when the quest that needs it is taken. ADR 0024 put the request on the rail and took the stock list off the footer.

## Decision

**Three triggers.** An exported function runs when something asks it to. [ADR 0028](0028-run-to-completion.md) is the order: Bram grants Run, Ines grants Loop and `onTick`, and Elsie grants `on()`. [ADR 0029](0029-pure-functions-machine-tasks.md) is the Run rule: the function finishes in one tick. The module top level still runs once, at deploy. A manual run spends CPU like any other call. Nothing is instant: a button spends the machine's turn.

**Unlock on take.** The same rule as `furnace.alloy()` and `prospect()`. A later quest keeps the earlier triggers. The shop does not sell them. A fresh world starts with buttons only. A save with no `automation` field keeps Run, `on()`, and `onTick`. Start over is a fresh world. A recovered file whose world could not be read keeps the triggers, so an old loop is not taken away.

**Events.** `furnace.full`, `furnace.ready`, `drone.idle`, and `drone.full`. Each fires on the edge, once. Veins do not run out, so there is no empty-vein event.

**The depot is the delivery point.** Ingots stay in `furnace.output` and steel in `furnace.steel` until a drone picks them up and unloads them at the depot. Villagers take goods from the depot. `ship()` on a quest draws from the depot. A site with no quest list still ships from the furnace. Counts already shipped, credits, and XP stay. An in-progress quest names what is still in the furnace and what is at the depot. The furnace holds 6 ingots and 6 steel. `smelt()` or `alloy()` at the cap throws and names the depot. Goods already above the cap stay.

**The inspector.** A click on the furnace, the depot, a drone, or a vein opens that object on the rail, in the same list as the shop. It shows what the object is, what it holds, the recipes, and the buttons. Each button names the call it performs. Dump calls `drone.dump()`. Clear hopper drops ore and coal and leaves ingots and steel. Mine and Unload walk, then act, one step a tick. The drone's hit target follows the sprite. My machines lists the same objects.

## Consequences

- A fresh file is a function with a comment, not Uncle's loop. Uncle's loop remains for old saves and tests.
- The concept, the first-playable spec, and the screen layout follow this ADR.
