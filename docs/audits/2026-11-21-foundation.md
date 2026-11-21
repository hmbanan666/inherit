# Foundation audit: is Inherit a game yet? (2026-11-21)

Scope: an audit only. No product code was changed. Inputs were ADR 0001–0013, `CONTEXT.md`, spec #32, ticket #43, PR #44, the code on `main` at `77cd39c`, and a scripted headless walk through the live build at https://inherit.kosarev.space (1440×900 and 1280×720, today). The screenshots are attached to the PR that adds this file.

## Verdict

**Keep the world and the primitives. Replace how the first 15 minutes teach them.**

`take` / `put` / `look` on named places, with the player writing his own functions, is a sound foundation. It is the same idea as Human Resource Machine's worker carrying one box between inbox, floor and outbox. The owner's playtest failed for five other reasons:

1. **The game is invisible while the player learns.** The first three tasks run on a hidden bench, and the floor only appears after the first Deploy (ADR 0011 and `getSurface`). For three tasks the player types code and watches nothing happen.
2. **The first task teaches architecture before programming.** By task 2 the player has met a separate file per verb, `export`, an import from `"inherit"`, an import from `"./dig"`, `return`, `const` and a two-argument `put`. The spec ordered it differently: user story 13 put files and imports at the bridge request, near the end.
3. **The loop is shown before the player feels the need for it.** `onTick` arrives as jargon in task 4. Then the factory finishes Bram's whole request in about 10 seconds with no player involvement, so the automation payoff is never felt.
4. **There is no game rhythm.** Tasks auto-advance about 1.2 seconds after the checks go green, then the next file opens. Section reveals arrive in a burst: Factory, Town, Inbox (2), Orders, coins and debt all appear within about 10 seconds of the first Deploy.
5. **Place names are magic strings.** The type is `place: string`, so there is no autocomplete. A typo like `take("mines")` silently returns nothing and gives no message.

**One direction:** a hybrid of the Human Resource Machine and Screeps models. Every new concept is first a **watched run**: the code runs once, slowly, on the real floor, with each call animated and its line highlighted. The loop (`onTick` plus Deploy) is introduced as the cure for pressing Run by hand. After that, the factory runs live and the player extends it, Screeps style. The game area is never empty. Every task ends on an explicit solved card with **Continue**.

---

## What the live build does today (evidence)

The scripted walk followed the hints exactly. Where it says "fast", it means real seconds on the live site.

| # | What the player sees | Where it comes from |
|---|---|---|
| 1 | First screen: the editor fills the full width. The nav has a lone `Code` tab and there is no game area. The request card takes about a quarter of the screen height (up to a third once the floor splits the screen). The stub is `export function dig() {}` with no import line, while the card's bricks show `import { take } from "inherit"`. (screenshot 01) | ADR 0011 ("First launch: only the code editor"); `app.vue` `.desk.code-only`; `onboarding.ts` `verb()` builds `stub` without imports |
| 2 | Pressing **Deploy** during the first task gives a red banner: `Deploy failed · main.ts · Export a function named onTick.` The player has not opened `main.ts`, and the button relabels itself to **Run**. (screenshot 05) | Deploy is always enabled; `runner.worker.ts` compiles `main.ts`; `app.vue` `{{ error ? 'Run' : 'Deploy' }}` |
| 3 | In `take("` autocomplete says "No suggestions". (screenshot 03) | `declarations.ts`: `take(place: string)` |
| 4 | `take("mines")` gives no error. The check stays red forever. (screenshot 04) | `primitives.ts` `take`: unknown place returns `undefined` silently |
| 5 | Typing the dig solution turns the check green, and about one second later the card swaps to "Feed the furnace for Bram" and `verbs/smelt.ts` opens. There is no "done" moment. | `useGame.ts`: `setTimeout(() => act({ kind: 'solve', … }), 1200)` |
| 6 | Task 2 needs `import { dig } from "./dig"`, `import { put } from "inherit"`, `const ore = dig()` and `put("furnace", ore)`. That is two modules, a variable and a two-argument call with a magic string. (screenshot 02) | `onboarding.ts` lesson `smelt` |
| 7 | Wire-up card: "You named these verbs. Call them from onTick() and deploy…". It needs imports from `./verbs/smelt` and `./verbs/ship`, plus `export function onTick()`. (screenshot 06) | `onboarding.ts` `wiring()` |
| 8 | About 2.5 seconds after Deploy, the floor appears with 2/3 ingots already delivered. About 10 seconds after Deploy, Bram is done, coins and debt appear, Town, Inbox (2) and Orders appear, Mrs Harrow's card replaces Bram's, and a town-change banner covers the floor. (screenshot 07) | `TICK_MS = 250` (`sim/index.ts`), the mine every 4 ticks (`primitives.ts`), and `getSurface` derives sections from state with no pacing |
| 9 | Elsie's whole request finishes within about 5 seconds of her wire-up deploy. | Same pacing |
| 10 | Mixed vein: one check is already green ("1 done") before the player writes anything. The live furnace jams while the player is still in a bench task. The task adds `look`, `.ready`, `if/else`, a string comparison and a not-yet-bought `"copper"` place, all at once. (screenshot 08) | `onboarding.ts` lesson `sort`; `primitives.ts` turns on copper ore at beat 4 |

