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
5. Status bar. One live sentence, then the quantities.

On a narrow window the rail stacks above the map, and the map stacks above the editor. The same five stops stay in that order.

## Nav

Logo, then the place name Kettlewick Works. Credits are the large figure, with a space: `300 credits`. Beside them, Level and a bar filled from the XP already inside this level to the next step in `levelSpan`. CPU is `used/limit`. A Running pill shows that the clock is going. Settings opens Console, API, Charts, and Start over.

The bar uses the six steps already in `levelFor`. Past the last step it stays full.

## Quest rail

One card, two tabs: Quests and Shop. The shop lists every item with its price in credits. Owned replaces the price. A purchase stays on this tab.

Quests lists every quest the player can take. On this chain that is one villager. The row is the portrait, the name, the role, the title, and the goal as one sentence. The why line is shown as its sentences under Hint, and Hint can fold them. That why line is the hint: it may name a field, a brick, or a shop item. The reward is that quest's credits and XP. While the quest is open, the same card shows how many of the order have arrived.

Take quest and Complete quest share the footer of the rail. Take shows when a quest is waiting. Complete shows in that footer once the quest is open, and it stays disabled until every check passes. After the last quest the card says more is coming.

## Works

The map fills the top row beside the quest rail. On load, and whenever that row changes size, a resize observer scales the tiles with a contain fit: the whole grid stays visible, centered, and uncropped. The center control returns to that fit. Zoom can go closer after that. Labels sit on the things themselves, in one caption: Vein A, Vein B, Depot, Furnace, and `drone-1`. A revealed vein uses its own name.

## Editor

The file tree is the left column of the editor row. Its Files toggle and the new, rename, and delete tools share one header row with the editor. That row is 36px, with a 1px bottom border, and it is the top line of both panels.

The editor side of the row is the open file tabs, then Deploy, then quick open and search. Deploy is always on that row. There is no second title for the open file. Ctrl+Enter still deploys.

Checks are the 300px pane to the right of the code. Before a quest is taken the pane says "Take a quest to see checks". Once a quest is open, each check is pass or fail in the check's own words. The pane's header is the same 36px row. Borders on this row are 1px.

Console, API, and Charts open one at a time under the code. The console is the log of tick messages.

## Status bar

One sentence on the left. A runtime error, a save problem, the floor renderer, the CPU limit, or "Every test passes. Complete the quest." Quantities on the right: depot ore, furnace ore, furnace coal, ingots, steel, and each drone's load. A check's own sentence stays in the checks. The quest's why stays on the card. The latest village line after a quest is completed stays here until the next quest is taken.

## One home each

| Element | Home |
| --- | --- |
| Credits, level, CPU, Running | Nav |
| Portrait, goal, hint, reward, Take, Complete, shop | Quest rail |
| Map and its labels | Top row, beside the quest rail |
| Files, code, Deploy | Editor header and the code under it |
| Pass and fail | Checks pane, right of the code |
| Console, API, Charts | One slot under the code |
| Live sentence | Status bar |
| Stock and drone loads | Status bar, after the sentence |
