# Game packs on one framework

## Problem

Nick played v4 as a beginner. His eight notes follow verbatim.

1. The switch from a plain function to `onTick` did not register at all.
2. The Run/Deploy button in the bottom footer looks awful. It must be a wide, big primary button at the TOP RIGHT of the top nav, like the frame before PR #44 (see commit 3058dbe, `git show 3058dbe:apps/web/app/app.vue`).
3. Coins and debt meant nothing to him.
4. Inbox and Orders in the top nav are awkward and unclear. Do not show a nav section until it has content.
5. The town/village is unclear at the start.
6. The arm/furnace automation is too hard for a beginner.
7. The task text at the top does not connect to the code. Keep only a SHORT GOAL on top (one line). Put the explanations INSIDE the code, as comments right next to the line(s) the player writes.
8. Product pivot: not one endless game but GAME PACKS.

## Solution

Open on the showcase. “Start here” leads to **Village at Dawn**, a Beginner pack about waking a village with plain TypeScript. **Uncle’s Workshop**, level Game, carries the existing chapter and the label “After the basics”. A cover, tagline, level, genre, “You will learn” list and minutes tell the player what each asks of them. Both can be in progress. Each ends with a view of what the player made, the ideas they used and a way back to the showcase.

ADR 0018 and this spec govern v5 where earlier chapter decisions differ.

## User stories

- On my first visit I can pick a 30–45 minute pack and immediately see the villager my first line will affect.
- When I put a word in quotes and press Run, the word appears above the villager as my line lights up. I can try a different word and see the difference.
- When I get stuck I can read the comment at my cursor, hover the function or ask for one more hint. A typo points me back to the line to fix.
- When my lamps light I can watch each one, read what I learned and decide when to continue. My lamps are still there at the fair.
- I can leave a half-written lesson, work on Bram’s cart and come back to my draft and village. Returning from v4, I can resume the same job in the shed.
- After pressing Run by hand for Bram, I can see which calls I move into the clock, why the button changes and which work repeats. Letters and orders first appear with something to read or fill.
- As an author with a topic and a learning goal, I can add one folder, draw its world and prove every lesson plays through without editing the frame, sandbox, picker or test roster.

## Pack contract

Keep rules and check evaluation in `packages/sim`. Put all files for a pack under `packages/sim/src/packs/<id>/`. Use stable folder ids `beginner` and `workshop`. A pack can own subfolders.

| File | Responsibility |
| --- | --- |
| `manifest.ts`, `cover.webp` | Plain metadata and a local cover asset. The showcase reads only these. |
| `pack.ts` | Default export from `definePack`. Compose the world schema, initial state, operations, lessons, section projections and any clock or save upgrades here. |
| `player.ts` | Export a TypeScript interface named `PlayerAPI` with documented method signatures, and any pack-local supporting types. Type-only source. |
| `lessons.ts` | Ordered lessons with starter builders and reference projects. Large chapters may split these by story beat. |
| `WorldView.vue`, `art/` | Pack renderer and local art. The renderer may import shared drawing parts. |
| `*.test.ts` | Pack-specific rule or art tests where the common suite needs more examples. |

Put the registry in `packages/sim/src/packs/registry.ts`. Use literal build-time globs over sibling folders. Expose a manifest entry point (`./*/manifest.ts` and cover URLs) and a separate worker entry point (eager `./*/pack.ts` and raw `./*/player.ts`). Key both by directory id. Resolve the lazy Vue glob for `*/WorldView.vue` only in the web build, keyed by that same id. Keep the worker entry free of Vue and assets and retain the single worker chunk enforced by `apps/web/nuxt.config.ts`. Vitest uses the worker registry. Playwright enumerates the same directories in Node and imports their plain reference data. Assert identical id sets for manifests, rules, API source, covers and views. No hand-maintained list or switch over pack ids. The showcase sorts by level then title. A manifest can mark the featured card.

Put the common types and lesson state machine under `packages/sim/src/framework/`. The following are the author-facing interfaces. `Files` uses the existing relative project paths. A starter receives the previous draft so a chapter can preserve the player's own functions. A fresh Beginner lesson supplies one small new page in the same `main.ts`.

