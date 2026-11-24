# Soft occupancy

Accepted 24 November 2026. Amends the movement sentence in [ADR 0029](0029-pure-functions-machine-tasks.md): a drone step no longer shares a cell. `findPath` stays the beginner route. [ADR 0035](0035-balance-simulation-gate.md) still gates the reference run.

## Context

Two drones can stand on one cell. The map draws them a few pixels apart, so the overlap is easy to miss. A station was no exception: the depot, the furnace, the press, the lathe, and the assembly table are ordinary cells. Tasks stop beside a machine, and `moveAlong` can step onto the cell itself. Either way, a second cart could occupy the same square.

`findPath` walks an empty map. Beginners call it every time they move. The engine, not the route, is the place that sees the other cart.

## Decision

**One drone on a cell.** That includes every station. A cart that wants a station another cart already holds waits beside it. The number of ticks it waits before looking for another way is `occupancyWaitTicks` in `packages/sim/src/v8/occupancy.ts`. It is 3.

**The step waits, then goes around.** When the next cell holds a drone, the step does not land there. After 3 ticks on that same cell the engine looks for a walk around the blocked cell toward the goal. It keeps that way around until it is close enough, or until the blocked cell is empty. It does not step back onto the blocked line and start the wait again. A task that only needed to get next to a machine can finish on another free side. If there is no way around, the cart keeps waiting. Each new block starts the count again. The log writes once per block, at the third tick, for example `drone-2 waited 3 ticks at the furnace`. It does not write again until the cart has moved on and blocked again.

**A swap is broken on the tick it appears.** If two carts want each other's cells, or a longer loop of the same kind, the lower drone id steps aside onto a free neighbour. If it has no side cell, it backs off one cell. If it has no free neighbour at all, the next cart in the loop backs off one cell. The other cart then takes the cell it wanted, when that cell is free. The tick always finishes. A narrow corridor with one passing cell lets the lower id step into it so the other can go by.

**`findPath` is unchanged.** It does not look at drones. `moveAlong` and a machine task both ask the engine for the step, so a remembered route still works when someone is standing on it.

**Two optional calls.** `isFree(cell)` is true when the cell is on the map, empty, and not reserved. `reserve(cell)` claims a free cell for 3 ticks, or until a drone steps on it. Engine steps leave a reserved cell alone. `moveAlong` may step onto a cell the player just reserved. Neither call is granted by a quest, and neither is required to finish one. Both cost 0 CPU. The API book lists them with the drone.

**A second cart does not spawn on an occupied depot.** The lower id keeps the cell. The new cart stands on the nearest free cell. An old save is separated the same way, and a drone with no wait fields is given them.

**Waiting is visible.** The cart draws a small pause mark in the same gold as the route line, from the first tick it waits. No new drawing.

## Consequences

The reference run records wait ticks per quest in the balance report. Those ticks are already inside the quest duration. A quest that gets slower than the balance gate, or a human-time warning that moves by more than noise, is retuned or called out in the change. Players who never call `isFree` or `reserve` still finish.
