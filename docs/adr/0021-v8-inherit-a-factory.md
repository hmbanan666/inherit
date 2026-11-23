# v8: inherit a factory, play on ticks

Accepted 23 November 2026. Supersedes ADR 0015, 0016, 0018, 0019 and 0020, and ADR 0008. Amends ADR 0005, 0010, 0011, 0014 and 0017.

## Context

v5 to v7 made Inherit a course: packs, 52 lessons, step cards, solved cards. Nick played v7 and found it a heavy textbook with no gameplay, hard for juniors and no longer a game. The early prototypes, with ticks, a CPU budget and a world that answers your code, felt like a game. Nick wants that back, with what we learned since, and a foundation that the game can grow on without starting over.

## Decision

**One game, not packs.** Inherit is one game about an inherited factory. There are no packs, courses, lessons, step cards, prefill or solved cards. The [v8 concept](../concept/v8.md) describes it.

**Inheritance.** The player inherits Kettlewick Works with Uncle's code: it works, but it is slow, spends too much CPU and breaks. The loop has three layers: improve the inherited core, write your own code on top, fill orders for credits that unlock API versions, stations, drones and CPU.

**Ticks and CPU, like Screeps, at the pace of Factorio.** The world runs on ticks of 0.5 s at 1x with 2x and 4x. The exported `onTick` runs every tick within a CPU limit. Every API brick has a fixed CPU cost, and the rest of a tick is skipped when the limit is spent. Results show within seconds. A session lasts 20 to 40 minutes and ends with an audit and a result screen. The world pauses when the player leaves.

**Pressure comes from the world.** Everything is finite: veins run dry, new veins are farther or impure, rent for drones, stations and CPU is charged every tick. Orders have deadlines in ticks, and late orders pay less. Bankruptcy ends the session. Difficulty grows through strategy and resources, and each crisis is a new kind of problem, not more of the same. There are no wall-clock timers.

**The API is part of the world.** Bricks come in API versions with a changelog. New versions add bricks, deprecate old ones and occasionally break them, so the player's own code base evolves like real code.

**Learning hidden inside.** API cards with examples and CPU costs, hover help, plain-word errors, hints from the world. Later an AI agent in the world through MCP.

**Fixed core, content as modules.** A deterministic core (ticks, CPU meter, ledger, orders, events, saves) changes rarely. Stations, resources, bricks, orders and crises are modules; a site is data. New features extend the same game. Saves carry schema and module versions and migrate; the player's `lib/` files are never lost.

**Kept.** The frame: top nav, charcoal palette, game area beside Monaco, wide Run at the top right, compact coloured status under the editor, no wall-clock timers. The QuickJS sandbox, the worker, plain-word errors, the API registry of ADR 0009 and the archive policy of ADR 0004.

## Replaces

- ADR 0018 (game packs), 0019 (one screen, two tracks) and 0020 (one step at a time) as the product. ADR 0020's self-contained exercise format may still serve optional side contracts.
- ADR 0015 (lesson flow in the sim) and ADR 0016 (a village that grows), whose growth idea now lives in API versions and unlocks.
- ADR 0008 (no pressure): v8 has deadlines in ticks, rent and bankruptcy, with the world paused while away.
- ADR 0010 (start from an empty file): the player starts from inherited code. Its rule that task words are the names in code stays.
- ADR 0005 and 0011: the CPU meter, credits and orders are visible from the first tick. The screen still shows a section only once it has content.
- ADR 0014 and 0017: no watched, call-by-call replays; Run deploys onto the live clock. Routine failures still show at the station with a Console line.

## Consequences

- New code lives in `packages/sim/src/v8/` and a new route; the pack code is removed in its own PR once the first v8 slice is live.
- Pack saves are archived under ADR 0004; v8 starts fresh.
- The glossary in `CONTEXT.md` gains v8 terms; pack terms stay until the packs are removed.
- The first playable slice is planned in [the v8 spec](../specs/v8-first-playable.md).
