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
Bram’s introduction to the growing controller. The player writes dig, smelt and ship, then wires them into onTick and deploys. Later requests extend and revise the same project.

**Onboarding step**:
One focused edit in the player’s own project. Its card gives the story reason, the bricks, an idea and then the exact lines.
_Avoid_: tutorial levels

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
The player's TypeScript project. It exports `onTick`, which the factory runs every tick. Its main file starts as a comment from Uncle. Its first focused file is the dig stub. One codebase for the whole game.
_Avoid_: script, solution

**Primitive**:
One of the three physical actions the world exposes from `"inherit"`: `take(place)`, `put(place, item)`, `look(place)`. Everything else the player builds from them.
_Avoid_: machine method

**Story action**:
A non-physical action the story unlocks and exports from `"inherit"`: `buy(kind, name?)` with the press, `repair(machine)` with the breakdowns.

**Place**:
Anything you can take from, put into or look at, named by a string: the mine, a machine, the cart.

**Verb**:
A function the player writes himself from primitives, such as `dig`, `smelt`, `ship`, `stamp`, `move`, `fixBroken`. A word for an action in a request, hint or check is always the name of the function the player is asked to write.

**Framework**:
The player's own collection of verbs. It grows in verbs/ files from the first task. The collapsed **My library** panel lists solved verbs by signature and opens their source.

**Bench**:
A small disposable factory that tries the current verb and its real imports when the player edits. It leaves the live factory and its coins alone.

**Wire-up**:
A task in main.ts that imports the player’s library, calls it from onTick and runs it on the floor with Deploy.

**Check**:
A live plain sentence about what the current request needs ("Ore reaches the furnace"), coloured red (not yet), amber (getting closer) or green (done). Bench checks exercise a single verb and open the next task when green. During a wire-up, checks follow the real factory.
_Avoid_: test, assertion

**Section**:
A part of the screen in the top navigation (Code, Factory, Town, Inbox, Orders). Each appears when the story reaches it and carries a "new" mark until opened.

**Floor view**:
The animated canvas that shows the factory. It visualizes what the controller does, animating every take and put. You inspect it, you do not build on it.
_Avoid_: board, editor

**Deploy**:
Making the working copy the running controller. Can be rolled back.

**Chapter**:
A story arc of requests. Chapter 1 ends when the debt is paid and the bridge stands.
