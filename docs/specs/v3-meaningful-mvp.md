# Spec: v3, a factory the town needs

## Problem

v2 has the right shape (one factory, one growing controller, editor plus floor, deploy with rollback), but no reason to play. Goals read like a checklist ("ship 3 iron ingots"), the CPU meter means nothing, and a beginner sees ten tools at once. Players asked "why am I doing this?"

## Solution

Chapter 1 is about one hour long. Your uncle left you the factory and a debt. The town of Kettlewick needs the factory: the blacksmith's forge is cold, the bakery oven is broken, Lamp Street is dark, the mill is stuck, and the bridge to Riverside is down. Each townsperson asks for something specific, for a reason, by a time. Fulfilling it changes the town on screen. Between requests, regulars send paid orders, and that money pays the debt.

Code matters because the floor misbehaves. The mine hits a mixed vein, an old furnace overheats, and two orders compete for the same plates. About 85-90% of play is code. Code builds the machines and belts and decides what to do when things go wrong. The canvas mostly shows what the code did, with animation, so every change is visible. The mouse only inspects, pans and zooms.

See CONTEXT.md for terms and docs/adr/ for the decisions.

## Decisions

1. Meaning comes from the town: named townspeople, requests with reasons, visible town changes, and the debt as the arc (ADR 0001).
2. Code builds, the canvas shows: no mouse building, the build palette goes away, click only to inspect (ADR 0007). Code handles hiccups: mixed input first, then breakdowns, then competing orders. Seeded and deterministic (ADR 0002).
3. Soft pressure only: late pays less, moods drop, missed installments add interest, no game over (ADR 0003).
4. Old saves start fresh, and old code is kept as a snapshot (ADR 0004).
5. Progressive disclosure: CPU, research tree, tests, metrics, drivers and the second site are hidden in chapter 1. Unlocks come from the story (ADR 0005).
6. Layout: editor stays on the right, plus a cheap "swap sides" toggle in settings that is remembered.
7. A Town view sits next to the factory floor as a tab ("Factory | Town"), with a slim town ribbon above the floor that shows open requests as speech bubbles. When a town change happens, the game shows it with a short celebration and a "See it" button that opens the Town tab.
8. Palette: near-black neutral background, much less green, the warm v1 accent (ADR 0006). Compare with v1 at commit 26defa1.
9. Town clock: one day is about 5 minutes at 1x speed, with a morning, day, evening and night tint. Deadlines are written in town time.

## Chapter 1 script (about 60 minutes at 1x, a beginner pace)

| # | Who | Request and reason | New thing | TS concept | Town change |
|---|-----|--------------------|-----------|------------|-------------|
| 0 | Uncle (letter) | "The shed is yours. So is my tab at the bank. Bram will come knocking." | the floor, main.ts | none | none |
| 1 | Bram, blacksmith | 3 iron ingots by evening, the mail horse threw a shoe. Onboarding: dig, deploy, belt, smelt, belt to cart, deliver | dig, work, deploy, `ctx.connect` | calling a function | Forge lights up, the mail horse trots by. Bram's orders (ingots) begin. |
| 2 | Mrs Harrow, banker (letter) | Debt of 600 coins: 100 by day 3, 200 by day 6, 300 by day 10 | Bank, Pay button | none | Bank sign shows the debt |
| 3 | Elsie, baker | 4 plates for a new oven grate by morning | press via `ctx.build("press")` (Bram sells you his old one) | choosing a recipe: `ctx.work("press", "plate")`, if with stock | Bakery chimney smokes, bread stall opens. Elsie's orders (plates) begin. |
| 4 | Hiccup: mixed vein | The mine now gives iron and copper ore (seeded, about 1 in 3). Copper jams the iron furnace. | `ctx.build` a splitter and a second furnace, peek, route | if/else, comparing strings, the MaterialId union | none (it is a problem) |
| 5 | Tomas, lamplighter | 5 wire for Lamp Street, dark since your uncle left. The copper is suddenly useful. | cutter (wire) | variables, small helper function | Lamp Street lights up at night. Tomas's orders (wire) begin. |
| 6 | Hiccup: breakdowns | Old furnaces overheat after long runs (seeded). Repair costs 5 coins, cooling takes about 60 s. | `ctx.repair(id)`, status "broken" | for...of over `ctx.machines()`, `memory` counters | none |
| 7 | Old Wen, miller | 3 gears by day 7, the water wheel lost its teeth | cutter on gears (2 plates each) | functions with parameters, a shared plate budget | Mill wheel turns. Elsie's orders grow. |
| 8 | Hiccup: competing orders | Elsie wants plates, and Wen's gears need plates. One press. | `ctx.orders()` (read only) | arrays: sort and find, choosing by deadline | none |
| 9 | Mayor Odile | 6 brackets to rebuild the Riverside bridge by day 10. The mayor gives you a filing cabinet. | assembler (plate + wire), multi-file controller | modules: export and import | The bridge is built and the Riverside district opens with two new townspeople (teaser). |
| 10 | Mrs Harrow | Final installment paid | none | none | Chapter card: "The shed is yours." Free play continues with orders from all regulars. A letter teases chapter 2: "your controller is getting slow" (CPU). |

Pacing guide: request 1 within 8 minutes, request 3 by about 20, the mixed vein around 22, request 5 by about 30, breakdowns from about 32, request 7 by about 42, request 9 by about 60. Money is always enough for the next machine if the player fills orders. Being late on everything still lets a player finish, only slower.

## Player API changes (chapter 1)

Keep: dig, work, space, route, peek, stock, machines, inspect, memory, console.log, onItemArrived/onMachineIdle (unlocked by the story when useful).
Change: `ctx.build(kind, opts?)` with `opts.name` (the machine id) and optional x/y, auto-placed on a free owned tile when x/y are omitted, idempotent by name (an existing machine is returned, no second charge, coins are paid on first build). `ctx.connect(from, to)` is idempotent too and auto-routes the belt. Both are available from minute one. Unlocked machine kinds come from the story.
Add: `ctx.repair(id): boolean`, `ctx.orders(): OrderView[]` (read only: id, who, items, filled, due, late), machine status `"broken"` and `"jammed"`, and `ctx.clear(id)` to dump a jammed bin (the items are lost).
Hide in chapter 1: dispatch/trucks, CPU budget, research.

## What we keep and cut from v2

Keep: the simulation engine, machines, belts, Blueprint API, sandbox, deploy, rollback, console, multi-file editor, floor renderer (as a visualization), save system.
Cut from the UI: mouse building (build palette, belt drawing, remove tool), the objective list and card, the research panel, the CPU meter, the Tests/Metrics/Drivers/Snapshots tabs (only Console is visible in chapter 1), the second site.
The code can stay where it is cheap to keep; the UI simply does not show it.

## Testing

- A sim playthrough test runs chapter 1 with a reference controller, which grows step by step like a player's would, and asserts every request and town change happens in order, within about 60 minutes of game time at 1x.
- A "lazy player" test: miss every deadline, and the chapter still completes.
- Save tests: a v2 save loads as a fresh chapter 1 with a "v2 code" snapshot, and garbage loads fresh without throwing.
- Browser test: a new player finishes request 1 by typing code only (no canvas clicks), and the Town tab shows the forge lit.

## Out of scope

Chapter 2 and later, CPU as a resource, multiplayer and leaderboards, sound, mobile layout.