No console errors. The live build is stable. The problems are about design, not crashes.

### Owner's notes mapped to root causes

| Owner note | Root cause |
|---|---|
| 1. Import line missing from the starter | The stub omits imports by design; the import appears only as a "brick" in the card |
| 2. Full-width IDE, no game world | ADR 0011 forbids the floor until the first real dig; the bench is invisible |
| 3. The next task opened by itself | The 1.2 s auto-solve timer in `useGame.ts`; there is no solved state in the sim |
| 4. Task 2 too hard | A file per verb, cross-file imports, `return`, a variable and two-argument `put`, all by minute 2 |
| 5. Guessing the place string | `place: string`, no union type and no runtime message |
| 6. "inherit", `onTick`, "verbs" | Jargon in the card text; the loop is not motivated; "verb" is an internal glossary term shown to players |
| 7. Deploy small, lone `Code` tab, no game | Footer button is 23 px tall; the nav starts with one meaningless tab; the world appears late and then all at once |

---

## A. Is the core loop a sound foundation?

**Yes for the world model, no for the teaching sequence built on top of it.**

What the successful games have in common:

| Game | What the player controls | How visible execution is | What makes it fun | What makes it learnable |
|---|---|---|---|---|
| Human Resource Machine | ~11 commands; one worker carries one box | Every command animated; step, pause, speed | Small puzzles with a clear spec; optional size and speed challenges | Closed vocabulary; failure shows the exact wrong box |
| 7 Billion Humans | The same, many workers in parallel | Same | Emergent chaos, then order | Same, plus spatial intuition |
| Zachtronics (TIS-100, Shenzhen I/O, Opus Magnum) | Tiny assembly or mechanisms under hard limits | Step-through, with test inputs and outputs shown | Optimisation histograms after solving; story told through coworkers' emails | Concrete spec per puzzle; you see exactly which output was wrong |
| Screeps | Real JS; `loop()` runs every tick in a persistent world | Live world; logs | Your code runs while you are away; it scales | Poor for beginners: steep, the tutorial is separate from play |
| Bitburner | Real JS scripts in an incremental game | Terminal and logs | Numbers going up; scripts multiply your power | **You do the action by hand first, then write a script that loops it** |
| CodeCombat | Real JS or Python calls on a hero | Each line animates the hero; the current line is highlighted | Short levels, items, a hero | One concept per level; partial starter code; a method palette |
| Factorio | No code; machines and belts | Everything visible | Throughput, bottlenecks, scaling | **Mine by hand first, then automate the chore** |

Three patterns carry most of the weight:

1. **Do it by hand, then automate it** (Factorio, Bitburner). Automation feels like power only after the chore has been felt.
2. **Every call is visible** (Human Resource Machine, CodeCombat, Zachtronics). A beginner needs to see line 2 cause action 2.
3. **A tiny closed vocabulary with visible names** (Human Resource Machine). The things you can name are on the screen.

How Inherit compares:

