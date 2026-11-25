# v8 quest screen

Governs the arrangement of Kettlewick Works. The rules are [ADR 0039](../adr/0039-quest-ux-village.md), [ADR 0034](../adr/0034-cpu-meter-stays-visible.md), [ADR 0033](../adr/0033-quest-card-stays-still.md), [ADR 0028](../adr/0028-run-to-completion.md), [ADR 0024](../adr/0024-quest-rail-and-status.md), [ADR 0025](../adr/0025-functions-with-triggers.md), [ADR 0022](../adr/0022-quest-loop-no-loss.md), and [the first playable slice](v8-first-playable.md).

The shell is the workshop frame already on screen: charcoal palette, 65px nav, 25px status bar. The field spans the top row. The editor fills the row below it. One splitter component divides the map from the editor, the file tree from the code, and the code from the tests. At rest the splitter draws nothing. Hover and drag show a 2px accent line and a small grip, with the row-resize or col-resize cursor, on an 8px hit area. Double-click returns that split to its default. The quest card keeps the request-card shape in the Journal with padding 12px, radius 7px, 12px between blocks, a 13px goal, a 13px villager quote, a 34px gold button, and a 48px portrait.

## Proportions

The grid is 16 cells wide and 6 tall, so the map is a wide row, not a tall column. It spans the full width inside the frame padding. A horizontal splitter under the map sets the row's height. The default is 45% of the works height. The splitter can move it between 22% and 75%, and the height is saved in this browser under `inherit.v8.map-height`.

The machine card opens in a centred GameDialog, sized to its contents between 640px and 880px where space allows. At 1280×720 the sections have a 386px height budget. Small sheets use one column. Balanced sections sit side by side, and a tall stock list can continue in the second column. On a narrow phone the columns stack.

The file tree is a column inside the editor row, 140px until the player drags it. The drag stays between 96px and 420px, and the width is saved as `inherit.v8.tree-width`. Double-click restores 140px. One Files toggle sits on its bar. Under 1280px it starts closed, as a narrow rail with that same toggle. Open or closed is saved separately. Dragging the rail opens it.

The editor and its side pane fill the rest of the bottom row. The file tree is the left of that row. The code is the middle. The pane starts at 300px on the right and drags between 220px and 560px. The width is saved as `inherit.v8.side-width`. Double-click restores 300px.

## Reading order

1. Nav. The logo and the `Inherit.` wordmark, credits, Journal, Machines and Shop, then Settings and the player’s level and XP at the right edge.
2. Field. A gold mark identifies a villager with a request. Clicking a villager opens their dialog. Clicking a machine opens its card.
3. Editor. The open file tab, the code, API, Loop, Deploy, and the tests beside the code.
4. Status bar. The script, problems, the drone line, CPU, caret and tick.

The field stays above the editor on a narrow window. Journal provides a keyboard route to requests and hand-over history. Machines provides the keyboard route to machine and drone cards.

## Nav

The logo and the `Inherit.` wordmark with its gold dot link home, set off by a divider. Beside them, the credits pill shows a coin and the current balance. A credit gain floats up from the pill unless the player prefers reduced motion. Journal, Machines and Shop follow as text links. Their text brightens on hover or keyboard focus. A gold underline marks the open dialog. Journal shows a gold dot and announces “new request” when a request is listed and no quest is open.

Settings opens Charts and Start over. At the right edge, a 32px XP ring surrounds a player icon. Beside it are the level and XP, for example `Level 3` and `XP 12/20`. The tooltip reads `Level 3. 12 / 20 XP.` The ring fills clockwise from the top across the current level. At the last level it stays full and the label shows total XP.

## Quest tab

Quest is the first tab beside Tests and Console. Its page scrolls within the pane. Before a quest is taken, the next step names the available villager. Choosing their name opens the dialog and centres the map on their lot. A line explains the gold exclamation mark, followed by a Journal button. At the end of the chain the page shows `More is coming.` and Journal.

