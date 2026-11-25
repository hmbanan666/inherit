# v8 quest screen

Governs the arrangement of Kettlewick Works. The rules are [ADR 0039](../adr/0039-quest-ux-village.md), [ADR 0034](../adr/0034-cpu-meter-stays-visible.md), [ADR 0033](../adr/0033-quest-card-stays-still.md), [ADR 0028](../adr/0028-run-to-completion.md), [ADR 0024](../adr/0024-quest-rail-and-status.md), [ADR 0025](../adr/0025-functions-with-triggers.md), [ADR 0022](../adr/0022-quest-loop-no-loss.md), and [the first playable slice](v8-first-playable.md).

The shell is the workshop frame already on screen: charcoal palette, 65px nav, 25px status bar. The field spans the top row. The editor fills the row below it. One splitter component divides the map from the editor, the file tree from the code, and the code from the tests. At rest the splitter draws nothing. Hover and drag show a 2px accent line and a small grip, with the row-resize or col-resize cursor, on an 8px hit area. Double-click returns that split to its default. The quest card keeps the request-card shape in the Journal with padding 12px, radius 7px, 12px between blocks, a 13px goal, a 13px villager quote, a 34px gold button, and a 48px portrait.

## Proportions

The grid is 16 cells wide and 6 tall, so the map is a wide row, not a tall column. It spans the full width inside the frame padding. A horizontal splitter under the map sets the row's height. The default is 45% of the works height. The splitter can move it between 22% and 75%, and the height is saved in this browser under `inherit.v8.map-height`.

The tracker sits 12px from the field’s top-right corner. It is 280px wide and scrolls within the top half of the field. A selected machine or drone opens a 260px card beside its footprint. The card fits inside the field with an 8px margin and scrolls when space is short.

The file tree is a column inside the editor row, 140px until the player drags it. The drag stays between 96px and 420px, and the width is saved as `inherit.v8.tree-width`. Double-click restores 140px. One Files toggle sits on its bar. Under 1280px it starts closed, as a narrow rail with that same toggle. Open or closed is saved separately. Dragging the rail opens it.

The editor and the tests fill the rest of the bottom row. The file tree is the left of that row. The code is the middle. Tests start at 300px on the right and drag between 220px and 560px. The width is saved as `inherit.v8.side-width`. Double-click restores 300px.

## Reading order

1. Nav. Kettlewick Works, Journal, Shop, credits, level, and Settings.
2. Field. A mark identifies a villager with a quest. The tracker names the next step. Clicking a machine opens its card.
3. Editor. The open file tab, the code, API, Loop, Deploy, and the tests beside the code.
4. Status bar. The script, problems, the drone line, caret, tick, and the CPU meter.

The field stays above the editor on a narrow window. The Journal also provides a keyboard route to the requests and machines.

## Nav

Journal and Shop follow the logo and the place name Kettlewick Works. Each opens a dialog. Journal shows a small gold dot and announces “new request” when a request is listed and no quest is open. Settings stays on the right and opens Charts and Start over. The API book opens from the editor. The center is two pills of equal height. Credits are a coin and the number. When credits arrive, that gain floats up from the pill, and the motion is skipped when the player prefers reduced motion. Level is a badge with the number and a thin XP bar. The XP count, such as `12 / 20 XP`, is the tooltip on that pill.

The bar uses the six steps already in `levelFor`. Past the last step it stays full.

## Quest tracker

With no open quest, the tracker shows the next step and a Journal button. Choosing the named villager opens their dialog and centres the map on their lot. With an open quest, it shows the giver, title, next step, and any grant line and file link. Up to three tests show their marks. The first pending or failed test takes the first place, with its reason when one is available. The delivery bar shows what the villager has received. Folding the tracker leaves the giver and step on one line. The browser remembers the fold under `inherit.v8.tracker`.

The footer reads `In progress` while the order is underway. When delivery is full and a check is still open, `View remaining test` selects it in Tests. When all checks pass, Hand over becomes available and pulses once.

## Journal and Shop

The Journal has four sections in order.

1. **Now** shows the open quest or the first available request. The card has the title, portrait, villager’s quote, one goal, delivery quantity and reward tiles. Old contracts show their saved goal and quantities. A request has Take quest and an All requests button that focuses the list. A held request shows its hold sentence and disables Take. The open quest has the same footer actions as the tracker. With no card, Now shows the next step.
2. **Requests** lists the available villagers while no quest is open. Each row has an initial, name, ask and any hold. Selecting a row opens that villager’s dialog.
3. **Done** lists hand-overs in the order they happened, with each title, giver and change.
4. **Machines** lists the works and drones. Selecting a row closes the Journal and opens the card beside the selected machine or drone.

Shop lists the existing conveniences. Each row shows the detail and price or Owned. Buying keeps Shop open. Owned items and purchases beyond the current credit balance are disabled.

