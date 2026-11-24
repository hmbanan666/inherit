# v8 quest screen

Governs the arrangement of Kettlewick Works. The rules are [ADR 0028](../adr/0028-run-to-completion.md), [ADR 0024](../adr/0024-quest-rail-and-status.md), [ADR 0025](../adr/0025-functions-with-triggers.md), [ADR 0022](../adr/0022-quest-loop-no-loss.md), and [the first playable slice](v8-first-playable.md).

The shell is the workshop frame already on screen: charcoal palette, 65px nav, 25px status bar. The quest rail is a fixed 280px column on the left, the same panel surface as the rest of the desk. To its right, the map is the top row and the editor is the bottom row. One splitter component divides the map from the editor, the file tree from the code, and the code from the tests. At rest the splitter draws nothing. Hover and drag show a 2px accent line and a small grip, with the row-resize or col-resize cursor, on an 8px hit area. Double-click returns that split to its default. The quest card keeps the request-card shape and is compact enough for that column: padding 12px, radius 7px, 12px between blocks, a 13px goal, a 13px ask, a 34px gold button, and a 48px portrait.

## Proportions

The grid is 16 cells wide and 6 tall, so the map is a wide row, not a tall column. It spans the full width beside the quest rail. A horizontal splitter under the map sets the row's height. The default is 45% of that column. The splitter can move it between 22% and 75%, and the height is saved in this browser under `inherit.v8.map-height`.

The quest rail does not grow. It stays 280px, inside the 260–300px band, and it runs the full height of the desk. Shop stays a tab on that rail. The portrait and the quest text are compact so the column can stay narrow.

The file tree is a column inside the editor row, 140px until the player drags it. The drag stays between 96px and 420px, and the width is saved as `inherit.v8.tree-width`. Double-click restores 140px. One Files toggle sits on its bar. Under 1280px it starts closed, as a narrow rail with that same toggle. Open or closed is saved separately. Dragging the rail opens it.

The editor and the tests fill the rest of the bottom row. The file tree is the left of that row. The code is the middle. Tests start at 300px on the right and drag between 220px and 560px. The width is saved as `inherit.v8.side-width`. Double-click restores 300px.

## Reading order

1. Nav. Where you are, and the credits and level you hold.
2. Quest rail. Who is asking, what they need, the reward, the one button.
3. Works. The map.
4. Editor. The open file tab, the code, Run, Loop, Deploy, and the tests beside the code.
5. Status bar. The script, problems, caret, tick, and CPU when it is worth showing.

On a narrow window the rail stacks above the map, and the map stacks above the editor. The same five stops stay in that order.

## Nav

Logo and the place name Kettlewick Works stay on the left. Settings stays on the right and opens Charts and Start over. The API book opens from the editor, not from this bar. The center is two pills of equal height. Credits are a coin and the number. When credits arrive, that gain floats up from the pill, and the motion is skipped when the player prefers reduced motion. Level is a badge with the number and a thin XP bar. The XP count, such as `12 / 20 XP`, is the tooltip on that pill. CPU, Running, and any other status text are not in the header.

The bar uses the six steps already in `levelFor`. Past the last step it stays full.

## Quest rail

One card, two tabs: Quests and Shop. The shop lists the conveniences: hotter furnace, bigger cart, bigger hopper, and CPU. Each row shows the price in credits, or Owned. A purchase stays on this tab. Functions are not on this list. The second drone is not on this list.

With no quest open, the rail lists the villagers who have a request. A row is an initial, the name, and one line. Clicking it opens that request.

The open card is the title, the portrait, and one in-character line. Under that, one sentence says what is needed and how it is made, then one quantity bar, such as `Ingots 0/2` or `Steel 0/4`. Test rows are not on this card. The reward is tiles: credits, XP, an unlock such as `furnace.alloy()` when the quest grants one, Run, Loop, or Events when the quest grants that, and `drone-2` on Odile's card. There is no Next list and no shop-tier line. Level and XP stay in the header.

Take quest sits in the footer once a request is open. After Take, the footer says `In progress` until every goal is met, then a Hand over button. It is not a disabled count.

Taking a quest inserts one comment at the top of the open file, in the villager's voice, for example `// Odile: steel is ore and coal together. Where would they meet?`. It is a nudge, not a solution, and it does not name the shop. When the quest grants a trigger, one example with a comment is inserted under that line, once. A file that already exports `onTick` does not gain a second one. If that quest was already offered the line, deleting it does not bring it back. The API book marks a function `new` while the quest that granted it is open.

## Works