```ts
type PackLevel = 'Beginner' | 'Basics' | 'Game' | 'Advanced'
type Files = Record<string, string>
type Mode = 'run' | 'deploy'

interface PackManifest {
  id: string
  title: string
  tagline: string
  level: PackLevel
  genre: string
  learningGoals: readonly string[]
  estimatedMinutes: { min: number; max: number }
  cover: string                  // file in this folder
  showcaseNote?: string          // “Start here” or “After the basics”
  featured?: boolean
}

interface Starter {
  files: Files
  edit: { file: string; line: number }   // one-based, blank or editable
}

interface Call {
  file: string
  line: number
  within?: string
  name: string
  args: readonly unknown[]
  result?: unknown
  ok: boolean
  message?: string
}

interface Evidence<W> {
  before: Readonly<W>            // at lesson entry
  world: Readonly<W>
  calls: readonly Call[]         // current attempt, in order
  console: readonly string[]
  files: Readonly<Files>
}

interface Check<W> {
  id: string
  label: string
  evaluate(e: Evidence<W>): { status: 'red' | 'amber' | 'green'; progress?: string }
}

interface Lesson<W> {
  id: string
  goal: string
  idea: string
  mode: Mode
  starter(previous: Readonly<Files>): Starter
  hints?: readonly [string, ...string[]]
  checks: readonly Check<W>[]
  referenceSolution: Files       // complete playable project, including helpers
  visibleEffect: { description: string; testId: string; text: string }
  solved: { reaction: string; did: string; idea: string }
  reveals?: readonly string[]    // stable ids, released in order
  enter?(world: W): void         // stage weather, a broken furnace, etc. once
}
```

A pack's world is serializable data. Keep its schema and decode function together. For example, the Beginner world records the villager’s bubble, flower beds, sign, flag, two tree counts, basket, weather, lamps, guests and stalls. Workshop owns its floor, hand, town, letters, stock, orders, balances and debt. Even a balance of zero can be meaningful content once revealed. The framework never provisions a wallet.

```ts
interface Row {
  id: string
  label: string
  value: string
  action?: { name: string; args: readonly unknown[] }
}
interface Attempt<A> {
  api: A
  finish(): void
}
interface Entity<W> {
  id: string
  label: string
  rows(world: Readonly<W>): readonly Row[]
}
interface Panel<W> {
  id: string
  title: string
  placement: 'nav' | 'panel'
  reveal?: string
  rows(world: Readonly<W>): readonly Row[]
}
interface Pack<W, A> {
  manifest: PackManifest
  version: number
  initialWorld(seed: number): W
  decodeWorld(input: unknown): W
  entities: readonly Entity<W>[]
  panels: readonly Panel<W>[]
  lessons: readonly Lesson<W>[]
  exposure: 'globals' | 'module'
  retry: 'entry' | 'live'
  beginAttempt(world: W, mode: 'run' | 'setup' | 'tick' | 'idle'): Attempt<A>
  actions?: Record<string, (world: W, args: readonly unknown[]) => void>
  guestModules?: Readonly<Record<string, { source: string; declarations: string }>>
  available(world: Readonly<W>, lessonId: string): readonly (keyof A & string)[]
  typeAliases?(world: Readonly<W>): Readonly<Record<string, readonly string[]>>
  clock?: { intervalMs: number; handler: 'onTick' }
  release?(world: W, revealId: string): void
  upgrade?(fromVersion: number, input: unknown): unknown
}
```

`definePack<W, PlayerAPI>` checks the operation implementations against the pack's actual TypeScript signatures. For example, Beginner declares `/** Give the villager a speech bubble. */ say(words: string): void` and implements `say(words) { world.bubble = words }`. The worker owns that world. Pack functions validate argument shapes, bounds and names at the host boundary. A pack needing module imports declares `exposure: 'module'`. An optional clock calls the player's exported `onTick()`; it starts only in a Deploy lesson. Beginner's attempt simply binds its functions to the current world and has an empty finish. Workshop opens its existing `primitiveTick` frame, returns the frame's API and finishes production and settlement once at the end of the attempt. `idle` advances an active Workshop floor without a deployed handler. The clock interval affects simulation and playback only.

Entity rows feed the generic read-only inspector. A panel can project rows from several entities and attach a named action such as reading one letter. Expose the panel when its reveal has been released (or none is required) **and** projected rows are nonempty. Dispatch only actions declared by this pack. Validate their arguments in the worker.

**One API for the editor and the guest.** Use the TypeScript parser on the pack’s `player.ts` to read method names, overloads, parameters, results, local type declarations and one-line JSDoc. Filter by `available`. Substitute pack-supplied literal aliases (e.g. `Place` from the machines now on the floor). Generate ambient functions for Beginner, or named exports in `declare module "inherit"` for Workshop, including the cart-specific `look` overload. The declarations and API reference use the same entries. Send the generated declarations in the worker frame when the available surface changes. Purchases can change it mid-lesson. Replace the previous `typescriptDefaults.addExtraLib` registration in `CodeEditor.vue`. Scope model URIs by pack and dispose old models, diagnostics and libraries on switch. An unopened pack contributes zero global names.