Journal, Shop, villager dialogs and the API book use native modals. Opening one closes the previous surface. Escape, the close button or a backdrop click returns focus to the opener, or to the Factory map after a canvas click. Editor shortcuts wait until the dialog closes.

Taking a quest inserts one comment at the top of the open file, in the villager's voice, for example `// Odile: steel is ore and coal together. Where would they meet?`. It is a nudge, not a solution, and it does not name the shop. When that quest is handed over and it grants a trigger, one example with a comment is inserted under that line, once. A file that already exports `onTick` does not gain a second one. If that quest was already offered the line, deleting it does not bring it back. The API book marks a function `new` while the quest that granted it is open.

## Village

Seven houses and a meadow occupy two rows of 384×288 world-pixel lots west of the works. The houses use their native 210×176 prints at 1.4×. Each starts broken and appears working after a quest from that house is handed over. The river runs under the bridge. Lanes join the main road, and a spur leads to the gate in the works fence.

All eight villagers stand beside their houses from the start. A cameo and name move together. A gold `!` offers a quest, a grey `?` marks the open quest, and a gold `?` means it is ready to hand over. The two gold marks bob up and down by 2 world px every 1.6 seconds. Villagers without a mark are dim until they have had a quest handed over.

Each villager rests for 4–8 seconds between short, eased walks of 1.2–1.8 seconds. The walk stays within the villager’s own lot and within 240 world px of the house base. There is room for the whole token, including its name and raised mark, between houses, neighbours, paths, water, scenery and fence. A narrow gap shortens the step. Hovering, holding a pointer down or opening the villager’s dialog stops both walker and mark in place. A hidden tab or paused floor holds everyone still. Each resumes on its own clock. Reduced motion places each cameo at its original pixel spot with a still mark. At seven of those spots the caption footprint extends 6 px into a lane.

Click the cameo, caption or mark to open the villager’s dialog. It shows their portrait, name and role. An offer has the villager’s quote, one goal, rewards and Take quest. A held offer explains what it needs. An open order shows delivery progress. A ready order marks the goal complete and offers Hand over. A villager without a request recalls the last hand-over or names the level they are waiting for.

## Toasts

Up to three toasts stack above the zoom controls at the bottom right of the field. On Take, the villager explains the work in their own words. A stuck check or a hand-over can bring another cameo and line. Event toasts report passing checks, a ready order, credits and XP, a level, a grant, a new machine or drone, or a purchase. Villager lines last seven seconds and event notices four. Hover holds the stack and a click dismisses a toast. The tracker, Tests and API book keep the information needed to act. Script errors appear in the Console and problem counts.

## Works

The map fills the top row. The village extends 20 columns west of the works, and on load or resize the default camera fits the works and the nearest eight village columns in the row. The whole grid stays visible and uncropped. The center control returns to that fit. Pan west or zoom out to see the rest of the village. Labels sit on the things themselves, in one caption: Vein A, Vein B, Depot, Furnace, and `drone-1`. A revealed vein uses its own name.

Each drone carries a cargo badge, such as `3/5`. While it is walking, a faint line follows the route it was given. Hovering an entity highlights it. Clicking a machine or drone, or its row under Machines in the Journal, opens its card with what it is, what it holds, its recipes, and its buttons. The card follows its footprint during pan, zoom and drone movement. It opens to the right when space allows, then tries the left and finally below. Close it with the X, Escape from the floor or card, or a click on empty floor. Recipes are facts. A button names the call and the reason it can run, such as `Needs 2 ore`, `Unload at furnace`, or `Collect with drone-1`. Dump calls `drone.dump()`. The drone's hit target follows the sprite. The Depot and Furnace captions are their own hits, so a drone standing on the tile does not hide the building. A vein is labeled poor, normal, or rich, and a bar shows measured mining on the drone and on the vein. A haul with no measured progress is a task label. A play mark in the gutter of `main.ts` calls one exported function once, once Run is unlocked. The same command is `Run function at cursor`. The mark uses the project dirty flag: a dirty project says deploy and run. A clean Deploy button says Deployed. Deploying clears current drone tasks. The result is a console line, such as `smeltOnce ok`. Loop, once Ines is handed over, is the toggle `Loop: onTick`. It calls `onTick` every tick. The console records when that loop starts and stops. With no `onTick` in `main.ts` the toggle is disabled. A lit Loop whose deployed `main.ts` has no `onTick` says so on the grant line.

## Editor

The file tree is the left column of the editor row. Its Files toggle and the new, rename, and delete tools share one header row with the editor. That row is 36px, with a 1px bottom border, and it is the top line of both panels.

The editor side of the row is the open file tabs, then API, Loop, and Deploy, then quick open and search. Deploy is always on that row. There is no second title for the open file. Ctrl+Enter still deploys. API opens the book over the page. Escape or the X closes it. Loop appears when that trigger is unlocked, labelled `Loop: onTick`, with the tooltip `calls onTick every tick`. There is no toolbar Run and no Stop button. The gutter mark is the Run.

