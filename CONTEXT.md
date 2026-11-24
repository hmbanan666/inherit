# Inherit

One game played by writing TypeScript. You inherit Kettlewick Works, take a villager's quest, and hand it over for credits and XP ([ADR 0027](docs/adr/0027-shop-veins-one-delivery.md), [ADR 0026](docs/adr/0026-quantity-quests-one-world.md), [v8 concept](docs/concept/v8.md)). The chain is `packages/sim/src/v8/quests.ts`. Packs were removed ([ADR 0030](docs/adr/0030-packs-removed.md)). Words live here. Rules live in the ADRs. Do not copy a quest table into this file.

## v8 terms

| Term | Meaning during play |
| --- | --- |
| Works | The inherited factory. The first world is Kettlewick Works, Uncle's workshop. |
| World | One continuous map, about ten hours when it is finished. New content is a new world. The code calls the map data a site. |
| Site | The data for one world: depot, drones, veins, furnace, quest list, and starting files. |
| Inherited code | A fresh world starts from `smeltOnce` in `kettlewick.files`. `uncleMain` is the old loop that mines and never comes home. Old saves can still be running it. |
| Run | Calls one exported function once, on one tick. The function reads the works and gives commands. Handing over Bram's quest grants it. Stop ends player code. A drone task already given keeps going. |
| Loop | Calls `onTick` every tick until Stop. Handing over Ines's quest grants it and turns it on. |
| Depot delivery | A quest takes ingots and steel from the depot. The furnace holds them until a drone picks them up and unloads them there. `takeFromDepot` is the only path that counts them. |
| Tick | One step of the world, 0.5 s. While Loop is on, and no Run is in progress, `onTick` runs once per tick. The clock does not pause and has no speed control. |
| CPU | A budget per tick. A call that would pass the limit does not run, and the rest of that tick's player code is skipped. The sim still finishes the tick. The status bar shows it when the tick is spending half the budget or more. |
| Brick | One API call from `"inherit"` with a signature, a doc line and a CPU cost. A new one is granted by taking a quest. |
| Quest | One villager's ask, a count of goods, taken by hand, one at a time. The order is `questList`. |
| Check | One test of the open quest. It lives beside the code, with a plain line for what it checks. Open or done. It updates every tick after the quest is taken, never completes the quest, and never costs anything. The rail shows the quantity, not these rows. |
| Hint | A comment inserted once at the top of the open file when the quest is taken. Handing over a quest that grants a trigger inserts one example the same way. Neither is put back if the player deletes it. Neither is on the rail. |
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
| Pause | Not used. |

Packs were removed. [ADR 0030](docs/adr/0030-packs-removed.md) is the record. The drawings stay. Coins, wallet, debt, and the workshop floor are older names, not a mode in the game.
