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
| Depot delivery | A quest counts goods only when they arrive at the depot. The furnace and the press hold them until a drone unloads them there. `takeFromDepot` is the only path that counts them. |
| Press | The machine Odile installs on Hand over. It forms a grate, a plate, or a blank. See [ADR 0036](docs/adr/0036-region-1-fabrication-chain.md). |
| Transfer | A drone task that carries one kind of goods from one station to another. It reserves the goods and the receiving space until it finishes or is cancelled. |
| Soft occupancy | One drone on a cell, including a station. A blocked step waits, then goes around. A head-on yields. See [ADR 0038](docs/adr/0038-soft-occupancy.md). |
| Tick | One step of the world, 0.5 s. While Loop is on, and no Run is in progress, `onTick` runs once per tick. The clock does not pause and has no speed control. |
| CPU | A budget per tick, stored on the world as spent and limit. A call that would pass the limit does not run, and the rest of that tick's player code is skipped. The sim still finishes the tick. The status bar shows it on every tick. CPU +10 in the shop raises the limit. |
| Brick | One API call from `"inherit"` with a signature, a doc line and a CPU cost. A new one is granted by taking a quest. |
| Quest | One villager's ask, a count of goods, taken by hand, one at a time. The order is `questList`. |
| Check | One test of the open quest. The Tests tab beside the code explains every check. The Quest tab shows how many pass. A check updates each tick after Take and costs nothing. When all pass, the player can Hand over. |
| Hint | Taking a quest inserts its nudge comment once at the top of the open file. Handing over a quest that grants a trigger inserts its example once. Deleted comments and examples stay deleted. The tracker and API book carry grant and code hints. Toasts give feedback when something happens. |
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