Keep `packages/sandbox/src/project.ts` compilation, relative file resolution and source maps, and the bounded QuickJS runtime in `runtime.ts`. Pass the resolved public methods and exposure to the guest installer in `guest.ts`. Install frozen wrappers on the guest global or in the synthetic `inherit` module before evaluating the entry. Remove the fixed five-name list. Each wrapper marshals bounded data, calls only a registered host operation, records the original source site and returns a copied result (including `undefined`). The module resolver accepts only project-relative files, the active synthetic API and optional pack-bundled guest modules. A bundled module has a static name, guest source and matching declarations. It executes inside QuickJS with the same limits. Neither shipped pack needs a third-party guest module. Keep project, CPU, stack, memory and transfer limits. Player code runs only in QuickJS. Run evaluates the entry once. Deploy evaluates setup once, then ticks the installed handler. Workshop’s Run once and resume use the deployed clock state without repeating purchases. Unknown functions, misspellings and missing quotes get short errors at the source line, e.g. “I don’t know ‘plnat’. Did you mean ‘plant’?” and “Close the word with a quote.”

**Run and render.** Replace the campaign-specific wire format in `gameProtocol.ts` with pack id, session generation, action sequence, world, call log, check views, lesson phase, visible panel rows and editor declarations. Serialize worker actions in order. A watched Run returns its initial world, the ordered calls with a world snapshot after each, and the settled final world. Pass only the displayed snapshot and call-log prefix to `WorldView.vue`; advance those together with the original file/line in Monaco at about two calls per second. Show final settlement and the solved card after playback. Drawers and inspectors may send a named pack action to the worker. Dispatch it through a pack-owned table of typed handlers, using the same world transitions as player calls. A renderer can select and inspect, but cannot mutate progress or replay game rules. For a live clock send the current snapshot and bounded tick trace. Preserve routine machine feedback from ADR 0017.

Use the same props for both pack views:

```ts
interface WorldViewProps<W> {
  world: Readonly<W>             // snapshot at the current playback position
  calls: readonly Call[]         // only calls that have played so far
}
```

The view gives each lesson's visible result an accessible label and a stable test id. For example, the fifth lamp's marker changes from “Lamp 5 unlit” to “Lamp 5 lit” as it lights. Its lesson declares `{ description: 'All five path lamps glow', testId: 'lamp-5', text: 'Lamp 5 lit' }`. The browser suite resolves the marker inside the visible world and checks its text or accessible name. The sim still checks all five calls. For a player-chosen name, describe the observable state (“Sign painted”) on the sign and draw the actual name there. Keep call history and playback snapshots bounded by the runner's per-attempt limits. For a live clock retain the current tick trace and latched check results.

**Checks and progression.** Start in `brief`, mark `working` on the first attempt, evaluate the declared pure functions in the sim after a Run or live tick. For live feedback evaluate against the matching call prefix and world. Latch earned check ids within an attempt across ticks (needed for the two ore routes). A fresh deployment resets attempt evidence. Carry the previous lesson’s world into the next lesson and take its entry checkpoint after `enter`. Beginner retries start from that checkpoint, so changing three flowers to four plants four in that bed. Workshop retries use the live floor, including a furnace still heating. Use a pack setting `retry: 'entry' | 'live'` for this choice. Commit a successful Run or tick once. On a failed deploy discard tentative setup and preserve the last good project and world. A failed Beginner Run keeps the entry checkpoint for retry. On the live Workshop floor preserve and settle calls completed before a Run or tick error, as v4 does. Show the error at its source line and leave the lesson unsolved.

All checks green after a successful attempt sets `solved`. Only Continue releases a queued reveal, records it and applies its pack effect (e.g. delivering a letter). Stay on the solved card while the queue has more entries. After the last release, Continue can also open the next lesson. Invoke its starter once. Finishing the last lesson marks the pack complete. Saving a solved card or switching mid-reveal must never deliver a second letter or advance twice.

## Village at Dawn

Level Beginner · village decorating · 30–45 minutes. You will learn calls, variables, expressions, functions, choices and loops. At first light the house, two trees, path and a waving villager are already visible. Every lesson edits `main.ts`. Pack functions are global, with one-line hover descriptions. Show functions as needed. No imports, exports, nested calls, factory machines, money or clock. Village state accumulates across lessons. Each listing below is the compilable starter. A blank after a comment is an insertion point. Retain the comment when the player edits a supplied line.

