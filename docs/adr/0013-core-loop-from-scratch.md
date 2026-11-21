# Core loop: build the factory from scratch with three primitives

## Context

The frame works and stays: the IDE, the navigation, the game area, the overall layout, the checks panel and the palette (ADR 0006, 0009, 0011, 0012). What did not work is the coding gameplay itself. v3 first taught a low-level `ctx` API, then ready-made machine handles with verbs (ADR 0010, PR #38). In both cases the player used a library he did not write, kept asking "what is this and where does it come from?", and never saw what the factory really does underneath. Separately, a running furnace and cart earned coins forever, so with no timers (ADR 0008) the debt paid itself while the player waited.

This ADR redesigns only what the player writes. The implementation must fit the existing frame. A throwaway prototype of this loop lives in `prototypes/from-scratch/index.html`.

## Decision

**Primitives.** The world exposes three physical actions, imported by name from `"inherit"`:

- `take(place)` picks up the front finished item at a place and returns its name, or `undefined` if nothing is ready. The mine is a place; Uncle's shovel keeps a rock ready every few ticks.
- `put(place, item)` puts an item you just took into a machine or the cart, returning `true`, or `false` if it does not fit. An item you took but did not put goes back where it came from by the end of the tick. Nothing is lost.
- `look(place)` returns a small report `{ status, inside, ready }`; for the cart also `wanted` (what the town asks for now) and what is waiting unsold.

The story adds two non-physical actions when it introduces them: `buy(kind, name?)` when Bram sells his press (charged once per name), and `repair(machine)` with the breakdowns. Nothing else is exported in chapter 1. `onTick` takes no arguments. The API reference opens with a tiny "What inherit exports" card, and autocomplete inside the import braces lists the same names.

**Machines work by themselves.** A machine processes as soon as it holds its inputs, and the recipe follows from the input: iron ore in a furnace makes an iron ingot, copper ore a copper ingot, an ingot in the press a plate, two plates in the cutter a gear, copper ingots in the cutter wire, a plate and wire in the assembler a bracket. A finished item waits until it is taken. Mixing ores in one furnace jams it; taking from a jammed machine pulls the wrong item out. Belts are not taught in chapter 1. A belt is the player's own function, and the floor view animates every take and put so the player sees what his code did.

**The player writes the verbs, in this order.** Each request asks for one new function in plain words, and the word in the task is the function's name:

1. Bram: `onTick` with a `console.log`, Deploy, `take("mine")`, then his first functions `dig()`, `smelt()` (put a dug rock into the furnace) and `ship()` (furnace to cart).
2. Mrs Harrow: the debt and what coins are for.
3. Elsie: `buy("press")` and `stamp()`; `ship()` changes to take from the press.
4. Mixed vein: `look` and `if`: `smelt()` sorts copper ore into a second furnace bought as `buy("furnace", "copper")`, plus an `unjam()`.
5. Tomas: `cutWire()`; a cutter on copper ingots.
6. Breakdowns: `fixBroken()` loops over his furnaces with `look(m).status` and `repair(m)`.
7. Wen: the pairs repeat, so he writes `move(from, to)` with parameters and rewrites his verbs with it; the cutter makes gears.
8. Competing orders: choose by `look("cart").wanted`.
9. The Mayor: brackets from the assembler; his helpers move into their own file with `export` and `import`.
10. The debt is paid.

**Coins come from people.** The cart pays only when an item fills an open request or order. Items nobody asked for wait in the cart ("nobody ordered these yet") and fill the next matching ask first. Orders are finite and paced by the story; a filled order does not come back on its own. Coins have two uses: buying machines and paying the debt. The chapter's total pay covers the machines the story needs plus the debt, with a little to spare. Progress comes from the story, never from waiting or grinding.

**Finishing chapter 1** means the bridge stands and Uncle's debt is paid. By then the player's controller is his own small framework: about ten functions he wrote and named himself, `onTick` a short list of calls, and the helpers in their own file.

**The loop of one request:** a townsperson asks, with a reason → checks show what must happen, red → the player writes or changes one function → Deploy → the floor shows each take and put → checks turn amber, then green → the person pays → coins buy the next machine or go to the debt → the town changes.

## Consequences

- This supersedes the handle API of ADR 0010 and the "ctx is still passed" rule. ADR 0010 still holds for starting from Uncle's comment, one new thing per step, two-rung hints, and task words matching names in code.
- Saves from the handle version restart chapter 1 and keep their code as a snapshot (as in ADR 0004).
- The engine keeps its machines, recipes and belts internally; chapter 1 simply does not teach belts or ship ready-made verbs.
- Checks, the request card chain and the growing sections stay; their texts move to the new verbs.
