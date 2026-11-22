# Inherit

A showcase of games played by writing TypeScript. Pick a pack, write a line and watch what it does in that world.

## Framework

**Pack**:
A game with its own world, player functions and ordered lessons. It has a learning goal and an end.
_Avoid_: campaign (for the whole site)

**Showcase**:
The first screen. Each cover shows what the pack teaches, its level, setting and estimated time. A player can start one or resume several.

**Pack level**:
The intended starting experience for a pack. The four levels are Beginner, Basics, Game and Advanced.
_Avoid_: lesson number

**Lesson**:
One idea the player can use in code and see working in the world. Continue opens the next lesson.

**Goal**:
The one-line result the player is working toward, shown above the editor.

**Starter**:
The code the player sees when a lesson opens, with a place to make the next edit.
_Avoid_: template solution

**Explanatory comment**:
A note in the starter beside the line to write or change. It explains the new idea where the player will use it.

**Check**:
A short visible statement about the current goal. Red means there is work to do, amber means some is done and green means it passed.
_Avoid_: test, assertion

**Reference solution**:
A working player project for one lesson. The validation suite runs it through the same sandbox as the player.

**World view**:
The visible game area for a pack. It shows the world as the player's calls change it.

**Player API**:
The named, typed functions a pack gives the player. Each says what it does in one line on hover.

**Entity**:
Something the pack keeps track of in its world, such as a lamp, a person or a basket of apples. The pack decides how to display it.

**Reveal**:
A piece of the screen or world that a lesson introduces on Continue. Reveals wait their turn.

**Solved card**:
The card over the world after the checks pass. It gives a reaction, what the player did, the idea learned and Continue.

**Watched run**:
One execution played back a call at a time. The editor lights the source line as its effect appears.

**Pack save**:
The player's world, lesson progress and code for one pack. Switching packs leaves each ready to resume.

## Beginner pack

**Dawn village**:
The whole village in view when the first lesson opens. Its sign, flowers, lamps and fair stay as the player works.

**Villager**:
A neighbour in the dawn village. The first call gives one a speech bubble.

**Path lamp**:
One of five numbered lights along the path. Each lights on its own turn in the player's loop.

**Village fair**:
The final gathering. The player reuses a function, a loop and a choice to decorate the stalls.

## Workshop pack

**Kettlewick**:
The town around Uncle's shed. Bram the smith asks for the first iron ingots to shoe the mail horse.

**Bram**:
The smith who teaches the player to use Uncle's arm. His forge lights when his request is filled.

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
One Workshop lesson in Bram’s request. Its goal names the next change on the floor and its starter explains the edit.
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
A non-physical action the story unlocks and exports from `"inherit"`: `buy(kind, name?)` with the press, `repair(machine)` with the breakdowns, and the replies and payments in the bank book.

**Place**:
Anything you can take from, put into or look at, named by a string: the mine, a machine, the cart.

**Verb**:
Internal term for a function the player writes from primitives (`smelt`, `ship`, `stamp`, `move`, `fixBroken`). Player-facing text says "function". A word for an action in a request, hint or check is always the name of the function the player is asked to write.

**Player library**:
The functions the player has written in the controller. They move into their own file at the Mayor's request. The collapsed My library panel lists them by name and signature.

**Section**:
A part of Workshop in the top navigation. The shed has content from the start. Town, Inbox and Orders appear after their reveal when there is a town change, a letter or an order to show. A new section keeps its mark until opened.

**Floor view**:
The shed floor beside Bram’s forge and Lamp Street, with the same buildings visible in Town. It visualizes what the controller does, animating every take and put. You inspect it, you do not build on it.
_Avoid_: board, editor

**Run**:
Executing the player's `main.ts` once and watching it on the floor. Run once can also try one tick of a deployed project.

**Deploy**:
Handing `onTick` to the factory clock, which then calls it every tick. The primary button becomes Deploy at the loop lesson and never before. Can be rolled back.

**Arm**:
Uncle's arm on the shed floor that carries out `take` and `put`. Its **hand** holds one item at a time and is always visible.

**Chapter**:
A story arc of requests. Chapter 1 ends when the debt is paid and the bridge stands.