### 1. `hello` — Say hello to the villager

A call can give a function a string. The first solution is literally `say("Hello!")`.

```ts
// say gives the villager words to speak. Put "Hello!" between its parentheses.
```

Check “The villager says hello” when the run calls `say` and the bubble reads “Hello!”. The villager waves and the words appear above the house. Other words get their own bubble too.

### 2. `flowers` — Plant three flowers by the gate

A number says how many. The final hint is `plant(3)`.

```ts
// plant takes a number without quotes. Ask for three flowers here.
```

Check “Three flowers at the gate” for three new flowers in the gate bed. Show each bloom and the villager bending to smell one.

### 3. `house-sign` — Put your name on the house sign

A variable holds a value that a call can use. The player may choose any nonempty name.

```ts
let nameOnSign = "Mira"
// paintSign writes on the house. Give it nameOnSign to use the name above.
```

Check “Your name is on the sign” for the painted name and the variable used as the call argument. The wooden sign takes the player's lettering. Hints end with `paintSign(nameOnSign)`.

### 4. `flag` — Change the welcome flag from blue to gold

Reassign a `let` binding. A `const` binding keeps its value.

```ts
const firstColour = "blue"
let flag = firstColour
// let lets you change flag. Give it the new value "gold" before hanging it.
hangFlag(flag)
```

Check “A gold flag hangs by the sign” for a reassignment followed by the gold flag call. The starter hangs blue. The edit `flag = "gold"` hangs gold.

### 5. `apple-basket` — Gather the apples from both trees into the basket

An expression adds two amounts. The trees show two and three apples.

```ts
const leftTree = 2
const rightTree = 3
// Add the apples on the right to the apples on the left.
const total = leftTree
fillBasket(total)
```

Check “All five apples are in the basket” for a sum of both counts and a basket holding five. Move the apples from their branches to the basket.

### 6. `morning` — Ring the bell and open the shutters together

A function gives a group of calls one name.

```ts
function morning() {
  // ringBell() rings the bell. Add it here before the shutters open.
  openShutters()
}
// Call morning here to do both jobs in order.
```

Check “The bell rings and the shutters open” for both calls in order within the same invocation of `morning`. The bell swings, then the shutters stay open.

### 7. `flower-row` — Plant a row of four flowers along the house

A typed parameter names the number supplied by the caller.

```ts
function plantRow(count: number) {
  // count is the number given to plantRow. Pass it to plant here.
}
plantRow(4)
```

Check “Four flowers grow along the house” for `plant(count)` called inside the helper with four. The new bed fills alongside the house. The gate bed remains. Lesson entry selects the new bed.

### 8. `ribbons` — Hang two ribbons for each of three windows

A function can return a calculated number. Store it before using it.

```ts
function ribbonsFor(windows: number) {
  // Each window needs two ribbons. Return the number for all the windows.
  return windows
}
const ribbons = ribbonsFor(3)
hangRibbons(ribbons)
```

Check “Six ribbons hang at the windows” for the changed return expression, a stored result and the actual six ribbons. Pairs of ribbons unfurl under the three windows. Final hint `return windows * 2`.

### 9. `weather` — Set out a shelter when it rains

A boolean read from the world chooses a branch. The first playable scene has rain.

```ts
const raining = isRaining()
// if runs the first block when raining is true. Call openCanopy() inside it.
if (raining) {
} else {
  foldCanopy()
}
```

Check “The canopy suits the weather” for reading the weather and opening the canopy on the wet path or folding it in sunshine. Exercise both worlds in validation. The canopy catches raindrops above the villager.

### 10. `picnic` — Set the picnic table when there are enough apples

A comparison turns a number into a yes or no.

```ts
const apples = basketCount()
// Three apples feed the table. Change the condition to apples >= 3.
if (false) {
  setPicnic()
}
```

Check “There is a picnic when three can eat” for comparing the basket count and setting the table when it holds at least three. Test two, three and five. In the accumulated village a cloth and three plates appear beside the basket.

### 11. `path-lamps` — Light all five lamps along the path

A counted loop repeats a call with a different number each time.

```ts
// Start at lamp 1. Add one after each turn. Change the last lamp from 1 to 5.
for (let lamp = 1; lamp <= 1; lamp++) {
  lightLamp(lamp)
}
```

Check “Five path lamps are lit” with amber progress per new lamp. Check for five distinct successful calls from the loop in order, 1 through 5. Light each on its own playback frame and keep earlier lamps glowing.

