# v8: inherit a factory, play on ticks

Accepted 23 November 2026. Amended 23 November 2026 by [ADR 0022](0022-quest-loop-no-loss.md), [ADR 0023](0023-quest-unlocks-functions.md), and [ADR 0026](0026-quantity-quests-one-world.md). Supersedes ADR 0015, 0016, 0018, 0019 and 0020, and ADR 0008.

> ADR 0023 withdraws "the shop is how a locked brick becomes available" and the example that a vein runs out. A function is granted by taking the quest. Veins do not run out. ADR 0026 withdraws any reading of this file as a rate or a deadline. [ADR 0030](0030-packs-removed.md) withdraws the sentences that keep packs at `/?packs`.

[ADR 0022](0022-quest-loop-no-loss.md) replaces the clauses that specified deadlines, rent, bankruptcy, pause, speed buttons, a ban on the quest card and on visible checks, and the removal of packs. Those sentences are withdrawn. The decisions below that ADR 0022 does not replace still stand.

## Context

v5 to v7 made Inherit a course: packs, lessons, step cards, solved cards. Nick played v7 and found it a heavy textbook with no gameplay. The early prototypes, with ticks, a CPU budget and a world that answers code, felt like a game. v8 is that game: one inherited factory, played on ticks.

## Decision

**One game, plus a legacy mode.** The product is one factory game. Courses, lessons, step cards, prefill and solved cards are not part of v8. The quest card and the checks under the editor are part of v8, and ADR 0022 specifies them. The shipped packs remain playable at `/?packs` and are not deleted.

**Inheritance.** The player inherits Kettlewick Works, Uncle's workshop in a village, with Uncle's code. The code runs and does not finish the work. ADR 0022 is the quest loop, the shop, and the save.

**Ticks and CPU.** The world runs on ticks. The exported `onTick` runs every tick inside a CPU limit shown in the frame. The sim is deterministic and has no UI, so a later server can own the clock. v8 has no pause and no speed buttons. ADR 0022 is the overflow rule.

**No loss.** The world can strain the code: a vein runs out, a recipe needs two rocks, the CPU budget is finite. There is no deadline, no rent, and no bankruptcy. Credits never go negative, and a failed check costs nothing.

**The API is part of the world.** A brick has a signature, a doc line, a CPU cost and a `since` field. The shop is how a locked brick becomes available. Buying an API version is not the current unlock.

**Learning hidden inside.** API cards with examples and CPU costs, plain-word errors, and a hint that never contains the solution. Later, an assistant in the world through MCP.

**Fixed core, content as modules.** A deterministic core (ticks, CPU meter, ledger, quests, saves) changes rarely. Stations, resources and bricks extend it. A site is data. The player's `lib/` files are never replaced by the game.

**Build on what exists.** Every version builds on the existing frame and components. No screen is rebuilt from scratch. A redesign needs its own ADR.

**Kept.** The frame: top nav, charcoal palette, game area beside Monaco, wide Deploy at the top right, compact status. The QuickJS sandbox, the worker, plain-word errors, the API registry of ADR 0009, the live checks of ADR 0012, and the archive policy of ADR 0004.

## Replaces

- ADR 0018, 0019 and 0020 as the product. Packs stay as legacy. Those ADRs are not restored.
- ADR 0015 and ADR 0016. Growth is the village quest chain and the player's `lib/`.
- ADR 0008. The clock runs. ADR 0022 is the rule for loss and deadlines, not a return of "let the town wait".
- ADR 0002, 0003, 0005, 0007, 0010, 0011, 0013, 0014 and 0017, as recorded on those files and in ADR 0022.

## Consequences

- New game code lives in `packages/sim/src/v8/`. `/` opens v8. `/?packs` opens the legacy showcase.
- v8 saves follow ADR 0004: a save this version can resume, and an unreadable slot is archived.
- The glossary in `CONTEXT.md` uses the v8 terms. Pack terms name the legacy mode.
- The playable slice is [the v8 spec](../specs/v8-first-playable.md).
