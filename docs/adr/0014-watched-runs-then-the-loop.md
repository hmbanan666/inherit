# Watched runs, then the loop

## Context

Nick played the from-scratch chapter (#44) and called it a failure: a junior would quit in the first minutes, and it felt like an idea, not a game. The foundation audit (`docs/audits/2026-11-21-foundation.md`) found the causes. The world was hidden while he learned, the first task taught files and imports before programming, `onTick` arrived before he needed it, tasks advanced on their own, reveals came in a burst, and place names were magic strings. It recommends keeping the world and the primitives and changing how they are taught. This ADR adopts that direction.

## Decision

**The shed is on screen from second one.** The left game area always shows Uncle's shed: the mine, the furnace, the cart and Uncle's arm, each machine labelled in code font with its exact name (`"mine"`, `"furnace"`, `"cart"`), and the townsperson who is asking standing nearby with a speech bubble. The camera frames the machines in use and grows as machines are bought. The top navigation starts with one meaningful tab, **Shed**. Code is not a section; the editor is always on the right.

**Watched runs teach.** Before the loop lesson the primary button says **Run**. Run executes `main.ts` once, and the factory plays back every call at about two calls per second: the line lights up in the editor, the arm moves on the real floor, and the result shows (a rock in the hand, a "not ready yet" bubble when the furnace is still working, a plain message for a place that does not exist). Machines keep working between runs.

**Then the loop.** After the player has pressed Run by hand several times for Bram's ingots, Bram asks whether he means to press Run all day. The card introduces `export function onTick()` in one sentence ("the factory clock calls `onTick` every tick; `export` lets the clock see it"), a clock on the shed wall starts, and the same button becomes **Deploy**. Deploy never appears, and never fails with "Export onTick", before this lesson. Afterwards "Run once" stays in the button's menu for debugging.

**One argument put and a visible hand.** `put(place)` puts whatever the arm holds. `take(place)` lifts the front finished item into the hand and returns its name; the hand holds one item, and taking while holding something fails with a plain message. This supersedes `put(place, item)` in ADR 0013. Variables arrive when the player needs one to decide something (`const rock = take("mine")` at the mixed vein), not in minute two.

**Concept ladder, one new idea per task.** Call with a place name (`take("mine")`), sequence (`put("furnace")` after it), the result can be nothing (the furnace is not ready yet), function (wrap lines into `smelt()` and `ship()`), the tick loop (`onTick`, Deploy), then for the rest of the chapter: variable and `if` (mixed vein), object property (`look("cart").wanted`), parameters (`move(from, to)`), looping over a list (`fixBroken()`), and finally modules (the Mayor moves the player's functions into their own file). Each idea is explained in one plain sentence at the moment it appears. Practice tasks give the goal and the places, not the lines.

**Starter code has everything but the new line.** Uncle has already written `import { take, put } from "inherit"` at the top of `main.ts`, with a comment that his arm can take and put. When a new primitive unlocks, the card asks for a one-word addition to Uncle's import line. Everything stays in one file, `main.ts`, until the Mayor's request; there are no player-to-player imports before it. My library is a collapsed list of the functions in his code (name and signature, open on click).

**Place names are typed.** The editor autocompletes valid place names inside `take("`, hovering a place name lights up its machine, and an unknown name gives "There is no place called "mines". Places: mine, furnace, cart."

**A task ends on a solved card.** When the checks pass, the task card turns into "Done": what he did, the idea he used, the reward, and a **Continue** button. Nothing advances, opens or unlocks before Continue, and each Continue releases at most one reveal (the Town tab, the Inbox, coins and the debt). The celebration lives in the card, never on top of the floor.

**Checks describe the world, not the code:** "A rock reaches the furnace", "Ingots in Bram's cart: 1 / 3", with display names, not ids.

**Hints have three rungs:** the idea in words, then which places and functions to use, then the exact lines.

**Calm pace.** In chapter 1, Bram's three ingots take about 30 to 45 seconds of visible flow after Deploy, so the player watches his loop work. No timers or pressure (ADR 0008).

**Frame.** The frame Nick likes stays: top navigation, thin footer, menus, palette, Monaco with highlighting, game area beside the editor, Checks and Console under the editor. The primary footer button returns to the prominent size it had before #44, filling the footer's height, with its label and shortcut (Ctrl+Enter). It never relabels on an error; errors show in plain words in Checks.

**Words.** Player-facing text never says "verb", "wire up", "bench" or "kata". It says function, place, Run and Deploy, and explains each the first time.

## Consequences

- Supersedes in ADR 0011: the code-only first launch and the Factory section appearing after the first dig. The screen still grows with the story (Town, Inbox, coins), one reveal per Continue.
- Supersedes in ADR 0013: `put(place, item)`, a file per function from the first task, and live bench checks that advance on their own. The rest of ADR 0013 stands: three primitives, the player writes every function he calls, coins only from requests and orders, the end of chapter 1.
- Saves from the previous chapter version restart chapter 1 and keep their code as a snapshot (ADR 0004).
