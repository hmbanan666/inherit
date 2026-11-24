# v8 coherence audit (2026-11-23)

> Historical snapshot of `293cf29` (PR #72). The "what is on main now" section is not the current game. [ADR 0027](../adr/0027-shop-veins-one-delivery.md) spends credits in the shop; the "credits only rise" line below is not in force. The chain is `packages/sim/src/v8/quests.ts`.

Scope: an audit only. No product code was changed. The `main` this audit read is `293cf29` (PR #72). Inputs: [the v8 concept](../concept/v8.md), [ADR 0021](../adr/0021-v8-inherit-a-factory.md), [the first playable spec](../specs/v8-first-playable.md), `CONTEXT.md`, the v8 sim and `FactoryFrame.vue`, and the v2/v3 town plus the v6 frame in git history. Nick's decisions of 23 November 2026 override the concept wherever they disagree, including the later note that the works need villagers and a reason.

## Verdict

v8 has the pieces of a factory and none of the reasons to run one. The page is a grid, two veins, a furnace, a depot and a nav full of an order. Uncle's program already mines, smelts and ships, so credits move before the player does anything. The first two minutes do not teach a loop. They watch a machine succeed and a sentence change every tick.

The game to restore is the earlier one: Uncle left a workshop in a village, a person asks for something in plain words, the player's code fulfils it, and the village changes because of what was delivered. Ore and the furnace exist so Bram can shoe the mail horse and the mayor can span the river.

## What is on `main` now

The sim in `packages/sim/src/v8/` ticks a seeded world: one drone, veins A and B, a furnace (2 ore to 1 ingot in 4 ticks), a depot, a CPU limit of 30, and two orders that both open in the first two ticks (Mayor Hale, 20 ingots, 180 cr; the Smithy, 10 ingots, 100 cr). Credits are no longer subtracted. Empty `furnace.smelt()` adds `ledger.waste`, and that waste is taken off the next payout. There is no bankruptcy flag. `creditsPerMinute` is the recent payout rate. `runTicks` in `packages/sim/src/v8/core/world.ts` rewrites `world.status` on every tick.

Uncle's `main.ts` in `packages/sim/src/v8/sites/kettlewick.ts` is fourteen lines and it works. It pathfinds, mines, unloads, smelts even when the furnace is empty, and ships. `tests/v8/session.test.ts` expects that program to earn credits by itself. The "first fix" the test teaches is guarding `smelt`, which pays more per minute. The player can sit and watch Hale's order fill.

The page is the standing frame. `StudioShell.vue` is the nav, the floor, the editor dock and the footer. `PackNav.vue` has the logo and, since `a786d03`, a settings menu. `FactoryFrame.vue` puts the current order, the pay line and "Due in N ticks" inside that header. The due count changes every tick, and so does the status sentence under it (`world.status`, including the fuel warning, the late warning and the idle line). Console, API and Charts open from the menu onto `MetricsPanel.vue` and `ApiReference.vue`. Deploy replaces a "Running" pill when the editor differs. Start over asks for confirmation. The tick is only in the console. Packs stay at `/?packs`.

`FileTree.vue` (new in #72) sits in the editor column as a strip at most 180px tall, above Monaco. New files must match `lib/<name>`, so there is no folder nesting. The tree from `ae60756` (`apps/web/app/components/FileTree.vue` at that commit, placed above the editor in `app.vue`) had the same stacked position, with real folders.

The worker in `apps/web/app/lib/factory.worker.ts` runs only while `document.hidden` is false. `tests/e2e/v8.spec.ts` locks the current screen in: the Hale heading, the fuel sentence, charts hidden until Settings, and a clock that freezes when the tab is hidden.

The concept, the ADR and the spec still describe bankruptcy, rent, pause, 1x/2x/4x, three drones at the start, and a starter that earns on its own. Those sentences are why each PR drifted back toward a dashboard.

## What a player hits

| What Nick sees | Where it comes from |
| --- | --- |
| No reason for the ore, the veins, the furnace or the depot | The floor is `FactoryFloor.vue` plus `app/lib/floor.ts`: a labelled grid. Orders are `{ from, qty, pay, due }` with no request sentence and no place in the village. ADR 0001 already said a shipment needs a person. |
| The works succeed with no edit | `kettlewick.files` mines, unloads, smelts and ships. Both orders are open at tick 0 and 1. `repeatOrders` starts the same pair again when they close. |
| The nav is the task list | `FactoryFrame.vue` renders `<section class="objective">` inside the `#nav` slot, so the header wraps the goal, the pay and the countdown around the logo and the CPU meter. |
| The task sentence jitters | The aside is `` `Due in ${order.due - world.tick} ticks` ``. `runTicks` assigns a new `status` every tick. |
| The file list is not an IDE | `FileTree.vue` is a short `.bench.tree` stacked on Monaco (`max-height: clamp(95px, 20vh, 180px)`), not a column to the left of the editor. |
| Charts feel gone | `MetricsPanel` is in the tree and opens from Settings → Charts. Nothing on the calm screen points at it, and the menu is easy to miss beside the wrapped goal. |
| No first action | The onboarding the spec describes ("press Run, see CPU red") was removed. Nothing tells the player which line to change. The fuel warning appears on its own, then goes away when ore arrives, so the advice changes while they are still reading. |

Kept, and worth keeping: the logo and charcoal palette (`game.css`, ADR 0006), Monaco beside the floor, the Deploy / Running swap, Start over in the menu, one drone, CPU headroom (`session.test.ts` expects use under half the limit), plain-word sandbox errors, API suggestions ranked above TypeScript keywords (`rankApiSuggestions` in `apps/web/app/lib/editor.ts`), compact footer meters, and credits that do not fall.

## What to reuse

Do not draw a new screen. The frame stays `StudioShell.vue`. The goal card is the existing `.objective` block in `apps/web/app/assets/game.css` (icon, title, one `.next` line, aside). It belongs at the top of the world column, which is where the workshop objective sat, not in the header.

The villager figure is `packages/sim/src/visuals/Villager.vue` (coat, scarf, wave). The speech bubble beside Mila is the group at `data-testid="mila-bubble"` in `packages/sim/src/packs/beginner/scenes/VillagePanorama.vue`. Those are the gate scene: a person, a bubble, plain words. Use that pattern for the asker. Do not port the beginner lesson, the theory drawer or the course map.

The people and the sentences already exist. At `9a83d39`, `packages/sim/src/town.ts` `REQUESTS` is Bram ("The mail horse threw a shoe. Send three iron ingots…", building `forge`) and Odile ("Six brackets will hold the span…", building `bridge`). The same commit has `apps/web/app/lib/art/townPortrait.ts`, `townPaint.ts`, `apps/web/app/components/town/TownPortrait.vue` and `TownView.vue` / `app/lib/townScene.ts`. Portraits and the request copy come back. `TownView` does not come back whole: its header is "Day N · phase" and the snapshot carries `debt.owed`. That is the clock and the bankruptcy the 23 November decisions removed. A later PR can mount `TownScene` with a fixed daytime and no debt line, and let building state follow deliveries.

The file tree component stays `FileTree.vue`, fed by `app/lib/devtools/tree.ts`. Put it in a column on the left of `.editor-pane` inside `.editor-dock`, using the dock colours and `.file-tabs` type already in `game.css`. Keep `main.ts` plus flat `lib/` files. Folder nesting was the old tree's extra behaviour; the project shape Nick asked for is one folder.

Charts, the console and the API reference stay the components they are (`MetricsPanel.vue`, the console section, `ApiReference.vue`) and stay behind the settings button (`Settings2` in `PackNav.vue`, the same control `PackStudio.vue` uses). The calm screen does not show them.

The floor stays `FactoryFloor.vue`. It already draws the drone, the veins and the furnace. Labels on those stations should name the job ("ore for Bram"), not a new art style.

## Decisions the code still violates

These are binding, and the concept has not caught up:

- Credits only rise. No rent, no fuel charge against the balance, no bankruptcy. Wasteful code earns slowly. Show that as credits per minute. Taking waste off the next payout is allowed. Subtracting from `credits` is not.
- No Pause, no speed, and the tick does not stop when the tab is hidden. The sim stays deterministic and UI-free so it can move to a server later. The client renders state and submits code. The tick count stays in the console.
- Top right is "Running" while the deployed source matches the editor, and "Deploy" (Ctrl+Enter) when it does not. No version chip. Restart stays "Start over" in the menu, with a confirm.
- One drone. CPU is not at the limit at the start. More drones are a later unlock.
- Uncle's file is about ten lines and one obvious mistake. The player's edit and Deploy are what make the first ingots and the first credits move.
- One goal, always the current request, plus one plain line about what is wrong and what to do. That line changes when the situation changes, not on each tick. No "due in N ticks" on the goal.
- The first two minutes are: read who is asking, see the stuck cart on the floor, change the one line, Deploy, watch the ingots reach that person.

## PR plan

Five PRs. Each one after this is playable on its own. Packs stay mounted at `/?packs`. No new illustration work beyond restoring files from git.

1. **This audit.**

2. **The village asks, and nothing ships until you deploy.** First gameplay PR.
   - An order carries a person, a role, a title, the words they say, a building and the line the village says when it is filled. Bram opens alone: 4 ingots for horseshoes. Mayor Hale's bridge order opens when Bram is paid. Deadlines stay in the sim and off the goal. The first due is long enough that reading the screen is not a fail.
   - Replace Uncle's program with about ten lines whose only bug is `const target = vein`. The cart fills at vein A and stays there. `mine` on a full cart already adds nothing and does not throw. Smelt only when the furnace has 2 ore, so the fuel warning is not the first lesson. Ship stays in the file, so the one-line fix (`drone.cargo < drone.capacity ? vein : furnace`) is what starts the haul, the ingots and the payout.
   - `world.status` is a stable sentence for the current situation: fetching ore, cart stuck, furnace working, ingots ready to ship, request late. The same situation keeps the same words across ticks.
   - Move `<section class="objective">` from the nav into the world column and drop the FactoryFrame overrides that flatten it. Title is the request ("Horseshoes for the mail horse"). The line under it is `world.status`. The aside is `shipped/qty`, which moves when an ingot ships.
   - Restore `townPaint.ts`, `townPortrait.ts` and `TownPortrait.vue` from `9a83d39`. Show Bram's portrait and a speech bubble with his sentence above the floor. On delivery he is happy and the bubble becomes the forge line from `town.ts`, then Hale's sentence takes the bubble.
   - Bump the v8 save version. A save this shape cannot read starts a fresh works instead of sitting on the error with no world.
   - Tests: Uncle's file leaves credits at the opening balance and ships nothing; the one-line fix completes Bram and raises credits; credits never drop; two ticks in the same situation share one status string; the browser test sees Bram's sentence, a stuck cart, Deploy after the edit, then a higher credit count.

3. **A calm nav and a file column.**
   - The header is the logo, "Kettlewick Works", credits, credits per minute, CPU, the settings button and Running or Deploy. Nothing about the order lives there.
   - `FileTree.vue` becomes a full-height column to the left of Monaco, still `main.ts` and `lib/<file>`.
   - The worker keeps ticking when the tab is hidden. The e2e test that expects a frozen world is rewritten. The tick stays in the console.
   - Settings still open Charts, API, Console and Start over, and the browser test checks each one still appears.

4. **The village grows.**
   - Mount the restored `TownScene` (`app/lib/townScene.ts` and the building drawings from `9a83d39`) on a fixed day phase, with the debt readout left out.
   - Bram's delivery sets the forge to working. Hale's delivery sets the bridge to working. The notice text is the `change` line already stored on the request.
   - The floor captions name the ore and the furnace by the open request.

5. **Write the decisions down.**
   - Amend the concept, ADR 0021's pressure and pause paragraphs, the spec's M3.5 and goal, and the v8 glossary in `CONTEXT.md`: no loss, no pause, no speeds, Deploy, one drone, a short broken starter, villager requests, a growing village. Name ADR 0001 as the reason the orders exist. Leave the old ADR files in place.

## Open questions

- After Hale's bridge, the schedule repeats. A later hour wants new villagers (the bakery and the mill are already in `REQUESTS` at `9a83d39`) rather than the same two sentences forever. Not this slice.
- A hidden tab that keeps ticking spends CPU on the laptop. The server move makes that the server's clock. Until then the client clock runs.
- Pay and quantity for Bram's 4 ingots need a pass after Nick plays the first two minutes. The number should finish soon after Deploy, not before the player has read the bubble.