The log shows one expanded entry for the open quest. A 40px portrait, giver’s name, role and quest title head the parchment entry. Selecting the header visits the giver. Their quote appears in italics above the goal. The goal is plain words, such as `Smelt an ingot and bring it to Bram.`; it never names code. A code word the quest needs, such as `smeltOnce`, sits in a small muted hint under the next step. Each delivery has its own objective and receipt count, with a gold check when full. An old order keeps its saved goods, quantities, goal and title. The next step follows the objectives, with any grant line and file link below it.

When all checks pass, Hand over pulses once. A gold dot on the Quest tab announces a ready hand-over while another tab is selected. See Tests opens the Tests tab and selects the remaining check when delivery is full and a check is still open.

## Journal, Machines and Shop

The Journal has three sections in order.

1. **Now** shows the open quest or the first available request. The card has the title, portrait, villager’s quote, one goal, delivery quantity and reward tiles. Old contracts show their saved goal and quantities. A request has Take quest and an All requests button that focuses the list. A held request shows its hold sentence and disables Take. The open quest offers Hand over when ready, or View remaining test if delivery is full and a check is open. With no card, Now shows the next step.
2. **Requests** lists the available villagers while no quest is open. Each row has an initial, name, ask and any hold. Selecting a row opens that villager’s dialog.
3. **Done** lists hand-overs in the order they happened, with each title, giver and change.

Machines opens its own dialog from the nav. Each row names a machine, drone or visible vein and gives its detail. Selecting a row replaces the list with the machine card. Closing the card returns focus to the Machines link.

Shop lists the existing conveniences. Each row shows the detail and price or Owned. Buying keeps Shop open. Owned items and purchases beyond the current credit balance are disabled.

Journal, Machines, Shop, machine cards, villager dialogs and the API book use native modals. Each panel slides down 24px and fades in with its backdrop over 220ms. Closing from inside reverses the motion over 160ms. With reduced motion it fades in and out in place. Opening one closes the previous surface. Escape, the close button or a backdrop click returns focus to the opener, or to the Factory map after a canvas click. Editor shortcuts wait until the dialog closes.

Taking a quest inserts one comment at the top of the open file, in the villager's voice, for example `// Odile: steel is ore and coal together. Where would they meet?`. It is a nudge, not a solution, and it does not name the shop. When that quest is handed over and it grants a trigger, one example with a comment is inserted under that line, once. A file that already exports `onTick` does not gain a second one. If that quest was already offered the line, deleting it does not bring it back. The API book marks a function `new` while the quest that granted it is open.

## Village

Seven houses and a meadow occupy two rows of 384×288 world-pixel lots west of the works. The houses use their native 210×176 prints at 1.4×. Each starts broken and appears working after a quest from that house is handed over. The river runs under the bridge. Lanes join the main road, and a spur leads to the gate in the works fence.

All eight villagers stand beside their houses from the start. A cameo and name move together. A gold `!` offers a quest, a dim grey outlined `?`, smaller and still, marks the open quest, and a filled gold `?` with a soft glow means it is ready to hand over. The two gold marks bob up and down by 2 world px every 1.6 seconds. Villagers without a mark are dim until they have had a quest handed over.

Each villager rests for 4–8 seconds between short, eased walks of 1.2–1.8 seconds. The walk stays within the villager’s own lot and within 240 world px of the house base. There is room for the whole token, including its name and raised mark, between houses, neighbours, paths, water, scenery and fence. A narrow gap shortens the step. Hovering, holding a pointer down or opening the villager’s dialog stops both walker and mark in place. A hidden tab or paused floor holds everyone still. Each resumes on its own clock. Reduced motion places each cameo at its original pixel spot with a still mark. At seven of those spots the caption footprint extends 6 px into a lane.

Click the cameo, caption or mark to open the villager’s dialog. It shows their portrait, name and role. An offer has the villager’s quote, one goal, rewards and Take quest. A held offer explains what it needs. An open order shows delivery progress. A ready order marks the goal complete and offers Hand over. A villager without a request recalls the last hand-over or names the level they are waiting for.

## Toasts

Up to three toasts stack upward at the bottom right of the window, 16px from the right and 12px above the status bar. They are 340px wide where space allows, with an 8px gap, 10px by 12px padding, 14px text, 18px icons and 40px villager cameos. Clicks between toasts reach the game.

