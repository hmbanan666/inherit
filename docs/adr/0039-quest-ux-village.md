# Quests live in the village

Accepted 25 November 2026. Supersedes the quest-rail clauses of [ADR 0024](0024-quest-rail-and-status.md) and [ADR 0033](0033-quest-card-stays-still.md), and the rail, Shop tab, and Machines tab in [the screen layout](../specs/v8-screen-layout.md). Builds on [ADR 0016](0016-a-village-that-grows-through-code.md). Quest data, rewards, and the order of quests are unchanged ([ADR 0022](0022-quest-loop-no-loss.md), [ADR 0032](0032-rewards-on-hand-over.md), [ADR 0036](0036-region-1-fabrication-chain.md)). The plan is [docs/plans/quest-ux-village.md](../plans/quest-ux-village.md).

## Context

Nick started a new game on 25 November 2026 and did not know what to do first. The first sensible move is to take a quest, but the screen showed a list on a left rail with three tabs, Quests, Shop, and Machines, that read like tabs and did not behave like a game. The open card repeated itself: a next step, the title, a line in the villager's voice that already named the need, then a need sentence that named it again with a code hint. He could not tell which line was the goal.

He looked at three sketches (`A1`–`C2`, kept outside the repo) and picked parts of each. From A: villagers and their houses stand on the game field, they move a little, and a `!` or `?` over a head says who wants something. From B: the game talks back, with short toasts for a villager's line or for something that happened. From C: the navigation moves to the top bar. The top of the screen is the game and the bottom is the editor. The left sidebar goes.

## Decision

**Two rows.** The top row is the field. The bottom row is the editor, unchanged: files, code, Tests and Console. The left rail (`.quest-zone` with its tabs) is removed. The map–editor splitter, its saved height, and every editor width stay as they are.

**The top bar holds the navigation.** Left to right: the logo, Kettlewick Works, Journal, Shop, the credits pill, the level pill with its XP bar, and Settings. Journal and Shop open modals. Journal has the quest that is open now, the requests that can be taken, the quests already handed over with what they changed, and the list of machines. Shop is the existing shop list. Both reuse the existing markup and styles, moved into components, not redrawn.

**The village is on the field.** A band of 4 tiles is drawn to the left of the works grid. It holds the houses of the quest givers (forge, bakery, mill, town hall, lamp street, riverside, bridge), a road, and a fence with a gate beside the depot. The band is drawing only. `world.grid` stays 16 by 6, drones never enter the band, `findPath` and the sim do not know it exists, and the balance report does not move. The houses are the archived town buildings (`townBuildings.ts` and `townLandscape.ts` on the `art-archive` tag), restored as [docs/art.md](../art.md) already suggests. A house is drawn broken until a quest from it is handed over, then working. That is the village growing through code, with no new state.

**Villagers stand in front of their houses.** Each villager is the existing cameo from `townPortrait.ts` on a small token, with the name under it. They wander a short way around their home spot. The motion is local to the browser, deterministic, and stops while the villager is hovered, while their dialog is open, and when the player prefers reduced motion. Villagers who have nothing yet are drawn dimmer. Every villager in the quest list is on the field from the first minute, so the world reads as bigger than the factory.

**One mark over a head.** A gold `!` means this villager has a request the player can take now. A grey `?` means their quest is open and not done. A gold `?` means it is ready to hand over. No mark means nothing for now. At most one quest is open at a time, so while a quest is open only its giver carries a mark.

**A click on a villager opens their dialog.** The dialog is a modal with the portrait, the name and role, one line in their voice (the quest `quote`), one goal (the quest `goal`), the reward tiles, and one button: Take quest, or Hand over when the order is ready. A held request shows its hold sentence and Take stays closed, as in [ADR 0031](0031-quest-gift-before-take.md). A villager with nothing to give says one short line: what their last quest changed, or the level they are waiting for. The words Take quest and Hand over stay; they are the words the rest of the game and the ADRs use.

**The current step is a tracker in the top-right corner of the field.** It shows who asked and the title, the next step from `questNextStep`, up to three test rows with their marks, the delivery bar, and the footer button (Hand over, View remaining test, or In progress). It folds to one line, and the fold is remembered in the browser. With no quest open it is one line, such as `Talk to Bram`. A top-bar line was the other option. It was not chosen because the step needs two lines, the test marks, and the Hand over button, and the top bar already holds the brand, Journal, Shop, credits, level, and Settings. The tracker also sits in the game row, where the player is looking when a cart arrives.

