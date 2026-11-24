# Run to completion, then Loop

Accepted 24 November 2026. Supersedes the trigger order in [ADR 0025](0025-functions-with-triggers.md): buttons, then Run, then Loop and `onTick`, then `on()`. [ADR 0029](0029-pure-functions-machine-tasks.md) supersedes the Run rule below: a function finishes in one tick, and `yield` does not continue it. Amends [ADR 0026](0026-quantity-quests-one-world.md) and [ADR 0027](0027-shop-veins-one-delivery.md) where they repeat that order. [ADR 0014](0014-watched-runs-then-the-loop.md) stays the pack history.

## Context

Nick played the first quest on 24 November 2026 and then ran `smeltOnce` by hand. Run executed one step per tick, so a walk, a mine, a walk back, an unload, and a smelt was a handful of clicks. The second quest asks for 16 ingots. `onTick` did not open until Elsie, and the game never showed how to make code run every tick.

The API list opened from the header and sat under the code. The quest rail listed test rows such as `call at the furnace 0/1` beside the villager's ask, on a yellow panel. A Checks tab repeated the console.

## Decision

**Run finishes the function.** One Run plays an exported function until it returns. `yield`, or `return false`, waits one tick and the same call continues. A generator can walk, mine, and unload across ticks. A function that returns on the first tick still finishes on that tick. The toolbar shows the function's name while it runs, and Stop ends it. `drone.moveAlong` and `drone.mine` stay one step per call.

**Quest 1 is buttons and Run.** Taking Bram's quest grants Run. Buttons stay. There is no Loop yet.

**Quest 2 grants Loop.** Taking Ines's quest grants the loop. A Loop control next to Run starts the function again each time it finishes, until Stop. `onTick` is that same loop in code: while Loop is on, and no Run is in progress, the works call `onTick` once per tick. Turning Loop off lets the current pass finish and does not start another. Stop holds the works until Run or Loop. Taking the quest turns Loop on when the player did not already have it. A save that already had the tick loop keeps it on.

**`on()` comes later.** Taking Elsie's quest grants `on(event, fn)`. Odile grants `furnace.alloy()` and drone-2, and no trigger.

**Old saves keep what they had.** A save with no `automation` field keeps Run, `on()`, and `onTick`, and Loop stays on. A save that already recorded triggers is pinned to the old order: reaching Ines keeps Run, reaching Odile keeps `on()`, reaching Elsie keeps `onTick`. The new rules also grant a trigger once the player has reached the quest that grants it now, so a player past Ines can use Loop, and a player who already had `on()` on Odile keeps it. Start over is a fresh world: buttons only, Loop off.

**Show the trigger once.** Taking a quest that grants a trigger inserts one example into the open file, with a comment, the same way a villager note is inserted once. Deleting it does not bring it back. A file that already exports `onTick` does not gain a second one. The villager's line stays above the example.

**The API is a book in the editor.** A button on the editor toolbar opens it over the page. It is not a panel under the code, and it is not a header button. Sections follow the objects: furnace, drone, depot, veins, events, and the rest of the works. Each entry is the signature, one line of meaning, and an example with a comment. A locked call stays visible and names the quest that unlocks it. The text is the brick list and the trigger docs. The editor's completion and hover use that same text. A locked call stays out of completion until the quest is taken.

**The rail is the villager.** The card is the title, the portrait and the ask, one sentence of what is needed and how it is made, one quantity bar, and the reward tiles. The panel uses the same surface as the other panels. Test rows are not on the rail. They are a list on the right of the editor, each row clickable, with a plain line for what it checks and the stuck reason when there is one. The Checks tab is gone. The console stays.

## Consequences

- The chain stays in `packages/sim/src/v8/quests.ts`. The book is `apiBook` over the same bricks. The arrangement is [the screen layout](../specs/v8-screen-layout.md). The glossary is `CONTEXT.md`.
- A program that cleared the previous quest still does not pass the next one. Harrow still fails a manual run. Loop and Run count. `onTick` does not.