### 12. `neighbours` — Greet all three neighbours on the path

An array keeps a list of names. A loop visits each name in turn.

```ts
const neighbours = ["Mira", "Pip", "Ada"]
for (const neighbour of neighbours) {
  // neighbour holds the next name in the list. Give it to greet here.
}
```

Check “All three neighbours are here” for one greeting per listed name in order from the loop. Each person steps onto the path and waves. All three stay for the fair.

### 13. `village-fair` — Open a stall for each neighbour and hang the welcome banner

Choose an action inside a reusable function. Put the earlier ideas together.

```ts
function welcome(guest: string) {
  openStall(guest)
  // Mira brings the banner. If guest is "Mira", call hangBanner() here.
}
const guests = ["Mira", "Pip", "Ada"]
// Visit the guests in a loop and call welcome with each name.
```

Check “Three stalls are open” for the three calls through the parameterized helper. Check “Mira hung the welcome banner” for one banner in Mira's turn and the conditional in the helper. Each stall opens in sequence, then the solved card shows the finished fair, its lamps, sign and decorations. Its idea line reads “You used one function to welcome each guest and chose when to hang the banner.”

Prefer world and call evidence. Where the learning goal is a language construct, inspect the TypeScript syntax tree and accept equivalent names and expressions. Pair that check with observed behavior. A comment containing the expected line or a hard-coded final count cannot satisfy the lesson. The extra weather and basket fixtures run the same unmodified reference against different inputs. A human reviews the teaching and legibility of each visible effect.

## Port Uncle’s Workshop

Start from the chapter on `bee64f0`: `packages/sim/src/lessons.ts`, `lesson-flow.ts`, `primitives.ts`, `game.ts`, `town.ts`, `town-view.ts`, `reference/chapter-one.ts` and the real sandbox playthrough. Keep all 33 stable lesson ids and their order, starting with `bram-take` and finishing with `harrow-deed`. Give even an inspection lesson an effect on the floor, such as a status appearing at the inspected furnace. Preserve v4's seed, cart timing, machine purchases, named helpers, modules at the Mayor, competing orders, six bridge brackets and the 600-coin debt. Reuse the floor, arm, street, portrait and town art inside the pack view. Coins come only from fulfilled requests and orders. No deadlines, automatic money or interest.

Port each lesson's checks from `observeLesson` into its record. Place one short goal over Monaco and put the explanation beside the edit in the player's current working file. The starter builder adds comments at the corresponding call, function body or import. Preserve custom names, spacing, extra files and unrelated edits. Use source locations or syntax nodes. If the insertion point is missing, append the comment at a safe top-level line and leave the draft intact. Do this once on entry. Reference solutions can be materialized from the existing growing projects in tests.

Bram teaches take, put, cart, smelt and ship by hand. At `bram-loop` leave both helper bodies and the two calls visible. Supply an empty exported clock function beneath them so the starter can deploy but cannot fill Bram’s cart through repeated calls. Mark the calls to move and place this comment immediately beside them:

```ts
// New idea: onTick. The workshop calls this function by itself, again and again.
// Move your calls inside it and press Deploy instead of Run.
```

The final hint shows the exported function with both calls inside. The button changes visibly from Run to **Deploy** on entering this lesson. Beside it show “Deploy starts the clock. It calls onTick for you.” Deploy starts the wall clock, and delivery takes about 30–45 seconds at normal speed. Keep Run once in the menu from here on. Preserve recovery and rollback, source-line inspection and the quiet floor status for routine misses.

Move letters, Orders, Town, coins and debt into Workshop declarations. Preserve the forge, letters and bank beats, one reveal per Continue. When giving the first letter, deliver it and expose its Inbox row as one reveal. Gate Orders on an actual offered job. Keep a released empty drawer out of the nav until a row exists. Pack panel actions keep “Pay later” and “Pay balance” working. To make the two bank lessons playable with a reference project too, expose `replyLater()` at `harrow-tab` and `payBalance()` at `harrow-deed`. Both call the same idempotent Workshop rules as the bank controls. Put their explanatory comments beside the setup edit. The first marks the letter answered and shows the reply in the bank book, the last settles the remaining balance if affordable and shows the deed. Keep earlier story actions available once introduced so a later deployment of the player's growing project still loads. Test both routes and already-paid saves. A completed bank beat never charges again.

## Frame