**Toasts in the bottom-right corner of the field.** A toast is a villager line with their cameo, or a short event: a quest taken, a test passing, an order ready, a hand-over with its credits and XP, a level reached, a new function or trigger, a machine installed, the second drone, a purchase, and a stuck test's reason in the villager's voice. Toasts stack upward above the zoom controls, at most three, and leave on their own. Top centre was the other option. It was not chosen because it covers the middle of the floor, where the furnace, the press, and the lathe work, and it competes with the credit float on the top bar. The bottom-right corner is the quietest part of the floor, it is away from the villagers on the left, and it keeps the editor below free. Script errors stay in the console and the problem counts. They are not toasted.

**A click on a machine opens its card next to it.** The card is the existing machine inspector (what it is, its lines, recipes, progress, and buttons) as a small popup beside the machine or drone, inside the field. It follows pan, zoom, and a moving cart, and closes with its X, Escape, or a click on empty floor. The Machines list moves to the Journal, so the works can still be opened from the keyboard.

**One goal, no repeated text.** The dialog shows `quote` and `goal`. The tracker shows the step and the tests. The `why` sentence, which explains how the thing is made, arrives once as the villager's toast on Take. The editor comment from `nudge` stays as in ADR 0024. `ask` and `need` stay in the quest data for compatibility but are not stacked under the goal. Old saved contracts use the goal and quantities resolved by `questCard`, not the current quest’s changed requirements. Essential completion constraints (Bram’s coded batch, Elsie’s two haulers, the crew’s crate order) stay explicit in the goal or the persistent tracker. No quest text is rewritten; presentation selects the existing fields, and every quest string is still read from `packages/sim/src/v8/quests.ts`.

## What stays

- The sim, quest order, quest text, rewards, shop, balance, and the reference run. No new mechanic.
- The save format (version 3) and every existing localStorage key. An old save loads into the new screen with its quest, its checks, and its legacy contract card.
- The editor row, the Tests and Console pane, the API book, the status bar, and the CPU meter ([ADR 0034](0034-cpu-meter-stays-visible.md)).
- All art. Portraits, machines, materials, and the shared helpers are reused. `VillageAsk.vue` and `TownPortrait.vue` stay and are used by the Journal and the toasts.
- Hit-testing by footprint in `floorPick.ts`, the hover scale, the gold outline, and the pointer cursor. Villagers use the same rules.
- The drone status line stays on the status bar ([ADR 0033](0033-quest-card-stays-still.md)). The tracker never narrates the drone.

## Consequences

- The screen layout spec is rewritten around the field, the tracker, the toasts, and the two modals, in the same change that lands the layout.
- The field is wider. With the 280px rail gone the frame gains that width, and at common sizes the map is still bound by its height, so the works are drawn at about the same size as before.
- Playwright specs in `tests/e2e` already point at old copy. They are not part of this work and stay as they are until someone rewrites them on purpose.
- Taking and handing over now have two doors each: the villager and the tracker or Journal. That is deliberate. The villager is the door the game teaches; the tracker and the Journal make sure nobody is stuck behind a canvas click.
- A trader on the floor for the shop, real villager paths, and more districts are possible later. They are not part of this decision.

## Open decisions

None needed from Nick before implementation. House art, cameo tokens, placement, toast corner, and tracker position are chosen here; Nick can adjust their appearance after playtesting.

## Amendment, 25 November 2026: a bigger village

Nick playtested Phase 3 (t241u). The village on the left of the works, on the same canvas, its look, and the cameos and names stay. The houses were too small and their signs unreadable, and a 4-tile band did not read as a village. So:

- **The band is 20 columns wide**, not 4: x from −1920 to 0 world px, with the field `{ left: -1920, top: 0, width: 3456, height: 576 }`. It is still drawing only. `world.grid` stays 16 by 6, drones never enter it, and the sim and the balance report do not change.
- **Houses are drawn at 1.4× their native 210×176 print**, not about 0.46, so the 8px plaque text is 11.2 world px. That is about 9 screen px at the default zoom on a common map frame.
- **Each house has its own 4 × 3 tile lot, with its villager standing beside it.** A river with the bridge, a main road, a spur to the gate, lanes, trees, orchards, fields, split rails and a horse come from the existing `townLandscape.ts` and `townBuildings.ts` drawings, reused and not redrawn.
- **The default camera frames the works plus the eight nearest village columns.** The player pans or zooms out to see the rest, and there is no hard canvas limit.

The exact values are in [Phase 3b of the plan](../plans/quest-ux-village.md). Wandering (Phase 5) is measured from the new pixel spots.
