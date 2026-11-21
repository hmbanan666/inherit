# Beginners write the controller from scratch, and task words are method names

Playtesting v3, a beginner reached Bram's step "tell the furnace to smelt" and was stuck: there was no `smelt` method, only `ctx.work`, and autocomplete on `ctx.` listed a dozen unexplained methods. A `Factory` object passed into a function the player never wrote was the hardest part of the game, not the easiest.

From now on:

- `main.ts` starts as a comment from Uncle and nothing else. The first step explains in plain words that the factory runs the exported `onTick` function every tick, and the player writes it himself. Every line in the controller is one the player typed.
- Machines are handles, not string IDs. Uncle's machines are named exports of the `"inherit"` module (`import { mine, furnace, cart } from "inherit"`), new ones come from `build(kind, { name })` or `machine(name)`. Verbs live on the handle: `mine.dig()`, `mine.connect(furnace)`, `furnace.smelt()`, `press.stamp()`, `cutter.cut("wire")`, `splitter.peek()`, `splitter.send(copper)`, `furnace.repair()`.
- A word in a task or hint is the exact method name in code. If the request says smelt, the code says `smelt`. A test type-checks every hint line against the declarations unlocked at that step.
- One new verb per step. Each step has a short card (what the verb does, a tiny example with a blank to fill) and a two-rung hint: the idea first, then the exact line. Autocomplete and the API reference show only the verbs unlocked so far.
- The abstraction cheats in the player's favour: `dig()` quietly waits when the belt is full, `connect` and `build` are idempotent, calling a verb every tick is always safe.
- Later in chapter 1 the player writes his own helpers (for example `function fixBroken()`), so he grows a small framework of his own.

The low-level `ctx` API (`ctx.dig("mine")`, `ctx.work`, `ctx.route`, ...) still exists and is still passed to `onTick`, so older controllers and the v2 snapshot keep running. It is no longer taught or shown in chapter 1 and can return later for advanced play.
