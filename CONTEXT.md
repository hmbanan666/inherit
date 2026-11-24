# Inherit

One game played by writing TypeScript. You inherit Kettlewick Works, take a villager's quest, and hand it over for credits and XP ([ADR 0027](docs/adr/0027-shop-veins-one-delivery.md), [ADR 0026](docs/adr/0026-quantity-quests-one-world.md), [v8 concept](docs/concept/v8.md)). The chain is `packages/sim/src/v8/quests.ts`. Packs from v5 to v7 stay playable at `/?packs` as a legacy mode. They are not v8. Words live here. Rules live in the ADRs. Do not copy a quest table into this file.

## v8 terms

| Term | Meaning during play |
| --- | --- |
| Works | The inherited factory. The first world is Kettlewick Works, Uncle's workshop. |
| World | One continuous map, about ten hours when it is finished. New content is a new world. The code calls the map data a site. |
| Site | The data for one world: depot, drones, veins, furnace, quest list, and starting files. |
| Inherited code | A fresh world starts from `smeltOnce` in `kettlewick.files`. `uncleMain` is the old loop that mines and never comes home. Old saves can still be running it. |
| Run | Plays one exported function until it returns. `yield` or `return false` waits one tick. Taking Bram's quest grants it. Stop ends it. |
| Loop | Runs that function again each time it finishes. `onTick` is the same loop in code. Taking Ines's quest grants it and turns it on. |
| Depot delivery | A quest takes ingots and steel from the depot. The furnace holds them until a drone carries them there. `takeFromDepot` is the only path that counts them. |
| Tick | One step of the world, 0.5 s. While Loop is on, and no Run is in progress, `onTick` runs once per tick. The clock does not pause and has no speed control. |
| CPU | A budget per tick. A call that would pass the limit does not run, and the rest of that tick's player code is skipped. The sim still finishes the tick. The status bar shows it when the tick is spending half the budget or more. |
| Brick | One API call from `"inherit"` with a signature, a doc line and a CPU cost. A new one is granted by taking a quest. |
| Quest | One villager's ask, a count of goods, taken by hand, one at a time. The order is `questList`. |
| Check | One test of the open quest. It lives beside the code, with a plain line for what it checks. Open or done. It updates every tick after the quest is taken, never completes the quest, and never costs anything. The rail shows the quantity, not these rows. |
| Hint | A comment inserted once at the top of the open file when the quest is taken. A trigger inserts one example the same way. Neither is put back if the player deletes it. Neither is on the rail. |
| Credits | Paid by Hand over and spent in the shop. Never negative. There is no rent. A tick cannot lower the balance. See ADR 0027. |
| XP | Paid with the credits on Hand over. There is no speed bonus. |
| Level | From XP, using `levelFor`. A quest's `needLevel` gates who can be asked. |
| Shop | Conveniences for sale: a hotter furnace, a bigger cart, a bigger hopper, and CPU. A purchase applies at once. An unaffordable item is refused. Functions are not sold. There is no key and no second drone. |
| Order | The shipment on a taken quest: item, quantity, shipped. Hand over pays. |
| lib | The player's own files under `lib/`. The game does not replace them. |
| Audit | Later. A chapter summary after the quest chain. It does not bankrupt or wipe. See ADR 0022 and ADR 0026. |
| Next world | Later. A new map. The player's `lib/`, credits and XP carry over. See ADR 0026. |
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
| Try | Try the program once and watch its actions. The workshop pack's primary button. |
| Deploy | Give a controller to the clock so it calls the exported onTick once per tick. |
| Jam | A blocked outlet reported by the floor. The jam challenge teaches how to clear it. |

## Historical Workshop terms

Coins, wallet, debt, installment, district, inbox, letter, chapter and story action belong to archived versions of Workshop. Older decisions and saves use these names. Order, quest, and the village are v8 words, defined above. The workshop challenge selector records solved conditions. It has no economy, story unlocks or town sections.