The map fills the top row beside the quest rail. On load, and whenever that row changes size, a resize observer scales the tiles with a contain fit and centers that grid in the row, horizontally and vertically. The whole grid stays visible and uncropped. The center control returns to that fit. Zoom can go closer after that. Labels sit on the things themselves, in one caption: Vein A, Vein B, Depot, Furnace, and `drone-1`. A revealed vein uses its own name.

Each drone carries a cargo badge, such as `3/5`. While it is walking, a faint line follows the route it was given. Hovering an entity highlights it. Clicking it, or a row under Machines, opens that object on the rail: what it is, what it holds, its recipes, and its buttons. Each button names the call, and Dump calls `drone.dump()`. The drone's hit target follows the sprite. A vein is labeled poor, normal, or rich, and a bar shows mining progress on the drone and on the vein. A play mark in the gutter of `main.ts` calls one exported function once, once Run is unlocked. A dirty file says deploy and run. While that tick runs, the editor row names the function, and Stop ends player code. Loop, once Ines is taken, calls `onTick` every tick.

## Editor

The file tree is the left column of the editor row. Its Files toggle and the new, rename, and delete tools share one header row with the editor. That row is 36px, with a 1px bottom border, and it is the top line of both panels.

The editor side of the row is the open file tabs, then API, Run, Loop, Stop, and Deploy, then quick open and search. Deploy is always on that row. There is no second title for the open file. Ctrl+Enter still deploys. API opens the book over the page. Run and Loop appear when those triggers are unlocked. Stop appears while a function is running.

Tests and Console share the pane to the right of the code. The pane's header is the same 36px row, with two tabs: Tests and Console. The selected tab is remembered in the browser. A saved Checks choice opens Tests. While Console is selected the header reads `Tick 12762`, with a space. Borders on this row are 1px. The seams between tree, code, and this pane are the splitters, which draw a line only while hovered or dragged.

The quantity lives on the quest rail. A test turns failed only after its facts have not changed for 20 ticks, about 10 seconds, since Take quest or the last Deploy. The first stuck test adds one fact from the works. A full cart that has not moved for that stretch, on or beside a vein, is named before the furnace, such as `drone-1 is full (3/3) at Vein A and not moving`. Later tests say `waits on: Ore reaches the furnace` instead of repeating that fact. The fact names a field. It does not say what to write.

The Tests tab lists each test of the open quest. A row is the test's name, a plain line for what it checks, and the stuck reason when there is one. Clicking the row marks it. There is no Checks tab. A host error, such as a failed deploy, a failed save, or a floor renderer error, is a line above this list and a console row. Those rows count in the problems badge.

The Console tab lists `console.log`, `console.info`, `console.warn`, and `console.error` from the deployed program, and the same runtime errors. Each row is a grid: the tick in a narrow muted column, the message in the flexible column, and the location once on the right. A `main.ts:18 ·` prefix is not repeated in the message. A repeated line keeps one row; the count is a small `x N` badge on the message, not trailing text. A long error wraps under the message column, indented clear of the tick. The location is a control that jumps to that line. Clear empties the list. While Tests is selected, the Console tab shows how many new lines have arrived since it was last open. That count is red when any of those lines is an error. `drone.cargoKind` is `ore`, `coal`, `ingot`, `steel`, or `null`. Mining a different rock dumps ore or coal and writes an info line. A cart of ingots or steel is not dumped. The depot accepts ore and coal without a cap. The furnace hopper holds 6 ore and 3 coal unless Bigger hopper was bought. An action that refuses names the drone, where it is, what it carries, and what the target accepts, including a full hopper.

The API book is a modal. Its sections are Furnace, Drone, Depot, Veins, Events, and Works. Each entry is the signature, one line, and an example with a comment. A locked entry names the quest that unlocks it. Charts still open under the code. The book does not.

## Status bar

A quiet strip, every item the same height, an icon and a short label, each with a tooltip. From the left: one lamp for the script, running, error, or stopped; then the error count and the warning count, which open the Console filtered to those lines. On the right: the caret as `Ln 12, Col 4`, the tick, and CPU only when the tick has spent at least half its budget or has already hit the limit. Depot, furnace, and drone quantities stay on the map and the machine inspector.

## One home each

| Element | Home |
| --- | --- |
| Credits and level | Nav, two pills |
| Portrait, need, quantity, reward, Take, Hand over, shop | Quest rail |
| Map and its labels | Top row, beside the quest rail |
| Files, code, API, Run, Loop, Stop, Deploy | Editor header and the code under it |
| Pass and fail | Test rows beside the code |
| Errors and sim events | Console tab |
| Script, problems, caret, tick, CPU | Status bar |
| Player console.log | Console tab, beside Tests |
| API book | Modal from the editor toolbar |
| Charts | One slot under the code |
| Stock and drone loads | Map labels and the machine inspector |
