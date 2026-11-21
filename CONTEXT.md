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
The first handful of guided steps, wrapped inside the first request. The only place with step-by-step hints.
_Avoid_: tutorial levels

**Debt**:
What the uncle owed the bank. The player pays when ready, in full or in optional installments. The balance has no due days or interest.

**Installment**:
An optional payment toward the debt, defined only by its amount.

**Day**:
The town clock. Morning, day, evening and night change the tint of the town and factory.

**Hiccup**:
Something unplanned on the floor that code has to handle: a mixed ore vein, a furnace that overheats, a jam.
_Avoid_: incident, bug, failure

**Jam**:
A machine stopped by an item it cannot process, for example copper ore in an iron furnace.

**Breakdown**:
A machine that stopped from wear. It recovers by repair (costs coins) or by cooling down (costs time).

**Controller**:
The player's TypeScript project that runs every tick. One codebase for the whole game.
_Avoid_: script, solution

**Floor view**:
The animated canvas that shows the factory. It visualizes what the controller does. You inspect it, you do not build on it.
_Avoid_: board, editor

**Deploy**:
Making the working copy the running controller. Can be rolled back.

**Chapter**:
A story arc of requests. Chapter 1 ends when the debt is paid and the bridge stands.