- The Inherit logo returns to the showcase. In a pack, the top bar has its name and switcher, populated pack sections, settings and palette, then a wide primary Run or Deploy button at the far right. Use the header action group in `3058dbe:apps/web/app/app.vue` as the placement reference. Keep the label and keyboard shortcut legible. While watching a Run, disable both click and shortcut and show “Playing your run”. An error leaves the mode label alone. At desktop size give the primary action at least 128 × 44 CSS pixels. Keep a 44-pixel hit target when space is tight. The thin footer shows status only.
- Game area left, editor right, resizer between them with a usable minimum on each side. On narrow screens stack the visible world above the IDE. The charcoal surfaces, warm accent and syntax colours follow ADRs 0006 and 0009. The opening village needs neither a map switch nor a tab just for the editor.
- A single-line goal and Hint sit over Monaco. Inside the editor the cursor starts by the explanatory comment. Reveal one hint per press, from the idea to the exact line or lines. Below, show compact Checks in red, amber and green with text as well as colour. Collapse a fully green list. Reveal Console, files, API reference and other tools only when a lesson uses them. Always show actionable errors even if Console is hidden.
- Show the solved card over the world. Keep Continue, the final world and pack switching available after playback. No auto-advance, timed goals, day counter or pressure. Expose speed controls only when a pack calls for them.
- Keep `data-testid` hooks for the primary button, goal/task card, world, checks, Hint, solved card, Continue and each nav section. Add pack cards and switcher hooks. Support `?pack=<id>&lesson=<id>&speed=<n>` in local/dev tests; build lesson entry from real reference checkpoints, bound the speed and use a separate preview slot. Normal showcase links can select a pack without a lesson override. Preserve the v4 local `?step=` Workshop alias during the port.

## Saves and switching

Use `inherit.pack.<id>` in localStorage, including separate keys for `beginner` and `workshop`. Keep the schema version in the value so an upgrade can find the previous slot. The showcase reads completion and current lesson from those slots. Palette is a site preference. Opening a pack never resets another. A pack can be in progress while another is open. Only the active session executes code. There is no offline ticking.

```ts
interface PackSave<W> {
  formatVersion: 1
  packId: string
  packVersion: number
  lessonId: string | null        // null after the final Continue
  phase: 'brief' | 'working' | 'solved'
  completed: string[]
  passed: string[]
  pendingReveals: string[]
  released: string[]
  seenSections: string[]
  world: W
  entryWorld: W
  project: {
    working: Files
    deployed: Files | null
    history: Revision[]
    snapshots: Revision[]
    nextRevision: number
    activeFile: string
  }
  clockActive: boolean
}
interface Revision { id: number; tick: number; name: string; files: Files }
```

Persist drafts on edit and flush on switch and pagehide. The worker owns committed world, progress and deployed files. Merge its latest acknowledged state with the latest draft into one serialized write to that pack's key. Quiesce the clock, finish or cancel outstanding work at an acknowledged action boundary, flush and dispose the session before opening the next pack. Ignore replies for an old generation. Playback is presentation of an already committed action. On reload or switch show the committed world and phase without applying calls again. Restore the active file, pending reveals and working draft. Resume only the saved deployment, initializing the guest against a copy so setup does not spend or deliver twice. Preserve any persistent guest memory in pack state.

**Import v4 once.** The existing key in `apps/web/app/lib/useGame.ts` is `inherit.workshop.v1`. The v4 campaign payload accepted by `packages/sim/src/persistence.ts` is `version: 6`. Ignore `.preview.<step>` slots. On first discovery, if the Workshop slot is absent, validate the source with the version-6 decoder. Freeze the 33-id v4 order in the Workshop importer, independent of the new registry. Translate `lesson.index` to its id, including the end sentinel. Preserve phase, passed ids, completed lessons (`town.solved`), first-cart retry state, queued/released reveals, seen sections, working/deployed files, snapshots and revision history. Copy machines, tick, hand, seed, memory, town beat, requests, payments, letters/read flags, orders and balances. Preserve the active deployment using the existing deployed-project/starter distinction. Use the imported floor as entry state for the current live-retry lesson. Restore the editor on `main.ts` if there was no saved selection.

Map old reveal objects to Workshop reveal ids. Treat an Inbox entitlement with a pending tab letter as waiting for that first row. An already-delivered letter or paid installment survives the conversion exactly once. Migrate bank steps already in progress as such, including a solved card awaiting Continue. The revision importer keeps older archived source readable as text. For pre-v4 payloads reuse the existing `archiveLegacy` path in the Workshop importer. Keep the v2 fixture and the archive test.

