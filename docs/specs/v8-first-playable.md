# v8 first playable slice

Governs: [ADR 0021](../adr/0021-v8-inherit-a-factory.md), [v8 concept](../concept/v8.md).

## Goal

Nick opens the site, sees Uncle's code and the works, presses Run and within a minute sees why the code is bad (CPU red, drones idle, credits falling). He fixes it, fills orders, survives vein A running dry and buys one unlock. About 20 minutes, minimal visuals: a grid of squares with labels.

## Scope

In: one site (Kettlewick Works), veins A and B (C comes with scan), 3 drones, 1 furnace, orders with deadlines in ticks, rent, CPU limit, one crisis (vein runs dry), three unlocks (drone, CPU +10, API v1.1 `scan`), audit and result screen, versioned save.

Out: art, market, drill and slag, build and stations, AI agent, rivals, side contracts, more sites, removing packs (separate PR after Nick plays).

## Rules for every milestone

- One PR per milestone, small, tracer bullet: each ends with something visible or testable end to end.
- Game rules in `packages/sim/src/v8/`; player code only in QuickJS; the worker owns the simulation; the page renders snapshots.
- Do not edit pack content (`packages/sim/src/packs/`). Shared sandbox changes must keep pack tests green.
- Minimal visuals and texts. Spend effort on the loop, not on polish.
- Numbers come from the site file so they can be tuned without code changes.
- Checks before PR as in `AGENTS.md`; squash-merge with an explicit subject and body, no co-author trailers or tool names.

## Milestones

### M1. Core, bricks and CPU (sim only)

- `v8/core`: seeded deterministic tick loop, world store (grid, entities), CPU meter, message queue.
- Brick registry: name, signature, doc line, example, CPU cost, `since`, optional `deprecated`, handler. Generate declarations for the `"inherit"` module from it.
- Module `mining`: `tick`, `cpu.used()`, `cpu.limit`, `memory`, `drones()`, `veins()`, `findPath`, `drone.moveAlong`, `drone.isNear`, `drone.mine`, `drone.unload` (into the depot for now).
- Site `kettlewick`: map, 3 drones, veins A and B, CPU limit 30, Uncle's movement code from the concept (without furnace and orders yet).
- Sandbox: weighted operation cost instead of a flat count when a cost table is given; when the limit is spent the rest of `onTick` is skipped and the line is reported. Packs keep the flat count.
- Headless `runSession(site, files, ticks)`.
- Tests: Uncle's code hits 30/30 and drones 2 and 3 never move; a cached-path solution moves all three under 15 CPU; same seed and code give the same world.

### M2. The frame plays it

- `/` opens v8; the pack UI stays reachable at `/?packs` until removal.
- Worker runs core and sandbox at 2 ticks per second, 2x and 4x, Pause, auto-pause when the tab is hidden.
- Layout of the standing frame: grid map left, Monaco right with Uncle's `main.ts`, wide Run top right, nav meters (tick, credits, CPU used/limit, red at the limit), Console under the editor with the CPU-limit line, API cards from the registry with CPU cost.
- Run deploys the edited code onto the running world without resetting it. Restart resets the site.
- Editor suggestions rank game API bricks above TypeScript keywords and globals (typing `sa` must offer `say` before `satisfies`, since Enter accepts the top item after PR #66). Unit test on the ranking.
- Browser test: open, Run, ore count rises, CPU meter reads 30/30.

### M3. Economy: furnace, orders, rent

- Module `smelting`: furnace (2 ore to 1 ingot in 4 ticks), `furnace.smelt()` burns 1 cr even when empty.
- Module `orders`: scheduled orders (`item`, `qty`, `due`, `pay`, `from`), `ship(order, qty?)`, late orders pay half, expired after a grace period.
- Ledger: rent per tick from the site, income, bankruptcy (credits below 0 for 50 ticks) ends the session.
- Uncle's full code from the concept.
- Orders strip under the editor: compact coloured rows (amber open with "due in N ticks", green on time, red late).
- Tests: Uncle's first-come shipping makes both first orders late; sorting by `due` makes them on time; Uncle's code alone loses credits.

### M4. Vein runs dry: crises and plain runtime errors

- `defineCrisis({ id, when, apply, message })` in core; crisis `vein-dry` from the site schedule.
- Vein A empty: `mine` throws "Vein A is empty..." as a plain-word runtime error under the line, with the raw message behind details (reuse the v7 translator).
- Foreman notes: a drone idle for 40 ticks, the furnace burning while empty, CPU at the limit for 20 ticks. One line each, deduplicated, in the Console.
- Tests: Uncle's code freezes after vein A runs dry; skipping empty veins keeps drones working on vein B.

### M5. Unlocks and API versions

- Unlock list in the nav (only items affordable soon): drone (+1 drone, rent), CPU +10 (rent), API v1.1.
- API version gating: declarations and cards show only bricks with `since` up to the owned version; calling a locked brick gives a plain error.
- v1.1 adds `scan(range)` (CPU 10) and reveals vein C. Changelog card on purchase. `@deprecated` support in declarations (tested with a fixture brick; real deprecation comes with `drill` later).
- Tests: buying v1.1 makes `scan` compile and find vein C; before that it does not compile.

### M6. Audit, result screen, saves

- Audit tick from the site (about 2400 ticks at the first tuning). Result screen: credits, orders on time, average CPU per tick, CPU per ingot, Uncle's lines still present, player's lines. One button: new session.
- Versioned v8 save in localStorage (`schema`, `site`, module versions, tick, seed, world, files, `lib/` files) with a migration hook; unknown saves archived per ADR 0004. Reload resumes paused.
- README and `CONTEXT.md` describe v8.
- Browser test: play to the audit at 4x with a reference solution and see the result screen.

### After the slice

Nick plays. Then: remove packs (one PR), tune numbers, next modules (market, drill and slag, build and stations), side contracts, AI agent hints.
