# Pure functions, machine tasks

Accepted 24 November 2026. Supersedes the Run rule in [ADR 0028](0028-run-to-completion.md): a function does not span ticks, and `yield` does not continue it. The trigger order stays. Bram grants Run, Ines grants Loop and `onTick`, and Elsie grants `on()`.

## Context

ADR 0028 let one Run walk, mine, and unload by yielding. That removed a handful of clicks, and it also made a function a process. A player reading the file could not tell which step was running. A gutter mark could point at an edit while the deployed function was the one that ran. `on("drone.idle", haul)` at the top of the file failed, because Deploy evaluated the module with no host.

Bram's text described a full cart at the vein. A fresh drone is empty at the depot. Ines asks for 16 ingots, and the button route to that count was a long shift before Loop. Collect moved finished goods to the depot on a timer, with no drone and no haul. One Run during Harrow could leave Hand over closed after the 60 ingots were already at the depot.

## Decision

**A player function finishes in one tick.** Run calls one exported function once. The function reads the works and gives commands. `return false` does not call it again. A generator, if one is called, runs to its first `yield` and is then closed. Loop calls `onTick` every tick until Stop. Stop holds player code. A drone task already given keeps going.

**The drone keeps one task.** `drone.mine(vein)` walks to that vein and mines until the cart is full or the vein changes. `drone.unload(target)` walks to the furnace or the depot and unloads. `drone.pickup(furnace)` walks to the furnace, picks up ingots or steel, and unloads them at the depot. `drone.busy` and `drone.task` show that state. A new command replaces the current task. The same command for the same target leaves the task running, and the dig ticks stay. `moveAlong` and `dump` cancel the task. Dump of ore or coal drops it. An empty dump only cancels. A cart of ingots or steel throws and the task stays.

**`smelt()` and `alloy()` stay one-tick commands.** The player chooses ingot or steel. The furnace finishes the batch on its own. The works do not smelt because ore is sitting in the hopper.

**Buttons and code share those commands.** Quest 1 stays manual. Mine, Unload, Dump, Smelt, and Collect issue the same orders the API does. Collect is `drone.pickup(furnace)`. It does not move goods by itself.

**Bram asks for 2 ingots.** The pay stays 80 and the XP stays 20. The drone starts empty at the depot. Ines still asks for 16, and taking that quest grants Loop before the long count. Quests stay quantities.

**Harrow's hand-over follows the 60 ingots.** A gutter Run does not lock the saved quest. Loading a Harrow save whose order has already shipped 60 sets `manualRuns` to 0. Credits are not reset. Triggers already granted stay.

**Deploy supplies the host.** The documented `on()` example registers at module scope when `on()` is unlocked. A locked deploy throws. Registering the same function again does not add a second listener.

**Run uses the file the player sees.** A dirty `main.ts` deploys, then runs. The gutter mark says so. Marks are only on `main.ts`. A Run click in another file writes `Run starts an export in main.ts.` and does not call an export. A later Deploy clears drone tasks, so the new program gives the next command. Opening a save does not. A dig already started stays.

**Save and renderer errors stay visible.** A failed save, a failed restore, and a floor renderer error are console rows and count in the problems badge. The line above Tests and Console stays.

## Consequences

Old quest programs that walk with `moveAlong` and mine one step when they arrive still complete. A mine command given while the drone is already beside the vein digs once on that tick. The same command on the next tick does not dig twice. A pickup given beside the furnace takes the goods on that tick, and the next `moveAlong` cancels the delivery so an old haul can carry them itself.

A save's jobs become the drone's task. An in-progress collect becomes a pickup. Credits, XP, and granted triggers are left as they were.