On a fresh game, one welcome toast names the first available villager and points to the gold exclamation mark beside the house. The pointer lasts seven seconds and appears once per page session. The next step and hint remain in Quest. On Take, the villager explains the work in their own words. A stuck check or a hand-over can bring another cameo and line. Event toasts report passing checks, a ready order, credits and XP, a level, a grant, a new machine or drone, or a purchase. Villager lines last seven seconds and other notices last four. Hover holds the stack and a click dismisses a toast. Tests, the Journal and the API book keep the details available. Script errors appear in the Console and problem counts.

## Works

The map fills the top row. The village extends 20 columns west of the works, and on load or resize the default camera fits the nearest twelve village columns, three lots wide, and the works up to vein B, so the village takes about 44% of the width. The depot, furnace and every vein stay in view; only the empty last grid column waits past the right edge. No caption is drawn on the field. The center control returns to that fit. Pan west or zoom out to see the rest of the village. Labels sit on the things themselves, in one caption: Vein A, Vein B, Depot, Furnace, and `drone-1`. A revealed vein uses its own name.

Each drone carries a cargo badge, such as `3/5`. While it is walking, a faint line follows the route it was given. Hover and selection draw one rounded highlight around the sprite and its name together. Clicking a machine, drone or vein opens its card over the app and keeps that object selected behind the dim backdrop. Escape, the X or a backdrop click closes the card and returns focus to the Factory map.

The card header shows the machine as drawn on the field, centred on a 112px floor-colour plate beside its name, kind, role and current status. State shows each capacity on its own row with a resource dot, coloured bar and count. Full counts and progress use gold. Facts have separate labels and values. Recipes show input and output chips joined by an arrow, with the published call on the right and missing ingredients below.

Code API is a reference list. Each signature has a short description and a readiness tag. Its single API link opens the book at the relevant section. Locked lists a gated action and its recipe together, with one unlock title. The footer shows “Esc to close” on the left and a separate Actions bar on the right. Its buttons run the available manual commands and show the inspection reason when disabled.

Dump calls `drone.dump()`. The drone's hit target follows the sprite. The Depot and Furnace captions are their own hits, so a drone standing on the tile does not hide the building. A vein is labeled poor, normal, or rich, and a bar shows measured mining on the drone and on the vein. A haul with no measured progress is a task label. A play mark in the gutter of `main.ts` calls one exported function once, once Run is unlocked. The same command is `Run function at cursor`. The mark uses the project dirty flag: a dirty project says deploy and run. A clean Deploy button says Deployed. Deploying clears current drone tasks. The result is a console line, such as `smeltOnce ok`. Loop, once Ines is handed over, is the toggle `Loop: onTick`. It calls `onTick` every tick. The console records when that loop starts and stops. With no `onTick` in `main.ts` the toggle is disabled. A lit Loop whose deployed `main.ts` has no `onTick` says so on the grant line.

## Editor

The file tree is the left column of the editor row. Its Files toggle and the new, rename, and delete tools share one header row with the editor. That row is 36px, with a 1px bottom border, and it is the top line of both panels.

The editor side of the row is the open file tabs, then API, Loop, and Deploy, then quick open and search. Deploy is always on that row. There is no second title for the open file. Ctrl+Enter still deploys. API opens the book over the page. Escape or the X closes it. Loop appears when that trigger is unlocked, labelled `Loop: onTick`, with the tooltip `calls onTick every tick`. There is no toolbar Run and no Stop button. The gutter mark is the Run.

Quest, Tests and Console share the pane to the right of the code, in that order on the same 36px header row. The selected tab is remembered under `inherit.v8.side`. A missing or unrecognised choice opens Quest. Borders on this row are 1px. The seams between tree, code, and this pane are the splitters, which draw a line only while hovered or dragged.

The Quest tab and the Journal card show the delivery quantity. A test turns failed only after its facts have not changed for 20 ticks, about 10 seconds, since Take quest or the last Deploy. The first stuck test adds one fact from the works. A full cart that has not moved for that stretch, on or beside a vein, is named before the furnace, such as `drone-1 is full (3/3) at Vein A and not moving`. Later tests say `waits on: Ore reaches the furnace` instead of repeating that fact. The fact names a field. It does not say what to write.

