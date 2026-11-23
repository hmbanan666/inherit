# Chapter 1 · A factory the town needs

> Historical. This chapter was removed. It is not v8, and the debt and the teaching flow are not the game. The later note that the story still holds is withdrawn. [ADR 0026](../adr/0026-quantity-quests-one-world.md) is the vision. The legacy packs are a different mode.

Uncle left a shed and a 600-coin tab at Kettlewick Bank. Bram needs shoes for the mail horse, Elsie’s bread oven has lost its grate, and the bridge to Riverside is down. Each request changes something visible in town. The reference beginner spends about 56–60 game minutes reading, editing and running the chapter. Requests wait indefinitely and pay in full.

## One growing controller

The workshop opens on Code, with Bram’s request, the editor and Checks. Uncle’s comment is the whole of the initial `main.ts`. The focused file is `verbs/dig.ts`. Each task opens the small piece of the project the player needs to change. The card shows its bricks, a hint about the idea and the exact edit on request. Every named helper comes from a file the player wrote.

The bench runs the edited function and its actual imports in QuickJS on a throwaway factory. Green checks open the next task. Solved verbs remain accessible by signature in the collapsed **My library** panel. Revisions to a verb open its existing source. During a wire-up the player imports those verbs into `main.ts`, exports a parameterless `onTick()` and deploys. Checks now follow the running factory. Edits to library files take effect on the floor with the next deployment.

## Requests and lessons

| Request | Edit or action | Result |
| --- | --- | --- |
| Bram’s horseshoes | Write `dig()`, call it from `smelt()`, then write `ship()`. Import smelt and ship into onTick, log and deploy. | Three iron ingots relight the forge and get the post moving. |
| Mrs Harrow’s letter | Read the bank letter, choose Pay later or pay an installment. | The bank records the 600-coin tab. |
| Elsie’s oven grate | Write `stamp()`. Change `ship()` to collect plates, buy the press and wire the three verbs together. | Four plates repair the oven. |
| Mixed vein | Read the mine with `look` and branch in `smelt()`. Write `unjam()` to recover the stray ore. Buy a second furnace named copper. | Both ores have somewhere to go. |
| Tomas’s lamps | Write `cutWire()`, add wire to `ship()` and buy the cutter. | Five coils light Lamp Street. |
| Breakdowns | Write `fixBroken()` with a loop over the two furnace names, a status check and repair. Deploy it. | A broken furnace resumes production. |
| Wen’s wheel | Write `move(from, to)`. Rework smelt, stamp and ship with it, then feed two plates per gear to a second cutter. | Three gears turn the mill wheel. |
| Competing orders | Write `choose()` using the cart’s wanted list. Send plates to Elsie or call the gear-cutting verb for Wen. | Both finite orders are filled. |
| Mayor Odile’s bridge | Import the player’s own move into `assemble()`. Collect plates and wire, ship the brackets and deploy the assembler. | Six brackets open Riverside. |
| Mrs Harrow’s receipt | Pay the outstanding installments or the whole remaining balance. | The bridge stands and the shed is yours. |

## Player API

The named exports of `"inherit"` appear in the reference, declarations, import completion and runtime as each is introduced.

| Export | First available | Effect |
| --- | --- | --- |
| `take(place)` | Dig | Pick up the front finished item by name, or receive undefined. The mine keeps one rock ready. A jam exposes the stray input. |
| `put(place, item)` | Smelt | Try to place a held item. Returns a boolean. Every unused item goes back to its origin at tick end. |
| `buy(kind, name?)` | Elsie | Buy the named machine once. The story unlocks machine kinds. |
| `look(place)` | Mixed vein | Read status, inputs inside and the ready item. The cart also reports wanted materials and quantities waiting unsold. |
| `repair(machine)` | Breakdowns | Restart a broken furnace. |

Machines process their inputs automatically. Iron and copper ores make their respective ingots. The press flattens an ingot into a plate. The cutter turns copper ingots into wire or two plates into a gear. The assembler needs a plate and wire per bracket. The floor animates transfers and lets the player inspect machines and their source lines.

## Coins, sections and saves

Bram’s first payment reveals coins and debt. Only complete requests and finite story orders pay. The cart stores every unasked item and uses that stock first when matching work arrives. The chapter pays for the press, copper furnace, two cutters, assembler and debt. The player may repay in installments of 100, 200 and 300 or pay the balance.

The first real mine pickup reveals Factory. The first town change reveals Town, the first post-onboarding letter reveals Inbox and the first order reveals Orders. New sections carry a mark until visited. Speed stays at 1× and time of day appears through the light. The editor, top navigation, checks and console, footer, context menus and palette follow ADRs 0005, 0006, 0008, 0009, 0011 and 0012.

Older workshop saves start at Bram’s first task. Their working files, deployment and stored revisions survive in snapshots accessible through Deploy history. New saves retain the current lesson, files, live factory, cart stock, finite orders and section visits.
