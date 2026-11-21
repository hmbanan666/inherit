# Inherit

A browser game where you run your late uncle's factory with TypeScript. The town of Kettlewick depends on that factory, and its people are the reason anything gets made.

## Language

**Town**:
Kettlewick, the place around the factory. It has buildings, people and districts, and it visibly changes when the factory helps it.
_Avoid_: map, world (world is the factory floor)

**Townsperson**:
A named person in the town with a job, a building and a mood. Every request and order comes from one.
_Avoid_: customer, NPC, client

**Request**:
A one-time, story-carrying ask from a townsperson with a reason and a town change when fulfilled. Bram asks for three ingots to shoe the mail horse. His request waits until the forge can supply them.
_Avoid_: objective, quest, goal, mission

**Order**:
A small paid job from a townsperson whose request is already done. Orders are finite and paced by the story; a filled order does not come back on its own.
_Avoid_: ticket, contract

**Coins**:
Money the factory earns only by filling a request or order. Spent on `buy` and on the debt. Items nobody asked for earn nothing and wait in the cart.

**Town change**:
The visible effect of a fulfilled request: a forge lights, a street gets lamps, a bridge is built, a district opens.
_Avoid_: reward, unlock

**District**:
A part of the town that is closed until a town change opens it, bringing new townspeople.

**Onboarding**:
Bram's request. In one file, `main.ts`, the player calls `take("mine")`, adds `put("furnace")`, takes the ingot to the cart, wraps those lines into `smelt()` and `ship()`, and finally hands them to `onTick` and deploys. Later requests extend and revise the same project.

**Onboarding step**:
One task with one new idea. Its card gives the story reason in two or three lines, the starter code has everything except the new line, and it ends on a solved card with Continue.
_Avoid_: tutorial levels, kata, exercise

**Debt**:
What the uncle owed the bank. The player pays when ready, in full or in optional installments. The balance has no due days or interest.

**Installment**:
An optional payment toward the debt, defined only by its amount.

**Day**:
One cycle of the internal town clock. Chapter one shows its phases only through the changing light on the town and factory.

**Hiccup**:
Something unplanned on the floor that code has to handle: a mixed ore vein, a furnace that overheats, a jam.
_Avoid_: incident, bug, failure

**Jam**:
A machine stopped by an item it cannot process, for example copper ore in an iron furnace.

**Breakdown**:
A machine that stopped from wear. It starts again when repaired, or after cooling down.

**Controller**:
The player's TypeScript project, a single `main.ts` until the Mayor's request moves his functions into their own file. It starts with Uncle's note and his import line. Once the loop is taught it exports `onTick`, which the factory runs every tick.
_Avoid_: script, solution

**Primitive**:
One of the three physical actions the world exposes from `"inherit"`: `take(place)` lifts the front finished item into the arm's hand and returns its name, `put(place)` puts whatever the hand holds, `look(place)` reports what is there. Everything else the player builds from them.
_Avoid_: machine method

**Story action**:
A non-physical action the story unlocks and exports from `"inherit"`: `buy(kind, name?)` with the press, `repair(machine)` with the breakdowns.

**Place**:
Anything you can take from, put into or look at, named by a string: the mine, a machine, the cart.

**Verb**:
Internal term for a function the player writes from primitives (`smelt`, `ship`, `stamp`, `move`, `fixBroken`). Player-facing text says "function". A word for an action in a request, hint or check is always the name of the function the player is asked to write.

**Framework**:
The player's own collection of functions. It grows inside `main.ts` and moves into its own file at the Mayor's request. The collapsed **My library** panel lists them by name and signature and opens their source.

**Check**:
A plain sentence about the world that the current task needs ("A rock reaches the furnace", "Ingots in Bram's cart: 1 / 3"), coloured red (not yet), amber (getting closer) or green (done). Checks describe the world, not the code, and use display names.
_Avoid_: test, assertion

**Section**:
A part of the screen in the top navigation (Shed, Town, Inbox, Orders). Shed is there from the start; the others are revealed one per Continue and carry a "new" mark until opened. The editor is not a section.

**Floor view**:
The shed floor beside Bram’s forge and Lamp Street, with the same buildings visible in Town. It visualizes what the controller does, animating every take and put. You inspect it, you do not build on it.
_Avoid_: board, editor

**Run**:
Running `main.ts` once as a watched run: every primitive call is played back on the floor at about two calls per second, with its line lit in the editor. The primary button says Run until the loop lesson.

**Deploy**:
Handing `onTick` to the factory clock, which then calls it every tick. The primary button becomes Deploy at the loop lesson and never before. Can be rolled back.

**Arm**:
Uncle's arm on the shed floor that carries out `take` and `put`. Its **hand** holds one item at a time and is always visible.

**Solved card**:
What a task card becomes when its checks pass: what the player did, the idea he used, the reward, and **Continue**. Nothing advances before Continue.

**Reveal**:
Something new on screen (a section, coins, the debt, a letter). Reveals wait in a queue and are released one per Continue.

**Chapter**:
A story arc of requests. Chapter 1 ends when the debt is paid and the bridge stands.