The Tests tab lists each test of the open quest. A row is the test's name, a plain line for what it checks, and the stuck reason when there is one. Clicking the row marks it. There is no Checks tab. A host error, such as a failed deploy, a failed save, or a floor renderer error, is a line above this list and a console row. Those rows count in the problems badge.

The Console tab lists `console.log`, `console.info`, `console.warn`, and `console.error` from the deployed program, and the same runtime errors. Each row is a grid: the tick in a narrow muted column, the message in the flexible column, and the location once on the right. A `main.ts:18 ·` prefix is not repeated in the message. A repeated line keeps one row; the count is a small `x N` badge on the message, not trailing text. A long error wraps under the message column, indented clear of the tick. The location is a control that jumps to that line. Clear empties the list. While Quest or Tests is selected, the Console tab shows how many new lines have arrived since it was last open. That count is red when any of those lines is an error. `drone.cargoKind` is `ore`, `coal`, `ingot`, `steel`, or `null`. Mining a different rock dumps ore or coal and writes an info line. A cart of ingots or steel is not dumped. The depot accepts ore and coal without a cap. The furnace hopper holds 6 ore and 3 coal unless Bigger hopper was bought. An action that refuses names the drone, where it is, what it carries, and what the target accepts, including a full hopper.

The API book is a modal. Its sections are Furnace, Drone, Depot, Veins, Events, and Works. Each entry is the signature, one line, and an example with a comment. A locked entry names the quest that unlocks it. Charts still open under the code. The book does not.

## Status bar

A quiet strip, every item the same height, an icon and a short label, each with a tooltip. From the left: one lamp for the script, running, error, or stopped; then the error count and the warning count, which open the Console filtered to those lines. In the spare middle, one line names what each drone is doing, such as `drone-1: mining Vein A`. That line is a single row with an ellipsis and a fixed height. A new task is shown after the same words have held for two ticks, so a one-tick flicker stays off the bar. On the right, beside the drone line: a CPU meter that is always there, then the caret as `Ln 12, Col 4`, and the tick. The meter reads `world.cpu` for that snapshot. The label is `CPU 34/50`. The spent figure is the highest of the last few ticks, and a short bar fills with it. The CPU icon, left-aligned label and 36px bar sit 4px apart. The label uses the same 11px mono font as its neighbours and reserves at least 9ch for tabular figures. At or under 80% the meter is quiet. Above 80% it turns gold. At the limit it uses the alert color and the bar is full. The tooltip says that CPU is the budget for one tick, that a call past the limit does not run, and that CPU +10 in the shop raises the limit. Buying that item, or a quest that sets the limit, changes the meter on that snapshot. The console still records `CPU limit (n) hit.` Depot, furnace, and drone quantities stay on the map and the machine inspector. The inspector still names the task on the drone.

## One home each

| Element | Home |
| --- | --- |
| Credits and level | Credits pill beside the wordmark and an XP ring and level beside Settings |
| Journal, Machines and Shop | Text links after credits in the nav |
| Request, portrait, quote, goal, rewards and quest action | Villager dialog or Now in the Journal |
| Requests and hand-over history | Journal dialog |
| Machine and drone list | Machines dialog |
| Next step, grant and file link | Quest tab |
| Delivery progress and Hand over | Quest tab, villager dialog and Now in the Journal |
| Purchases | Shop dialog |
| Works, village, cameos and quest marks | Full-width field above the editor |
| Villager lines and event feedback | Toasts in the window’s bottom-right corner, above the status bar |
| Machine facts and manual actions | Machine card in the wide GameDialog over the app |
| Files, code, API, Loop, Deploy, gutter Run | Editor header and the code under it |
| Pass and fail | Test rows beside the code |
| Errors and sim events | Console tab |
| Script, problems, drone task, CPU, caret, tick | Status bar |
| Player console.log | Console tab, beside Tests |
| API book | Modal from the editor toolbar |
| Charts | One slot under the code |
| Stock and drone loads | Map labels and the machine inspector |
