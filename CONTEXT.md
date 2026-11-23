# Inherit

One game played by writing TypeScript: you inherit a factory and its code ([ADR 0021](docs/adr/0021-v8-inherit-a-factory.md), [v8 concept](docs/concept/v8.md)).

## v8 terms

| Term | Meaning during play |
| --- | --- |
| Works | The inherited factory. The first site is Kettlewick Works. |
| Site | A map with starting entities, inherited code, modules, unlocks, orders, crises and an audit tick. Pure data. |
| Inherited code | Uncle's working but wasteful `main.ts`, running from the first tick. |
| Tick | One step of the world, 0.5 s at 1x. `onTick` runs once per tick. |
| CPU | The cost of API calls in one tick. Over the limit, the rest of the tick is skipped. |
| Brick | One API call from `"inherit"` with a signature, doc line, CPU cost and the API version that added it. |
| API version | A release of the bricks with a changelog. Bought with credits; may deprecate or remove bricks. |
| Module | Content that extends the core: entities, bricks, orders and crises. |
| Crisis | A world change that breaks or strains the current code, such as a vein running dry. |
| Credits | Money from orders. Pays rent and unlocks. |
| Rent | Credits charged every tick for drones, stations and CPU. |
| Order | A request for items with a deadline in ticks and a pay. Late orders pay half. |
| Audit | The end of a session, with a result screen. |
| Session | One play of a site, 20 to 40 minutes, from inheritance to audit or bankruptcy. |
| lib | The player's own files, kept across sessions. |

## Pack terms (v5 to v7, removed after the first v8 slice)

| Term | Meaning during play |
| --- | --- |
| Pack | A finite game with a world, player functions, activities and a learning goal. |
| Showcase | The place to discover a pack, see its finish and resume saved work. |
| Pack level | The intended starting experience, one of Beginner, Basics, Game or Advanced. |
| Course | A pack whose lessons build on one another in a fixed order. TypeScript from zero is the Beginner course. |
| Unit | A named stretch of a course. Completing it earns a landmark and offers a stopping point. |
| Lesson | One short exercise with a goal, an edit and a visible result. |
| Lesson theory | The short Learn card that explains an idea and illustrates it in another situation before the player uses it. |
| Goal | The one-line result above the editor. |
| Starter | The initial player file and the place to start editing. |
| TODO comment | A note at the edit point describing what the player's code should accomplish. |
| Hint | One rung of help the player chooses to reveal. |
| Course map | The list of units and lessons through the finish, showing completed, current and locked work. Completed lessons can be revisited. |
| Scene | The setting, actors and props that give an activity its reason and visibly respond to code. One scene can serve several lessons. |
| World view | The game area drawing the current scene and its changes. |
| Entity | Something with state in a pack’s world, such as a sign, lamp or parcel. |
| Challenge | A self-contained problem the player can choose and retry from its own starting floor. |
| Condition | The observable rule that a challenge solution must satisfy across its stated input cases. |
| Check | One compact statement of evidence for the goal. Text and colour show missing, partial or complete work. |
| Drawer | The help surface over the game. Learn, Hints, API and Console share it. |
| Celebration | The centred moment after a solve when the player sees what they learned and can Continue. |
| Reference solution | A working project used to verify an activity on the player’s runner. |
| Player API | The typed functions the pack supplies for reading and changing its world. |
| Watched run | One execution played back with each call, source line and effect together. |
| Pack save | The player's code, progress and world for one pack. |

## Workshop

| Term | Meaning on the shed floor |
| --- | --- |
| Parcel | An identifiable package with a colour, weight and destination on its label. |
| Place | One of four parcel stations. `belt` is the incoming belt, `left` and `right` are the bins, and `cart` is the dispatch cart. |
| Scale display | The readout that shows the number passed to `display` on a counting challenge. |
| Arm | The mechanism that picks up and puts down parcels. Its hand holds one parcel. |
| Controller | The player's program for the floor. It may export a function for the clock to call. |
| Run | Try the program once and watch its actions. |
| Deploy | Give a controller to the clock so it calls the exported onTick once per tick. |
| Jam | A blocked outlet reported by the floor. The jam challenge teaches how to clear it. |

## Historical Workshop terms

Coins, wallet, debt, installment, request, order, town, townsperson, town change, district, inbox, letter, chapter and story action belong to archived versions of Workshop. Older decisions and saves use these names. The challenge selector records solved conditions. It has no economy, story unlocks or town sections.