Validate and round-trip the new slot before marking the import complete. Its presence is the marker. Leave the original bytes intact. If a target already exists, prefer it on every visit, even if the old payload is newer. Validate envelope identity, versions, ids, projects and both worlds before resuming. On malformed data, unsupported newer versions or storage failure, keep the source, show a recovery message and allow a fresh start in the affected pack by explicit choice. Never autosave a fallback over the unreadable slot. A reset writes a fresh slot so the old chapter cannot reappear on reload.

## Verification and CI

1. **Discover and validate every pack.** Fail on a missing or duplicate manifest id, mismatched folder, missing cover/view, unknown level, empty title/tagline/genre/learning goals, invalid minutes or duplicate lesson/check ids within their scope. Validate reveal targets and the initial and restored entity data. Require at least one check, a visible effect, a solved reaction/action/idea and a single-line goal of 1–70 characters. Verify the starter's edit location exists and has a meaningful comment immediately before or on that line. Parse comment trivia at that location. A license header or a note elsewhere does not count. Optional hints progress to the exact edit. Validate copy including comments, hover text, errors, panel labels, hints and solved cards. Reject whole words `ctx`, `verb` (including plural), `kata`, `bench`, and hyphenated, spaced or joined forms of “wire up”. Beginner-level starters and reference files must have no `import`, `export` or `onTick`, including in comments. Beginner ships just `main.ts`.
2. **Run each pair from the same checkpoint.** Use the TypeScript checker against exactly the active pack declarations, with no DOM or other pack globals. Transpiling alone misses wrong argument types. Compile the actual materialized starter and complete reference project. Execute each through the production QuickJS/worker action handler on independent clones of the same reachable lesson entry. A starter runs without errors and fails the lesson's checks from that checkpoint. A misspelt function or a compiler error is never the reason a starter fails. The reference passes all, produces its specified visible world change and reaches the solved card. For live lessons drive deterministic bounded ticks and normal retries for the furnace. Check that doing nothing or waiting on the old deployment cannot solve the new edit. Drive Continue and ordered reveals before taking the next checkpoint. Report pack id, lesson id, failing check and source line. Run alternate seed/input cases for decisions and off-by-one loops.
3. **Unit and integration.** Cover deterministic rule updates, typed return values, source maps, declaration/implementation agreement, unknown calls and limits. Check world snapshots against the call that produced them. Check red/partial/green, no auto-advance, one reveal per Continue, stable references to player files and isolation across switches. Exercise every v4 index and saves in brief/working/solved, between reveals, after a purchase and at the ending. Round-trip both slots. Test repeated import, stale replies, interrupted writes, unknown versions, malformed input, active clock resume, old archived code and preservation of an existing Beginner save.
4. **Browser playthrough for every discovered pack.** Start from its showcase card with empty storage. Type/paste each reference into Monaco, use the visible Run/Deploy, handle normal retries, wait for the visible effect and solved card, then click through each reveal. Reach the ending in one continuous playthrough without debug jumps or direct progress writes. Assert the world is visible at entry and during edits, the button is large at the right edge of the header and disabled with a reason during playback, the active source line matches the action, and delays never advance a lesson. Check no empty nav tabs, switching and reloading unfinished drafts, narrowed layouts, fair decorations, Bram's change of mode, the bank routes and the standing bridge. Keep focused debug-hook tests separate. Extend `tests/e2e/chapter-capture.ts` to write opening, solved and reveal frames for every lesson to `$INHERIT_SHOTS/<pack-id>/<lesson-id>/`. Capture the switch to Deploy and lamps mid-loop. Store screenshots outside the checkout. Failure artifacts identify the pack and lesson.
5. **CI.** Add `.nvmrc` containing `24` and `.github/workflows/check.yml` for `pull_request` and `push` to `main`. Check out, select Node from `.nvmrc`, enable Corepack with `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` and use the root manifest's pinned pnpm. In order run `pnpm install --frozen-lockfile`, `pnpm test` (includes pack validation), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm exec playwright install chromium --only-shell` and `pnpm test:browser`. Install Chromium system dependencies on the runner. Use the built site on loopback, `INHERIT_TEST_PORT` if needed and `INHERIT_SHOTS` under the runner temp directory. Upload the screenshots as PR run artifacts.

## Remove the v2 engine

The foundation audit predates the v4 port. These are deletion targets for implementation, checked by path and symbol search at `bee64f0`. Remove their callers in the same change. Preserve the historical audit and ADRs.

