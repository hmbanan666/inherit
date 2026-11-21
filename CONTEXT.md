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
A repeatable paid job from a townsperson whose request is already done. Orders pay coins and keep the factory busy between requests.
_Avoid_: ticket, contract

**Town change**:
The visible effect of a fulfilled request: a forge lights, a street gets lamps, a bridge is built, a district opens.
_Avoid_: reward, unlock

**District**:
A part of the town that is closed until a town change opens it, bringing new townspeople.

**Onboarding**:
The guided steps inside Bram's request. The player starts from an empty main.ts and writes every line himself, one new thing per step. The only place with step-by-step hints.

**Onboarding step**:
One onboarding step: a short card naming one new thing (for example the `smelt` verb), an example with a blank, and a two-rung hint (the idea, then the exact line).
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
A machine that stopped from wear. It recovers by repair (costs coins) or by cooling down (costs time).

**Controller**:
The player's TypeScript project. It exports `onTick`, which the factory runs every tick. It starts as a comment from Uncle and the player writes all of it. One codebase for the whole game.
_Avoid_: script, solution

**Handle**:
A machine as an object the controller can use, imported from the `"inherit"` module (`mine`, `furnace`, `cart`) or returned by `build` and `machine`.
_Avoid_: machine id, ctx (the low-level API, kept only for old controllers)

**Verb**:
A method on a handle, such as `dig`, `connect`, `smelt`, `stamp`, `cut`, `send`, `repair`. A word for an action in a request, hint or check is always the verb's exact name.

**Check**:
A live plain sentence about what the current request needs ("Ore reaches the furnace"), coloured red (not yet), amber (getting closer) or green (done). Checks guide, they never block.
_Avoid_: test, assertion

**Section**:
A part of the screen in the top navigation (Code, Factory, Town, Inbox, Orders). Each appears when the story reaches it and carries a "new" mark until opened.

**Floor view**:
The animated canvas that shows the factory. It visualizes what the controller does. You inspect it, you do not build on it.
_Avoid_: board, editor

**Deploy**:
Making the working copy the running controller. Can be rolled back.

**Chapter**:
A story arc of requests. Chapter 1 ends when the debt is paid and the bridge stands.
