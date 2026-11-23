# v8 quest screen

Governs the arrangement of Kettlewick Works. The rules are [ADR 0022](../adr/0022-quest-loop-no-loss.md), [ADR 0021](../adr/0021-v8-inherit-a-factory.md), and [the first playable slice](v8-first-playable.md).

The shell is the workshop frame already on screen: charcoal palette, 65px nav, 7px resizer, 25px status bar. The map is the main area. The quest rail is a fixed 280px column. The editor dock, checks included, sits on the right. The quest card keeps the request-card shape and is compact enough for that column: padding 12px, radius 7px, 12px between blocks, a 13px goal, a 13px hint, a 34px gold button, and a 48px portrait.

## Proportions

The map is `flex: 1`. It is the largest share of the width. At 1024px it is at least 45% of the window. Wider windows give the extra width to the map.

The quest rail does not grow. It stays 280px, inside the 260–300px band. Shop stays a tab on that rail. The portrait and the quest text are compact so the column can stay narrow.

The file tree is 140px. A Files toggle opens and closes it. Under 1280px it starts closed. The choice is saved in this browser.

The editor dock prefers 38% of the window, and the splitter can move it between 16% and 40%. That preference applies only while the map still has 45% and the rail still has 280px. At 1024px those two come first, so the dock is about a quarter of the window. From about 1560px the dock sits in the 35–40% band. Past the 38% cap, further width goes to the map. Dragging the splitter, or the arrow keys on it, saves the width in this browser. Until then, resizing the window keeps the map's share.

## Reading order

1. Nav. Where you are, what you hold, whether the clock is running.
2. Quest rail. Who is asking, the one goal, the hint, the reward, the one button.
3. Works. The map.
4. Editor. The file, the code, Deploy when it differs, then the checks.
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

The map fills the center column. On load, and whenever that column changes size, a resize observer scales the tiles to the column and keeps the grid centered. The whole grid is shown when that already fills the column. When the whole grid would sit as a short band in a tall column, the scale covers the column instead, so the tiles fill the frame. Zooming out from that view reaches the whole grid again. The center control returns to the fit. Labels sit on the things themselves, in one caption: Vein A, Vein B, Depot, Furnace, and `drone-1`. A revealed vein uses its own name. Zoom stays on the map.

## Editor

The file tree is the left column of the dock when it is open. The editor header carries the Files toggle, the open file name, and Deploy. Deploy is on that header only while the editor differs from the deployed files. Ctrl+Enter still deploys. Checks for the open quest sit under the editor, pass or fail, in the check's own words. Console, API, and Charts open one at a time in the slot under the checks. The console is the log of tick messages.

## Status bar

One sentence on the left. A runtime error, a save problem, the floor renderer, the CPU limit, or "Every test passes. Complete the quest." Quantities on the right: depot ore, furnace ore, furnace coal, ingots, steel, and each drone's load. A check's own sentence stays in the checks. The quest's why stays on the card. The latest village line after a quest is completed stays here until the next quest is taken.

## One home each

| Element | Home |
| --- | --- |
| Credits, level, CPU, Running | Nav |
| Portrait, goal, hint, reward, Take, Complete, shop | Quest rail |
| Map and its labels | Center |
| Files, code, Deploy | Editor |
| Pass and fail | Checks under the editor |
| Console, API, Charts | One slot under the checks |
| Live sentence | Status bar |
| Stock and drone loads | Status bar, after the sentence |
