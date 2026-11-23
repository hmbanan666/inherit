# Inherit

One game played by writing TypeScript. You inherit Kettlewick Works and Uncle's program, take a villager's quest, and complete it for credits and XP ([ADR 0022](docs/adr/0022-quest-loop-no-loss.md), [ADR 0021](docs/adr/0021-v8-inherit-a-factory.md), [v8 concept](docs/concept/v8.md)). Packs from v5 to v7 stay playable at `/?packs` as a legacy mode. They are not v8.

## v8 terms

| Term | Meaning during play |
| --- | --- |
| Works | The inherited factory. The first site is Kettlewick Works, Uncle's workshop in a village. |
| Site | A map with a depot, drones, veins, a furnace, a quest list and starting files. Pure data. |
| Inherited code | Uncle's `main.ts`. It mines and never comes home (`const home = false`). |
| Tick | One step of the world, 0.5 s. `onTick` runs once per tick. The clock does not pause and has no speed control. |
| CPU | The nav shows used/limit. A call that would pass the limit does not run, and the rest of that tick's player code is skipped. The sim still finishes the tick. |
| Brick | One API call from `"inherit"` with a signature, a doc line and a CPU cost. |
| Quest | One villager's ask. Taken by hand, one at a time, with no deadline. Bram, Odile, Elsie, Tomas, Pell, then Wen. |
| Check | One sentence under the editor about the live world. Open or done. It updates every tick after the quest is taken, never completes the quest, and never costs anything. |
| Hint | The quest card's why line. It never contains the solution. It may name a field, a brick, or a shop item. |
| Credits | Paid by Complete quest. Spent only in the shop. Never negative. There is no rent. |
| XP | Paid with the credits when a quest is completed. A speed bonus is decided and not built yet. |
| Level | From XP. This chain's thresholds are 20, 40, 65, 90, 115 and 145, so each quest raises one level and unlocks the next villager. |
| Shop | Where credits are spent. A purchase applies at once. An unaffordable item is refused. Level tiers are decided and not built yet. |
| Order | The shipment on a taken quest: item, quantity, shipped. Complete quest pays. No deadline is shown. |
| lib | The player's own files under `lib/`. The game does not replace them. |
| Audit | Later. A chapter summary after the quest chain. It does not bankrupt or wipe. See ADR 0022. |
| Next inheritance | Later. A new site. The player's `lib/`, credits and XP carry over. See ADR 0022. |
| Session | The saved works on this device. Not a timed round, and not ended by bankruptcy. Start over is the player's own confirmed reset. |
| Rent | Not used. Credits are not charged over time. |
| Bankruptcy | Not used. The balance cannot end the works. |
| Pause | Not used in v8. Legacy packs still have their own playback bar. |

## Pack terms (legacy mode at `/?packs`)

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