- **Keep.** Three physical primitives on named places. No black boxes. Functions the player names himself. A persistent factory that pays only for requests. These match patterns 3 and 1, and they give Inherit a long game that Human Resource Machine lacks (Screeps' persistence, at beginner scale).
- **Change.** (a) `onTick` comes first, so the player never does the chore by hand and never sees one call at a time. (b) A file per verb plus imports turns task 1 into a lesson about modules. (c) The bench is headless, so learning happens off-screen. (d) The loop runs at 4 ticks per second and finishes requests before the player has looked at the floor.
- **One API simplification:** make `put` take one argument and act on the arm's hand: `put("furnace")` puts whatever the arm holds. That is Human Resource Machine's one-box rule, and the hand is visible on the floor. It removes the variable and the two-argument call from minute 2. Variables then arrive when they are actually needed, to decide something (`const rock = take("mine"); if (rock === "copper-ore") …`). `take` still returns the item name. This needs a new ADR that supersedes the `put(place, item)` line of ADR 0013.

## B. Continuous, step-by-step, or hybrid?

**Hybrid. Watched runs teach; Deploy automates.**

- **Run (watched):** runs the player's `main.ts` once, on the real floor. The worker records each primitive call, with its file, line, arguments and result. The UI plays them back at about 2 calls per second, highlights the line in Monaco and animates Uncle's arm. Nothing is lost because a failed `put` already returns the item (ADR 0013). This replaces the invisible bench for the early tasks.
- **Deploy (live):** after the loop lesson, Deploy hands `onTick` to the factory clock, Screeps style. Run stays available as "Run once" in the split menu for debugging.
- **Chapter 1 pace:** slow the live pace so a three-ingot job takes about 30–45 seconds of visible flow, not 4–10. A slower mine, or a slower `TICK_MS` in chapter 1 only, both work. The point is that the player watches his loop work. That respects the no-pressure rule (ADR 0008): slow here means calm, not waiting.

### The first 10 minutes, step by step

Layout from second 0: top nav with **Shed** only; the floor on the left (always); the editor on the right; a thin footer with one big primary button. The request card is a speech bubble from the townsperson on the floor plus a short task card above the editor, two to three lines, never the full solution.

| Time | Story beat | On the left (world) | On the right (code) | New concept | Ends with |
|---|---|---|---|---|---|
| 0:00 | Bram knocks: "Your uncle's arm still works? Show me." | A dusty shed: mine, furnace, cart and Uncle's arm, asleep. Each machine has a label in code font: `"mine"`, `"furnace"`, `"cart"`. Bram stands in the doorway. | `main.ts`: Uncle's two-line note and `import { take, put } from "inherit"` already written by Uncle ("my arm can take and put"). The cursor sits on an empty line. | — | — |
| 0:30 | "Pick up a rock." | When the player types `take("`, autocomplete lists `mine`, `furnace`, `cart`, and hovering a suggestion lights up that machine. | `take("mine")` | **Call with a string** | Press **Run**: the arm swings to the mine and lifts a rock. Solved card: "You called `take` with the place `"mine"`." **Continue** |
| 1:30 | "Now feed the furnace." | The arm holds the rock; the hand is visible. | Add `put("furnace")` below. | **Sequence** (order matters) | Run: line 1 lights up and the arm takes; line 2 lights up and the arm puts. The furnace glows. Solved → Continue |
| 3:00 | "Bring the ingot to my cart." | The ingot sits in the furnace. | `take("furnace")`, `put("cart")`. On the first Run the furnace may not be ready: the arm reaches in, gets nothing, and a "not ready yet" bubble appears. Running again works. | Order and timing; `take` can return nothing | Cart 1/3. Solved → Continue |
| 4:30 | "That's a lot of lines. Uncle called this *smelting*." | The same. | Wrap the first two lines in `function smelt() { … }`, call `smelt()`, and do the same for `ship()` without the exact lines. **My library** shows `smelt()` and `ship()`. | **Function** = a name for steps you wrote | Run: a `smelt()` badge floats over the arm while its lines run. Solved → Continue |
| 6:30 | Bram: "Three ingots… are you going to press Run all day?" The player has just pressed Run 4–6 times. | A clock on the shed wall, stopped. | `export function onTick() { smelt(); ship() }`. One sentence: "The clock calls `onTick` every tick. `export` lets the clock see it." The footer button becomes **Deploy**. | **The tick loop** | Deploy: the clock starts, the arm loops on its own, the cart fills 2/3 → 3/3 at a watchable pace. Bram pays **+64 coins** and coins appear in the nav. Solved card: "You automated your first job." **Continue** |
| 8:30 | The forge lights up. | **Town** appears in the nav, one reveal, opened by Continue: the forge lights and Bram's horse trots out. | — | — | Continue |
| 9:30 | Mrs Harrow's letter. | **Inbox** appears with one letter; the debt appears next to the coins. | — | — | "Pay later" → Elsie knocks |

Each reveal comes only after a Continue, one per beat, never in a burst.

## C. Introducing concepts: order, one per step, and how each is visualised

One concept per task, then one or two practice tasks that reuse it without showing the exact lines. The first hint rung says the idea in words; only the second rung shows code.

| # | Concept | Task (story) | How the world shows it |
|---|---|---|---|
| 1 | Call with a string argument | `take("mine")` (Bram) | Code-font labels on machines match the strings exactly; hovering a string in the editor lights up the machine; autocomplete from a typed union; unknown place → "There is no place called "mines". Places: mine, furnace, cart." |
| 2 | Sequence | `take` then `put` | Line highlight in step with the arm animation during a watched run |
| 3 | Function | `smelt()`, `ship()` | A badge with the function name over the arm while its body runs; a My library entry |
| 4 | Tick loop (`export function onTick`) | Bram's three ingots | A clock on the wall; a tick counter pulse; the button relabels from Run to Deploy |
| 5 | Return value and variable | Mixed vein: `const rock = take("mine")` | The item tag in the arm's hand; inline value badges next to the line during watched runs (`rock = "copper-ore"`) |
| 6 | `if` / comparison | Sort ores into two furnaces | The taken branch lights up and the other dims; the jam is a visible consequence |
| 7 | Object property | `look("cart").wanted` | Clicking a machine shows exactly what `look(place)` returns, in the same shape |
| 8 | Parameters | `move(from, to)` refactor (Wen) | Arguments shown in the function badge: `move("press","cart")` |
| 9 | Loop over an array | `fixBroken()` over furnaces | The arm visits each furnace in turn |
| 10 | Modules: import/export across files | The Mayor: "your toolbox is getting big, move it to `tools.ts`" | The file tree appears in this beat for the first time |

Imports of primitives are written by Uncle in the starter. When `look` unlocks, the card says "add `look` to Uncle's import line", a one-word edit that teaches import syntax gently. Player-to-player imports wait until concept 10. Remove "verb" from all player-facing text; say "function" (the glossary can keep Verb internally).

## D. Task design: a game, not exercises

- **Stakes you can see before coding.** The problem is on the floor or in town first: Bram's horse limps on the street, Elsie's oven is cold, Lamp Street is dark. The card says what is wrong, not which lines to type.
- **Checks describe the world, not the code.** "A rock reaches the furnace", not "Return the rock taken from the mine" or "iron-ore reaches furnace from mine". Use display names ("iron ore"), not ids.
- **Visible result, then reward, in this order:** the item travels to the cart → the cart leaves for town → the counter ticks → the person reacts (speech bubble) → coins (+N) → the town change. Coins only come from requests (keep ADR 0013).
- **An explicit solved state.** The card turns into "Done": one sentence on what you did, one sentence on the concept you used, the reward, and **Continue**. Nothing advances, opens or unlocks before Continue.
- **Less blunt tasks.** After a concept's first task, give the goal and the places, not the lines. Practice tasks have no exact rung by default. "Show me the lines" is an explicit third rung.
- **Chained like product work.** Every new request changes existing code: a new requirement (plates instead of ingots → change `ship`), a bug report from a townsperson ("my plates were copper!" → sort), a refactor when repetition hurts (`move`). The library grows; nothing resets.
- **Optional mastery, no pressure.** After a request: "Your `onTick` uses 6 calls. Uncle's used 4." No timer, no penalty. This is Zachtronics' histogram, gentle.

## E. UI frame

**Keep:** the top nav, the thin footer with the primary button on the right, the charcoal palette with the amber accent (ADR 0006), the menus, Monaco with the workshop theme, the editor beside the game area with Swap sides and the resizer, Checks/Console under the editor, and the section "new" marks.

**Broken now:**

| Problem | Fix |
|---|---|
| Code-only first screen; the lone `Code` tab | The floor is always on the left; the nav starts with **Shed** (the floor). Code is not a section, it is always on the right. This supersedes the "first launch: only the code editor" rule of ADR 0011. |
| The footer button is 23 px tall | Keep the footer thin but make the button the footer's full height, with the label and its shortcut (`Ctrl+Enter`). |
| Deploy is enabled when it cannot work, and relabels to "Run" after an error | One primary button whose label follows the lesson: **Run** before the loop, **Deploy** after. Never relabel on error; show the error in Checks in plain words. |
| The request card takes up to a third of the editor column, and the hint dumps the full solution | A speech bubble on the floor for the story; a two-to-three-line task card above the editor; exact lines only on the third rung. |
| A burst of reveals and an overlay banner on the floor | One reveal per Continue; the celebration lives in the solved card, not on top of the floor. |
| The floor is a large empty grid with tiny machines | Zoom to the occupied plot at start; grow the camera as machines are bought. |
| A wrong place fails silently | A runtime message in Checks and Console: "There is no place called …" |

**What the left area shows before the factory exists:** the factory always exists. Uncle's shed has the mine, furnace, cart and arm, asleep, with code-font labels and Bram in the doorway. Every task has a visual because every task runs on this floor (watched runs). Later bench tasks (refactors) show the bench as a small staged scene in the same area, not headless.

## F. Architecture risks that block this direction

1. **The step state machine is split across three layers.** Lesson content is in the sim (`packages/sim/src/onboarding.ts`). Progression is a 1200 ms timer in the web store (`apps/web/app/lib/useGame.ts`, `nextLesson`). Validation is a module-level `checked` variable in the worker (`runner.worker.ts`, `case 'solve'`). Progress is only `town.solved[]` plus `beat`. There is no "solved, waiting for Continue" state. **Fix:** a pure sim state machine `step = { id, phase: 'brief' | 'working' | 'solved' }` with `continueStep(c)`, unit-tested; the UI only renders it. This is required by AGENTS.md ("keep game rules and goal evaluation in packages/sim") and currently violated in spirit.
2. **Lessons are generated strings, not data.** `verb()` derives the instruction from an id ternary and the bricks from `body.find(line => line.includes('('))`. Adding the concept, the visual cue, the solved text and the hint rungs per step means restructuring the lessons into plain data records.
3. **Section reveals are derived, not sequenced.** `getSurface` (`research.ts`) unlocks a section as soon as a state condition holds (`beat > 1`, extracted ore, any town change…), so several fire on the same tick. **Fix:** a reveal queue in the sim, released one item per Continue. `seenSections` already exists for the "new" marks.
4. **There is no per-call trace for watched runs.** `primitiveTick` runs all calls synchronously inside one tick. `world.hops` records from/to/item in call order but not the source line or arguments, and failed calls (an empty `take`, a rejected `put`, an unknown place) leave no hop at all. `commandSites` records lines per machine, not per call. **Fix:** record an ordered `calls[]` (file, line, fn, args, result) in the sandbox bridge and send it in the Frame; play it back in `FactoryFloor` and the editor. This is moderate work and the main new capability.
5. **Place names are untyped.** `declarations.ts` declares `place: string`, and the declarations only refresh on beat or lesson change (the `useGame.ts` watch). **Fix:** generate `type Place = "mine" | "furnace" | "cart" | …` from `world.machines` and refresh when the machine list changes (purchases via `buy`). Add a runtime "unknown place" error in `primitives.ts`.
6. **Pacing is a global constant tied to tests.** `TICK_MS = 250` and the mine every 4 ticks. The reference playthrough asserts "about 60 game minutes". Slowing chapter 1 means retuning the reference and the paces.
7. **The bench is invisible by construction.** `bench.ts` builds a throwaway Campaign, and the Frame carries only `bench.checks`, not the bench world. Showing it (for refactor tasks) means sending the bench world to the renderer.
8. **Legacy weight.** About 2,700 lines of the v2 engine (`objectives.ts` 933 lines, `levels.ts`, `quests.ts`, the `RESEARCH` tree, freight and orders) plus unused Vue panels (`TestsPanel`, `MetricsPanel`, `DriversPanel`, `SnapshotsPanel`), the `ctx` legacy path in the sandbox (`createLegacyProgram`), and `docs/campaign-game.md`, which still describes the old engine. Every change and every agent pays for this.
9. **`app.vue` (584 lines) and `useGame.ts` (423 lines) are catch-alls**: layout, menus, celebrations, letters, section logic, worker protocol, persistence and lesson progression. The new Continue flow must not land there. Keep it in the sim (risk 1), with a thin component.
10. **Tests prove the path, not understanding.** The browser test types the exact hint lines; nothing asserts beginner-visible properties (the floor is visible at t=0, no auto-advance, one reveal per Continue, no error on the first screen). There is no CI workflow in the repo (no `.github/workflows`), so the AGENTS.md checks run only when someone runs them.
11. **Save migration.** Restructured lesson ids break `town.solved`. Use the ADR 0004 pattern (restart chapter 1, keep the code as a snapshot). Low risk.

## G. Plan

Order matters. Each step is independently shippable and playtestable.

### First: a playable, understandable first 15 minutes

0. **ADR 0014 "Watched runs, then the loop".** It names what it replaces: the first-launch code-only screen of ADR 0011, the `put(place, item)` signature and file-per-verb-from-task-1 of ADR 0013, and the bench-driven auto-advance. Update `CONTEXT.md` (Run vs Deploy, Hand, Solved card; drop "verb" from player text).
1. **The floor is always visible.** Remove `code-only`; the nav starts with Shed; the camera zooms to the three machines and the arm; code-font labels; hovering a string lights up the machine.
2. **Typed places.** A literal union from `world.machines`, autocomplete inside `take("`, and a runtime error for unknown places.
3. **The step state machine in the sim**, with brief → working → solved → Continue, plus the solved card. Delete the 1200 ms auto-solve. Reveals are queued and released one per Continue.
4. **Watched Run.** An ordered call trace from the sandbox, playback on the floor plus line highlight, and the "not ready yet" bubble. One primary footer button: Run → Deploy.
5. **Rewrite Bram** to the C-order: call → sequence → function → loop, everything in `main.ts`, the primitives import written by Uncle, and one-argument `put` with the visible hand.
6. **Chapter 1 pacing** that is watchable after Deploy; retune the reference playthrough.
7. **Beginner-visible browser assertions**, plus a screenshot capture per step for the owner's next playtest. Then a think-aloud playtest with 3–5 juniors. Pass condition: each can say what every line in their `onTick` does.

### Then: the hour

8. Elsie: write `stamp()` from the goal alone; `buy("press")` at the top level of `main.ts`, which teaches "top level runs once on Deploy, `onTick` runs every tick" instead of buying every tick.
9. Mixed vein as a bug report: variable plus `if`, with inline value badges; the jam stays visible but only after the player has been told about it.
10. Tomas (practice), breakdowns (loop over an array), Wen (`move` with parameters as the refactor), competing orders (`look("cart").wanted` with the machine inspector showing `look` output).
11. The Mayor: move the library into files (import/export); the file tree appears in this beat.
12. Optional "Uncle's line count" mastery note after each request.
13. Delete the v2 engine, the unused panels, the `ctx` path and the stale `docs/campaign-game.md`, once the new chapter is on main.

---

## Friction (this audit)

1. **What took long.** Getting a runnable toolchain took about 5 minutes. The VM had Node 22 and no `node_modules`; the repo has no `.nvmrc` or `engines` pin, so Node 24 came from `nvm install 24`. Corepack then blocked the unattended check run on an interactive "download pnpm? [Y/n]" prompt until it was answered by hand. Walking the live site took about 5 minutes of wall-clock time because every step needs real-time waits: there is no way to jump to a lesson or speed up ticks. `gh issue view 32 --comments` printed only the comments, not the spec body, so it had to be rerun with `--json`. The full AGENTS.md check list took 4 min 48 s, of which the browser test that types the whole chapter took 1.8 min. All checks passed: 102 unit tests, typecheck, lint, build and 17 browser tests. About 5 more minutes were lost to a wait on the check log that slept its full timeout instead of returning when the run finished. That was a misuse of the agent's own tooling, not a repo problem.
2. **Hacks.** Playwright was installed in a scratch directory outside the repo to drive the live site, because repo dependencies were not installed yet. Text was inserted into Monaco with `keyboard.insertText`, which triggers auto-indent and produced staircase indentation (screenshot 06 shows it), so later runs stripped leading whitespace first. The scripts read state by scraping `.request` and `#panel-Checks` text, because there are no `data-testid` hooks, and relied on fixed sleeps.
3. **Broken or misleading.** There is no `.github/workflows`, so the AGENTS.md checks never run in CI. `docs/campaign-game.md` still documents the old engine (`dig/work`, research, "every objective stamp pays coins"). `CONTEXT.md` says the world exposes three primitives, but `getSurface` exports `put` only after `dig` and `look` only from beat 4. PR #44 cites screenshots at `/tmp/inherit-onboard/` "on de2", a path no one else can open. ADR 0011's first-launch rule is the direct source of owner note 2. About 2,700 lines of dead v2 code and four unused Vue panels make the code harder to read.
4. **What would make this 2× faster.** (a) A `.nvmrc` with 24 plus an environment with dependencies preinstalled and `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`. (b) A dev-only URL hook (`?step=wire-1&speed=8`) to jump to a lesson and speed up ticks. (c) `data-testid`s on the request card, checks, the primary button and the nav. (d) A documented `pnpm shots --url <site>` that reuses the existing `INHERIT_SHOTS` e2e capture against any URL. (e) A CI workflow that runs the AGENTS.md checks. (f) Deleting the legacy docs and code.