Tests and Console share the pane to the right of the code. The pane's header is the same 36px row, with two tabs: Tests and Console. The selected tab is remembered in the browser. A saved Checks choice opens Tests. While Console is selected the header reads `Tick 12762`, with a space. Borders on this row are 1px. The seams between tree, code, and this pane are the splitters, which draw a line only while hovered or dragged.

The tracker and the Journal card show the delivery quantity. A test turns failed only after its facts have not changed for 20 ticks, about 10 seconds, since Take quest or the last Deploy. The first stuck test adds one fact from the works. A full cart that has not moved for that stretch, on or beside a vein, is named before the furnace, such as `drone-1 is full (3/3) at Vein A and not moving`. Later tests say `waits on: Ore reaches the furnace` instead of repeating that fact. The fact names a field. It does not say what to write.

The Tests tab lists each test of the open quest. A row is the test's name, a plain line for what it checks, and the stuck reason when there is one. Clicking the row marks it. There is no Checks tab. A host error, such as a failed deploy, a failed save, or a floor renderer error, is a line above this list and a console row. Those rows count in the problems badge.

The Console tab lists `console.log`, `console.info`, `console.warn`, and `console.error` from the deployed program, and the same runtime errors. Each row is a grid: the tick in a narrow muted column, the message in the flexible column, and the location once on the right. A `main.ts:18 ·` prefix is not repeated in the message. A repeated line keeps one row; the count is a small `x N` badge on the message, not trailing text. A long error wraps under the message column, indented clear of the tick. The location is a control that jumps to that line. Clear empties the list. While Tests is selected, the Console tab shows how many new lines have arrived since it was last open. That count is red when any of those lines is an error. `drone.cargoKind` is `ore`, `coal`, `ingot`, `steel`, or `null`. Mining a different rock dumps ore or coal and writes an info line. A cart of ingots or steel is not dumped. The depot accepts ore and coal without a cap. The furnace hopper holds 6 ore and 3 coal unless Bigger hopper was bought. An action that refuses names the drone, where it is, what it carries, and what the target accepts, including a full hopper.

The API book is a modal. Its sections are Furnace, Drone, Depot, Veins, Events, and Works. Each entry is the signature, one line, and an example with a comment. A locked entry names the quest that unlocks it. Charts still open under the code. The book does not.

## Status bar

A quiet strip, every item the same height, an icon and a short label, each with a tooltip. From the left: one lamp for the script, running, error, or stopped; then the error count and the warning count, which open the Console filtered to those lines. In the spare middle, one line names what each drone is doing, such as `drone-1: mining Vein A`. That line is a single row with an ellipsis and a fixed height. A new task is shown after the same words have held for two ticks, so a one-tick flicker stays off the bar. On the right, beside the drone line: a CPU meter that is always there, then the caret as `Ln 12, Col 4`, and the tick. The meter reads `world.cpu` for that snapshot. The label is `CPU 34/50`. The spent figure is the highest of the last few ticks, and a short bar fills with it. The width is fixed and the figures are tabular, so a change does not move the caret. At or under 80% the meter is quiet. Above 80% it turns gold. At the limit it uses the alert color and the bar is full. The tooltip says that CPU is the budget for one tick, that a call past the limit does not run, and that CPU +10 in the shop raises the limit. Buying that item, or a quest that sets the limit, changes the meter on that snapshot. The console still records `CPU limit (n) hit.` Depot, furnace, and drone quantities stay on the map and the machine inspector. The inspector still names the task on the drone.

## One home each

| Element | Home |
| --- | --- |
| Credits and level | Nav, two pills |
| Journal and Shop buttons | Nav, after Kettlewick Works |
| Request, portrait, quote, goal, rewards and quest action | Villager dialog or Now in the Journal |
| Requests, hand-over history and machine list | Journal dialog |
| Next step, grant and file link | Persistent tracker |
| Delivery quantity, remaining test and Hand over | Tracker and current card in the Journal |
| Test marks at a glance | Tracker in the top-right corner of the field |
| Purchases | Shop dialog |
| Works, village, cameos and quest marks | Full-width field above the editor |
| Villager lines and event feedback | Toasts above the field’s zoom controls |
| Machine facts and manual actions | Card beside the selected machine or moving drone |
| Files, code, API, Loop, Deploy, gutter Run | Editor header and the code under it |
| Pass and fail | Test rows beside the code |
| Errors and sim events | Console tab |
| Script, problems, drone task, caret, tick, CPU | Status bar |
| Player console.log | Console tab, beside Tests |
| API book | Modal from the editor toolbar |
| Charts | One slot under the code |
| Stock and drone loads | Map labels and the machine inspector |