| Directory | Exact files to delete | Evidence and prerequisite |
| --- | --- | --- |
| `apps/web/app/components/` | `DriversPanel.vue`, `MetricsPanel.vue`, `SnapshotsPanel.vue`, `TestsPanel.vue` | No app template mounts them. History and archive access live in the frame. |
| `apps/web/app/lib/` | `preview.worker.ts`, `devtools/worker.ts`, `devtools/preview.ts`, `devtools/preview.test.ts` | Only TestsPanel starts this preview worker. Keep the live runner, file tree and shared panel CSS. |
| `packages/sim/src/` | `levels.ts`, `layout.ts`, `types.ts`, `api.ts`, `sim.test.ts`, `machines.test.ts` | Old station layouts, controllers and fixed-level checks enter through the sim barrel and old tests. Remove the legacy world overload and `@inherit/sim/api` export, and port the sandbox tests that import its Factory type. |
| `tests/`, `packages/sandbox/src/` respectively | `legacy-level-controllers.ts`, `chapter.test.ts` | That test imports the old controllers and calls `createLegacyProgram`. First port its still-relevant source-line, isolation and budget coverage. Keep the watched chapter tests. |
| `packages/sim/src/` | `objectives.ts`, `objective-highlights.ts`, `quests.ts`, `reference/index.ts`, `reference/actions.ts` | Old objective track, quest runner and solutions feed the barrel. The live lessons and reference playthrough use `lesson-flow.ts` and `reference/chapter-one.ts`. Remove only the old reference exports. |
| `packages/sim/src/` | `engine.ts`, `freight.ts`, `orders.ts`, `campaign.test.ts`, `routing.test.ts` | Move live `recordStats` from engine to Workshop first. Retire the low-level `stepCampaign` tests and old freight/board API once the port covers the shared production and purchase rules. Real town orders and their settlement live in Workshop. |
| `docs/` | `campaign-engine.md`, `campaign-game.md` | Both describe the retired engine. Replace current entry-point links with the authoring guide. |

In mixed files cut only the dead path. Remove the old `RESEARCH` tree after moving `getSurface`, machine licenses and deploy/rollback from `research.ts`. Remove the legacy level engine in `packages/sim/src/index.ts` and `createLegacyProgram` in `packages/sandbox/src/index.ts` after porting `project.test.ts` to the generic bridge. Remove unused legacy sandbox globals and the mock factory. Retain module resolution, interrupt/source-map tests, v4 decoder, archive shapes, named purchases in `blueprints.ts`, production and transport helpers still reached by `primitiveTick`. Keep current chapter controllers, tests and `tests/e2e/fixtures/v2-workshop.json` for the port and migration.

Repeat these searches over source, tests and manifests before removal and after porting the last caller. Check Vue tags in both casings and follow sim barrel re-exports.

```sh
rg -in 'drivers-?panel|metrics-?panel|snapshots-?panel|tests-?panel|createBenchWorker|preview\.worker' apps tests
rg -n 'legacy-level-controllers|createLegacyProgram|createWorld\(|@inherit/sim/api|objectiveTrack|referenceActions|referenceFiles' apps packages tests
rg -n 'recordStats|stepCampaign|advanceTrips|openBoard|RESEARCH|getSurface|blueprintCommands|settleTown' apps packages tests
rg -n 'campaign-(engine|game)\.md' --glob '*.md'
```

## Authoring kit and acceptance

Ship `docs/packs/AUTHORING.md`, `.agents/skills/author-pack/SKILL.md` and `pnpm new-pack <id>`. The scaffold checks for a unique folder-safe id, declines to overwrite an existing folder, and creates a small complete pack with cover, schema, one global call, one commented starter, one visibly changing world view, a failing starter and a passing solution. Running the ordinary validation suite discovers it immediately.

The guide walks from a topic and a learning goal to one visible effect per idea. Show the folder contract, typed operation with hover help, renderer props, comments at the edit, progressive hints, checks, saves and the command to play the reference through Chromium. Catalogue shareable sprites and drawing helpers extracted from `apps/web/app/lib/art/` (ground, buildings, lamps, portraits), with one rendered example and source path each. Keep village-specific names and machine recipes in their pack. The skill walks an author through choosing the level and time, scaffolding, testing the starter and solution, inspecting screenshots and checking the ending. Its acceptance exercise is to add and play a fresh pack with a new entity and function using only files in its folder. The registry, sandbox, frame and validation roster require zero edits.

## Out of scope

v5 ships only Village at Dawn and Uncle’s Workshop. Additional packs about modules and a clock, strategy, farming, React or signals are future content. A later pack may supply its own guest modules and view in its folder under the same runner limits. No chapter two, cross-pack inventory or currency, cloud saves, multiplayer, offline production or public pack marketplace.
