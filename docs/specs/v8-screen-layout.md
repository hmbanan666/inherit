# v8 quest screen

Governs the arrangement of Kettlewick Works. The rules are [ADR 0022](../adr/0022-quest-loop-no-loss.md), [ADR 0021](../adr/0021-v8-inherit-a-factory.md), and [the first playable slice](v8-first-playable.md).

The shell is the workshop frame already on screen: charcoal palette, 65px nav, 25px status bar. The quest rail is a fixed 280px column on the left. To its right, the map is the top row and the editor is the bottom row, split by a 7px horizontal bar. The quest card keeps the request-card shape and is compact enough for that column: padding 12px, radius 7px, 12px between blocks, a 13px goal, a 13px hint, a 34px gold button, and a 48px portrait.

## Proportions

The grid is 16 cells wide and 6 tall, so the map is a wide row, not a tall column. It spans the full width beside the quest rail. A horizontal splitter under the map sets the row's height. The default is 45% of that column. The splitter can move it between 22% and 75%, and the height is saved in this browser.

The quest rail does not grow. It stays 280px, inside the 260–300px band, and it runs the full height of the desk. Shop stays a tab on that rail. The portrait and the quest text are compact so the column can stay narrow.

The file tree is one 140px column inside the editor row, with one Files toggle on its own bar. Under 1280px it starts closed, as a narrow rail with that same toggle. The choice is saved in this browser.

The editor and the checks fill the rest of the bottom row. The file tree is the left of that row. The code is the middle. Checks are a fixed 300px pane on the right, inside the 280–320px band.

## Reading order

1. Nav. Where you are, what you hold, whether the clock is running.
2. Quest rail. Who is asking, the one goal, the hint, the reward, the one button.
3. Works. The map.
4. Editor. The open file tab, the code, Deploy, and the checks beside the code.
5. Status bar. The quantities.

On a narrow window the rail stacks above the map, and the map stacks above the editor. The same five stops stay in that order.

## Nav

Logo, then the place name Kettlewick Works. Credits are the large figure, with a space: `300 credits`. Beside them, Level, the XP bar, and the count already inside this level: `XP 12/20`. CPU is `used/limit`. A Running pill shows that the clock is going. Settings opens Console, API, Charts, and Start over.

When a quest is completed, `+80 credits` and `+20 XP` float up beside those counters for a moment. The motion is skipped when the player prefers reduced motion.

The bar uses the six steps already in `levelFor`. Past the last step it stays full and the count is the total XP.

## Quest rail

One card, two tabs: Quests and Shop. The shop lists every item with its price in credits. Owned replaces the price. A purchase stays on this tab.

Quests lists every quest the player can take. On this chain that is one villager. The row is the portrait, the name, the role, the title, and the goal as one sentence. The why line is shown as its sentences under Hint, and Hint can fold them. That why line is the hint: it may name a field, a brick, or a shop item. The reward is that quest's credits and XP. While the quest is open, the same card shows how many of the order have arrived.

Take quest and Complete quest share the footer of the rail. Take shows when a quest is waiting, and it stays the primary button. Complete shows in that footer once the quest is open. Until every check passes it is muted and reads the count, such as `Complete · 1/3`. When every check is green it becomes the primary button and pulses once. After the last quest the card says more is coming.

Under the reward, the card shows the villager's one-line quote, then a Next list of the following two or three quest titles in a locked style, then the next shop tier: `Level 2 unlocks: Alloy`. The quote is flavor. It is not a hint.

## Works

The map fills the top row beside the quest rail. On load, and whenever that row changes size, a resize observer scales the tiles with a contain fit and centers that grid in the row, horizontally and vertically. The whole grid stays visible and uncropped. The center control returns to that fit. Zoom can go closer after that. Labels sit on the things themselves, in one caption: Vein A, Vein B, Depot, Furnace, and `drone-1`. A revealed vein uses its own name.

Each drone carries a cargo badge, such as `3/5`. While it is walking, a faint line follows the route it was given. Hovering an entity highlights it. Clicking it opens a small popover with the fields that entity has: id, pos, cargo and capacity, furnace input, or ore left.

## Editor

The file tree is the left column of the editor row. Its Files toggle and the new, rename, and delete tools share one header row with the editor. That row is 36px, with a 1px bottom border, and it is the top line of both panels.

The editor side of the row is the open file tabs, then Deploy, then quick open and search. Deploy is always on that row. There is no second title for the open file. Ctrl+Enter still deploys.

Checks are the 300px pane to the right of the code. Before a quest is taken the pane says "Take a quest to see checks". Once a quest is open, each check is pending, passing, or failed. Pending is a grey circle and ordinary text. A check turns failed only after its facts have not changed for 20 ticks, about 10 seconds, since Take quest or the last Deploy. A numeric check shows the live count in its own words, such as `Bram receives 4 ingots 0/4`. The first stuck check adds one fact from the works. A full cart that has not moved for that stretch, on or beside a vein, is named before the furnace, such as `drone-1 is full (3/3) at Vein A and not moving`. Later checks say `waits on: Ore reaches the furnace` instead of repeating that fact. The fact names a field. It does not say what to write. The pane's header is the same 36px row. Borders on this row are 1px.

A compact log sits at the top of the checks pane. It holds runtime errors and sim events, such as `Vein A is empty`. An error that names a file and a line jumps to that line in the editor when clicked.

Console, API, and Charts open one at a time under the code. The console is the log of tick messages.

## Status bar

Quantities only: depot ore, furnace ore, furnace coal, ingots, steel, and each drone's load. A check's own sentence stays in the checks. The quest's why stays on the card. Runtime errors and sim events stay in the checks log.

## One home each

| Element | Home |
| --- | --- |
| Credits, level, CPU, Running | Nav |
| Portrait, goal, hint, reward, Take, Complete, shop | Quest rail |
| Map and its labels | Top row, beside the quest rail |
| Files, code, Deploy | Editor header and the code under it |
| Pass and fail | Checks pane, right of the code |
| Errors and sim events | Log at the top of the checks pane |
| Console, API, Charts | One slot under the code |
| Live sentence | Status bar |
| Stock and drone loads | Status bar, after the sentence |
