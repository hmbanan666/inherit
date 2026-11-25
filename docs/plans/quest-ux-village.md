# Plan: quests live in the village

Implements [ADR 0039](../adr/0039-quest-ux-village.md). Ten PRs, in this order. Each one ships on its own, leaves the game playable, and is merged before the next one starts.

| # | PR | Depends on |
| --- | --- | --- |
| 1 | Top bar, Journal and Shop modals, quest tracker, machine card as a pinned popup. The left rail is removed. | main |
| 2 | Toasts and the world events behind them. | 1 |
| 3 | The village band on the field: houses, villager tokens, marks, hit-testing, the villager dialog. | 1, 2 |
| 4 | The machine card anchored next to the machine or drone. | 1, 3 |
| 3b | A bigger village: 20 columns, houses at 1.4×, lots, river, roads and props from existing art. Runs after 4, before 5. | 3, 4 |
| 5 | Villagers wander; hover and motion polish; the screen spec is finished. | 3b, 4 |
| 6 | After the playtest: top bar, toasts in the window, a Quest tab instead of the tracker, a welcome toast, the CPU item, Machines out of the Journal. | 5 |
| 7 | The machine card becomes a modal with sections; one selection highlight. | 6 |
| 7b | Machine modal polish: motion, machine sprite header, chips, Code API as docs, Actions bar, Locked once. | 7 |
| 8 | Playtest polish: code jobs, cumulative XP, level-up dialog, machine card v3, toasts top centre. | 7b |

## Rules for every phase

Read these before the phase. They hold in every PR.

- **Build on what is there.** Move existing markup and styles into components; do not redraw a screen. When the spec says "move", the template and CSS go across with the same classes and the same `data-testid` values, then get wired up. Rename nothing that is not named in the phase.
- **Art stays.** Do not delete or repaint anything in `apps/web/app/lib/art/`, `components/town/`, `packages/sim/src/visuals/`, or the beginner scenes. Phase 3 restores two archived files, and Phase 3b adds `export` to four declarations in `townLandscape.ts`; those are the only art changes in the whole plan.
- **One source of truth.** Quest text, rewards, levels, and the order of quests are read from `packages/sim/src/v8/quests.ts` through the existing exports (`kettlewick.questList`, `canTake`, `chainReady`, `questHold`, `shopFor`, `levelSpan`, `questCard`, `questNextStep`, `grantNote`). New UI strings that are not quest text live in the one new module the phase names. Never copy a quest sentence into a component.
- **No sim changes.** Nothing under `packages/sim/` changes. No new mechanic, no balance change, no new world field, no change to `FactorySave` or its `version: 3`.
- **Old saves keep working.** An old save loads, resumes its open quest, and shows its legacy contract card through `questCard` (which already calls `savedContract`). Existing localStorage keys keep their names and meanings. A new key is allowed only where the phase names it.
- **Checks you run.** `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm sim`, `pnpm sim:report`. After `pnpm sim:report`, `git diff --exit-code docs/sim/report.md` must be clean. Nothing else.
- **Checks you never run.** No browser, no dev server opened in a browser, no Playwright, no `pnpm shots`, no screenshots, no e2e. Do not edit `tests/e2e/`; those specs already point at old copy and are out of scope.
- **Logic is tested as pure functions.** Anything that decides (what to show, where, when) goes in `apps/web/app/lib/*.ts` with a `*.test.ts` beside it, in the style of `questStep.test.ts` and `floorPick.test.ts`. Components only wire those functions to the DOM. There are no component tests in this repo; do not add a component test harness.
- **No new dependencies.** Vue, Nuxt auto-imports, Pixi, and `@lucide/vue` are already there.
- **Modal and keyboard contract.** Every dialog uses native `showModal()` focus handling. Escape closes only the topmost surface. Closing returns focus to the opener, or to the Factory map after a canvas click. Opening Journal, Shop, a villager dialog, or the API book closes the machine card and any other modal; nothing stacks. Editor shortcuts are suppressed while a modal is open. Every icon button has an accessible name. The Journal and, from Phase 6, the Machines dialog are the routes that never need the canvas: taking quests, reading history, opening machines. A toast is never the only place a hint can be read.
- **The PR description** lists every acceptance item with how it was checked, and ends with a Friction report.

---

## Phase 1. Top bar, Journal, Shop, tracker; the rail goes

### Goal

The left rail is gone. The field spans the full width above the editor. The top bar has Journal and Shop buttons. A tracker in the top-right corner of the field shows the open quest's step, tests, and button. Clicking a machine opens its card pinned in the top-left corner of the field. The game can be played start to finish with these alone.

### Files

**New `apps/web/app/components/GameDialog.vue`.** A modal shell copied from the pattern in `ApiBook.vue`: a native `<dialog>` opened with `showModal()` on mount and closed on unmount, `@cancel.prevent` and a backdrop click emit `close`, a header with an `h2` title and an X button (`aria-label="Close {title}"`, `autofocus`). Props: `title: string`. Default slot for the body. Its own scoped CSS, using the same tokens as `ApiBook.vue` (`--panel`, `--line`, `--text`, `--soft`), width `min(520px, 100% - 32px)`, max height `min(80dvh, 720px)` with the body scrolling. Do not change `ApiBook.vue`.

**New `apps/web/app/components/QuestRewards.vue`.** Move the `ul.rewards` block from `FactoryFrame.vue` (the six `li` tiles with `Coins`, `Sparkles`, `Unlock`, and the `.when` labels) and the `.rewards` CSS. Props: `quest: QuestDef`. Move `grantCall` and the `triggerLabel` map with it.

**New `apps/web/app/components/QuestCard.vue`.** Move the `article.quest` block for `shownQuest && card` (title, step, grant line, `VillageAsk`, `.need` with the quantity bar, rewards) and the `.quest-action` footer from `FactoryFrame.vue`, with their CSS (`.quest`, `.goal`, `.need`, `.goal-line`, `.quest-action`, `.calm`, `.link`, `.gold.pulse`, `@keyframes quest-ready`, `.hint`). Use `QuestRewards` inside it. Props: `quest`, `card`, `step: string`, `granted?: GrantNote`, `reading: boolean`, `canTake: boolean`, `hold?: string`, `ready: boolean`, `pulse: boolean`. Emits: `take`, `handOver`, `showTest`, `back`, `openFile(file)`. Keep `data-testid="take-quest"` on Take quest. Do not put `complete-quest` here (that id belongs to the tracker).

**New `apps/web/app/components/ShopDialog.vue`.** `GameDialog` titled `Shop`, holding the `ul.shop-list.purchases` block moved from `FactoryFrame.vue`, with `.shop-list` and `.purchases` CSS. Props: `catalog`, `credits: number`, `bought: string[]`. Emits `buy(id)`. Same disabled rules and the same Owned label.

**New `apps/web/app/components/MachineCard.vue`.** Move the `article.quest` block for `inspected` (name, description, `.facts`, recipes, progress, actions) and its CSS (`.facts`, `.task-line`, `.xp`, `.bar`, the actions `.shop-list` rules it uses). Replace the `My machines` back button with a close X (`aria-label="Close {name}"`). Props: `inspected` (the `inspectMachine` result). Emits `close`, `manual(action)`. In this phase the parent pins it at `top: 12px; left: 12px` inside `.map-frame`, `position: absolute`, `z-index: 5`, width 260px, max height `calc(100% - 24px)` with scrolling.

**New `apps/web/app/components/JournalDialog.vue`.** `GameDialog` titled `Journal`, four sections in this order, each with an `h3`:
1. `Now`: `QuestCard` for the open quest, or for the request being read. When neither, the one line from `questNextStep`.
2. `Requests`: the `ul.requests` block moved from `FactoryFrame.vue` (initial, name, ask, hold). A click selects that request and shows it in `Now` with Take quest. Hidden while a quest is open.
3. `Done`: rows from `questHistory` (below): title, the giver's name, and the `change` line. Empty state: `Nothing handed over yet.`
4. `Machines`: the machine list block moved from `FactoryFrame.vue` (`machineList` rows). A click emits `openMachine(id)`; the parent closes the Journal and opens the machine card.
Props are the values `FactoryFrame` already computes. Emits: `close`, `read(id)`, `take(id)`, `handOver`, `showTest`, `openMachine(id)`, `openFile(file)`.

**New `apps/web/app/components/QuestTracker.vue`.** Absolutely positioned in `.map-frame`: `top: 12px; right: 12px; width: 280px; max-height: calc(50% - 12px)`, overflow auto, `z-index: 4`, background `var(--overlay)`, 1px `var(--line)` border, radius 7px, `aria-label="Quest tracker"`. Two states:
- Open quest: a header row with the giver's name and the title, and a fold button (`aria-expanded`). Under it the step (13px, bold), the grant line when there is one (with its file link), the rows from `trackerRows`, the delivery bar from `card.quantity`, and the footer: Hand over (`data-testid="complete-quest"`, gold, pulses when it turns ready), View remaining test, or `In progress`, with the same conditions as today's footer.
- No open quest: one line, the `questNextStep` sentence (for example `Talk to Bram`), and a `Journal` text button that opens the Journal.
Folded, it is one row: name and step, ellipsised. The fold is saved under the new key `inherit.v8.tracker` (`open` or `closed`, default open).

**New `apps/web/app/lib/questTracker.ts` + `questTracker.test.ts`.**
- `trackerRows(rows: { id; text; state; reason? }[], max = 3)` returns `{ rows, more }`. It keeps the first failed or pending row, then fills to `max` in list order, and `more` is the count left out. Rows keep their state mark (`passing`, `pending`, `failed`).
- `readTrackerOpen(stored: string | null)` returns `false` only for `'closed'`.
- `trackerKey = 'inherit.v8.tracker'`.

**New `apps/web/app/lib/questJournal.ts` + `questJournal.test.ts`.**
- `questHistory(cleared: readonly string[], quests: readonly QuestDef[])` returns `{ id, title, from, change }[]` in `cleared` order. The name drops `Mayor `. An id with no quest (an old save's legacy id) is skipped.

**`apps/web/app/components/FactoryFrame.vue`.**
- Delete the `section.quest-zone` template block and its now-unused CSS (`.quest-zone`, `.zone-tabs`, `.quest-scroll`, and the rail rules in the `@media (max-width: 800px)` block). Everything else in that block was moved above.
- Delete `zone` and every assignment to it (including the one in the worker `resetting` branch). `openMachine(id)` sets `selectedId` only.
- In the `#nav` slot, after `strong.pack-switch`, add two buttons with class `nav-btn`, `aria-haspopup="dialog"`: `Journal` (icon `BookOpen`) and `Shop` (icon `Store`). Journal carries a small gold dot (`aria-label` gets `, new request`) when no quest is open and `offers.length > 0`.
- State: `journalOpen`, `shopOpen` refs. Render `JournalDialog` and `ShopDialog` inside the existing `<Teleport to="body">`, next to `ApiBook`. Only one modal is open at a time.
- Render `QuestTracker` and, when `inspected` is set, `MachineCard` inside `.map-frame`, after `LazyFactoryFloor`.
- The existing `take`, `send({ kind: 'complete' })`, `showOpenTest`, `readingId`, `pulse`, and `granted` logic is reused as is; components emit, `FactoryFrame` calls them.
- `.world-shell` keeps its padding; the gap to the rail goes (`gap: 0`).
- `shortcut()` already returns while the API book is open; make it also return while the Journal or Shop is open.

**`apps/web/app/lib/factoryLayout.ts` + `factoryLayout.test.ts`.** `worksWidth(viewport)` becomes `Math.max(0, viewport - worldInsetPx * 2)`. Remove `questRailPx` and its uses. Update the two tests that read it (`questRailPx` band test is deleted, `worksWidth(1024)` expects `1024 - 16`, the bay test keeps working with the new width). Fix the file's header comment.

**`docs/specs/v8-screen-layout.md`.** Replace the rail paragraphs, the Quest rail section, the Reading order, the Nav section, and the One home each table to match ADR 0039 phase 1: nav with Journal and Shop, the tracker, the pinned machine card, the Journal and Shop modals. Keep every other section word for word.

### Acceptance

- `rg -n "quest-zone|zone-tabs|zone ===|zone.value" apps/web` finds nothing.
- `rg -n "questRailPx" apps` finds nothing.
- `data-testid="take-quest"` appears once, in `QuestCard.vue`. `data-testid="complete-quest"` appears once, in `QuestTracker.vue`. `data-testid="credits"`, `"level"`, `"cpu"`, `"tick"` are unchanged in `FactoryFrame.vue`.
- `VillageAsk.vue`, `TownPortrait.vue`, `ApiBook.vue`, and every file under `lib/art/` are byte-identical to main.
- `questTracker.test.ts`: three passing rows and one pending row with `max = 3` keep the pending row and two passing rows, `more = 1`; a failed row keeps its `reason`; an empty list gives `{ rows: [], more: 0 }`; `readTrackerOpen(null)` is true, `'closed'` is false, `'open'` and junk are true.
- Add pure `apps/web/app/lib/gameOverlay.ts` + `gameOverlay.test.ts`: a discriminated overlay state `none | journal | shop | npc(who) | api`, `openOverlay` replaces rather than stacks, `closeOverlay` returns none. Wire FactoryFrame’s modal refs through this controller; cover replacing Journal with NPC, Shop with API, closing, and restart reset. Keep API section memory unchanged.
- `questJournal.test.ts`: `['bram', 'ines']` gives Bram then Ines with their `change` lines from `questList`; `'Mayor Odile'` shows as `Odile`; an unknown id is skipped; the result reads `title` and `change` from `questList` (assert against `questList.find(...)`, not against a copied string).
- `factoryLayout.test.ts` passes with the new `worksWidth`.
- `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm sim` pass. `pnpm sim:report` leaves `docs/sim/report.md` unchanged.

### Do not

- Do not rewrite `FactoryFrame.vue` or restyle the editor bay, the status bar, the API book, or the nav pills.
- Do not change quest strings, the order of quests, or `questNextStep` / `questCard` output.
- Do not add villagers, toasts, or anchored popups. They are phases 2 to 4.
- Do not add a router, a store library, or a new layout system.
- Do not rename `Take quest` or `Hand over`.
- Do not touch `packages/sim`, `tests/e2e`, `tests/balance`, or `docs/sim`.
- Do not open a browser or run Playwright, shots, or e2e.

---

## Phase 2. Toasts

### Goal

Things that happen in the game show up as short toasts in the bottom-right corner of the field. Villager lines carry the villager's cameo. Loading a save or starting over never replays old events.

### Files

**New `apps/web/app/lib/worldEvents.ts` + `worldEvents.test.ts`.** One pure function:

`worldEvents(prev: WorldView | undefined, next: WorldView, quests: readonly QuestDef[], catalog: readonly { id; name }[], tests?: { prev: Row[]; next: Row[] }): GameEvent[]`

`WorldView` is a `Pick<World, ...>` of `questId`, `cleared`, `bought`, `level`, `credits`, `xp`, `drones`, `press`, `lathe`, `bench`, `spare`, `tick`. `Row` is the test row shape from `questCard(...).tests`. Return `[]` when `prev` is undefined or `next.tick < prev.tick` (a restart). Otherwise, in this order:

| Event | When | `GameEvent` |
| --- | --- | --- |
| `taken` | `next.questId` set and different from `prev.questId` | `{ kind: 'npc', who, name, text: quest.why, key: 'taken:' + id }` |
| `unlocked` | the taken quest has `unlock` | `{ kind: 'event', icon: 'unlock', text: 'New: ' + call name, key }` (call name is the part of `unlock.signature` before `:`) |
| `passed` | a test row id was not `passing` in `tests.prev` and is in `tests.next` | `{ kind: 'event', icon: 'check', text: row text, key: 'passed:' + questId + ':' + rowId }` |
| `stuck` | a row turned `failed` with a `reason` | `{ kind: 'npc', who, name, text: reason, key: 'stuck:' + questId + ':' + rowId + ':' + reason }` |
| `ready` | every row passing in `next` and not in `prev` | `{ kind: 'event', icon: 'ready', text: 'Ready to hand over to ' + name, key }` |
| `handed` | an id is in `next.cleared` and not in `prev.cleared` | `{ kind: 'event', icon: 'coins', text: '+' + credit gain + ' credits · +' + xp gain + ' XP', key }`, then `{ kind: 'npc', who, name, text: quest.change, key }` |
| `level` | `next.level > prev.level` | `{ kind: 'event', icon: 'level', text: 'Level ' + next.level, key }` |
| `trigger` | the handed quest has `trigger` | `{ kind: 'event', icon: 'unlock', text: grantHint(trigger), key }` (import `grantHint` from `questStep.ts`) |
| `machine` | `press`, `lathe`, `bench`, or `spare` was null or missing in `prev` and is set in `next` | `{ kind: 'event', icon: 'machine', text: name + ' installed', key }` with names Press, Lathe, Assembly table, Spare press |
| `drone` | `next.drones.length > prev.drones.length` | `{ kind: 'event', icon: 'drone', text: newest drone name + ' joined the works', key }` |
| `bought` | an id is in `next.bought` and not in `prev.bought` | `{ kind: 'event', icon: 'coins', text: 'Bought ' + catalog name, key }` |

The only fixed English in this phase is in this file, as named constants at the top. Quest words come from `quests`.

**New `apps/web/app/lib/toasts.ts` + `toasts.test.ts`.** A reducer with no timers inside:
- `type Toast = GameEvent & { id: number; until: number }`.
- `pushToasts(list, events, now, seen: Set<string>)` adds events whose `key` is not in `seen`, records the key, gives each an `until` of `now + 4000` (event) or `now + 7000` (npc), and keeps the newest 3 (the oldest goes first). Keep pending events in a FIFO queue so a hand-over producing several events does not drop rewards or dialogue before they can be read; admit from the queue when a slot expires. The 3-item eviction rule applies only to explicit urgent replacement, not a normal batch. Bound pending events to 24; coalesce `passed` events for the same quest when full before discarding any other event.
- `expireToasts(list, now)` drops toasts whose `until <= now`.
- `holdToasts(list, now, ms)` adds `ms` to every `until` (used while the stack is hovered).

**New `apps/web/app/components/ToastStack.vue`.** Absolutely positioned in `.map-frame`: `right: 12px; bottom: 52px` (above `.map-controls`), `width: 300px`, `max-height: calc(45% - 64px)`, `overflow: hidden`, flex column, newest at the bottom. `role="status"`, `aria-live="polite"`. An npc toast: a 32px `TownPortrait` (reuse the component; mood `waiting`), the name in bold, the line. An event toast: a lucide icon (`Check`, `Coins`, `Sparkles`, `Unlock`, `Cog`, `Truck`, `BellRing` for ready) and the text. A click dismisses one toast. Hover records entry time and suspends expiry; on leave call `holdToasts` with elapsed hover time, then resume. Do not expire hovered toasts in the timer. Slide in 160ms from the right; no motion under `prefers-reduced-motion: reduce`. Pointer events only on the toasts, so the floor under the empty part of the stack stays clickable.

**`apps/web/app/components/FactoryFrame.vue`.**
- Keep the previous world and the previous tests in plain variables. In the existing `watch(world, ...)` path, call `worldEvents(prevView, nextView, kettlewick.questList, catalog.value, { prev, next })` and `pushToasts`.
- Baseline: the first world after mount, after `restart` from a save, and after Start over sets `prev` and pushes nothing. Reuse the same moment the existing `grantNotesReady` flag uses.
- One `setInterval` of 500ms runs `expireToasts` while the list is non-empty, and is cleared on unmount.
- The existing credit float on the pill stays.

### Acceptance

- `worldEvents.test.ts`, using `createWorld(kettlewick)` and `acceptQuest` / `completeQuest` / `buyUpgrade` from `@inherit/sim/v8` to build real before and after worlds (clone with `structuredClone`):
  - no `prev` gives `[]`; a lower `tick` gives `[]`.
  - taking Bram gives one npc event whose text equals `questList[0].why`.
  - taking Odile gives `taken` and `unlocked` with `New: furnace.alloy()`.
  - handing over Odile gives `handed` (credits and XP equal the quest's `pay` and `xp`), the npc `change` line, `machine` for the press, and `drone` for drone-2, and a `level` event when the level rises.
  - handing over Ines gives the `trigger` event with `grantHint('tick')`.
  - a row going `pending` to `passing` gives `passed` once; going `pending` to `failed` with a reason gives `stuck` with that reason.
  - buying `cart` gives `Bought Bigger cart`.
  - every quest-derived text is asserted against the `questList` field, not a copied string.
- `toasts.test.ts`: a repeated key is pushed once; urgent replacement drops the oldest at the fourth toast; a normal five-event hand-over batch queues two, admits them on expiry in order, and never exceeds three visible; event and npc lifetimes are 4000 and 7000; `expireToasts` at `until` removes it; `holdToasts` pushes `until` forward.
- Loading a save where Bram is cleared, without any change, makes `worldEvents` return `[]` on the first frame (test: `prev` undefined).
- `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm sim` pass; the sim report is unchanged.

### Do not

- Do not toast script errors, deploy errors, console lines, or CPU warnings. They stay in the console and the status bar.
- Do not add sound, a notification centre, or a toast history.
- Do not change the tracker, the Journal, or the credit float.
- Do not write new villager dialogue. Villager toasts only use `why`, `change`, and a stuck row's `reason`.
- Do not touch `packages/sim`, `tests/e2e`, or art. No browser, no e2e, no shots.

---

## Phase 3. The village on the field

### Goal

A 4-tile village band is drawn to the left of the works. Houses are the archived town buildings. Every quest giver stands in front of their house as a cameo token with a name and a mark. Hovering a villager shows the pointer and the gold outline; clicking opens their dialog, where the player can take or hand over the quest.

### Files

**Restore art from the `art-archive` tag.**
```sh
git checkout art-archive -- apps/web/app/lib/art/townBuildings.ts apps/web/app/lib/art/townLandscape.ts
```
Change only their `import type` lines from `'@inherit/sim'` to `'../townTypes'` (`BuildingId`, `BuildingState`, `TownSnapshot` are there). If `TownSnapshot['debt']` or another field is missing, add the minimum type to `townTypes.ts`; do not change any drawing code. Do not restore `townScene.ts`, `TownView.vue`, or `townFixture.ts`. Move both files from Archived to Live in `docs/art.md`, with one line each saying the field draws them.

**New `apps/web/app/lib/village.ts` + `village.test.ts`.** All village decisions, no Pixi:
- `villageCols = 4`.
- `fieldBounds(grid)` returns `{ left: -villageCols * tile, top: 0, width: (grid.width + villageCols) * tile, height: grid.height * tile }` in world pixels (`tile` is 96, import it from `floor.ts` or move the constant to `floorPick.ts` if the import cycles).
- `villageHomes`: house anchor per building, in cells, inside the band (`x` from −4 to −1, `y` from 0 to 5). Start with:

| building | house cell | villager spots (cell) |
| --- | --- | --- |
| forge | (−4, 0) | bram (−4, 1) |
| bakery | (−2, 0) | elsie (−2, 1) |
| town-hall | (−4, 2) | ines (−4, 3), harrow (−3, 3) |
| mill | (−2, 2) | tomas (−2, 3) |
| lamp-street | (−4, 4) | wen (−4, 5) |
| riverside | (−2, 4) | pell (−2, 5) |
| bridge | (−1, 5) | odile (−1, 4) |

  Column −1 is the road; the gate is at (−1, 1), beside the depot at (1, 1). Pixel offsets inside a cell may be tuned; the cells are the contract the tests check.
- `villagers(quests)` returns one entry per distinct `who`, in first-quest order: `{ who, name (no Mayor), role, building }`, read from `questList`.
- `villagerQuest(world, quests, who)` returns the quest the dialog is about: the open quest when its `who` matches, else the first quest of that `who` that is not cleared and passes `chainReady` and the level, else undefined.
- `villagerMark(world, quests, who)` returns `'offer' | 'active' | 'ready' | undefined`. `offer` only when no quest is open and `canTake` is true. A held request stays discoverable in the Journal and its NPC dialog, without a misleading gold offer marker. `active` when the open quest is theirs and not every check is green. `ready` when it is theirs and every check is green (same rule as `questCard(...).ready`). Otherwise undefined.
- `villagerDim(world, quests, who)` is true when they have no mark and have not had a quest handed over.
- `buildingState(world, quests, building)` is `'working'` when any quest with that `building` is in `cleared`, else `'broken'`.
- `idleLine(world, quests, who)`: the `change` of their latest cleared quest; else `Come back at level N.` with the `needLevel` of their next quest; else `Not yet.`. These two fixed strings are constants in this file.
- `villageView(world, quests)` bundles the above per villager for the floor: `{ id: 'npc:' + who, who, name, spot, mark, dim }`, plus `{ building, state }` per house.

**`apps/web/app/lib/floorPick.ts` + `floorPick.test.ts`.**
- `npcShapes`: the token footprint (cameo 40×40 centred 22px above the spot, plus the name caption via `captionBox`) as `Shape[]`, like `stationShapes`.
- `pickFloor(px, py, tile, stations, carts, npcs = [])`: test carts first (unchanged), then villagers, then stations, then captions (unchanged). Villager anchors are `{ id, x, y }` in world pixels.
- Existing tests stay green without changes. Include the marker bounds in each NPC hit target. Resolve overlapping NPC targets by reverse draw order. House/terrain sprites never steal a machine click.

**`apps/web/app/lib/floor.ts`.**
- In `land()`, nothing changes for the grid. Add a `village(scene, grid)` painter for the band at negative x: the ground from `townLandscape.ts` (phase `day`) printed to a sprite the size of the band, the road in column −1, a fence on x = 0 with a gate gap at row 1. Use the `print` pattern from the archived `townScene.ts` (`CanvasSource` from `illustration`) inside `floor.ts`.
- `FloorScene` gets a `villageLayer` (under `equipmentLayer`) and an `npcLayer` (above it, under the cart layer):
  - Houses: one sprite per building from `drawBuilding(p, id, state, 'day', undefined)` printed at 210×176 and scaled to fit one cell (about 0.5), anchored on the house cell. Re-print a house only when its `state` changes.
  - Villagers: per entry, a container with the cameo printed once from `portrait(p, who, 'waiting')` into a 40×40 sprite with a round mask and a 2px dark ring, the name with the existing `caption()`, and a mark: a 20px circle with `!` or `?` (gold `0xeabe50` for offer and ready, grey `0x8a8a8a` for active), 30px above the cameo. Dim villagers draw at alpha 0.55.
  - `setVillage(view)` updates marks, dim, and house states.
  - `npcAnchors()` returns live anchors, like `cartAnchors()`.
  - `highlight` and `select` accept `npc:` ids and use `npcShapes` with the existing hover scale and outline.
- Grid drawing, machines, carts, routes, and the selection code for machines are untouched.

**`apps/web/app/components/FactoryFloor.vue`.**
- New prop `village?: VillageView`. Pass it to `scene.setVillage` in `sync()`.
- `worldSize` becomes `fieldBounds(grid)` width and height. `camera.x` adds `-bounds.left * scale` so the grid keeps its world coordinates; `floorPoint` stays as is.
- `pick` passes `scene.npcAnchors()`.
- `emit('select', id)` stays; `npc:` ids are emitted the same way.

**`apps/web/app/lib/questNote.ts` + `questNote.test.ts`.** Add `questSummary(world, quest)` returning the `quote`, and the single goal and quantity resolved by `questCard`. For a legacy contract use `card.goal` and `card.quantity` (never `quest.goal`, `quest.item`, or `quest.lines`); preserve the saved-contract delivery requirement. Keep `questCard`, `savedContract`, and all existing tests intact.

**`apps/web/app/components/QuestCard.vue`.** Replace the phase-1 duplicated `step` + `VillageAsk` ask + `.need` paragraph with `VillageAsk` using the `quote`, one labelled goal from `questSummary`, quantity/progress and rewards. Steps and grant/code hints belong in the persistent tracker or phase-2 toasts, not this card. Keep the action footer and the reusable components. Do not remove essential requirements from the goal (Bram’s code-started batch, Elsie’s two carts, crew order).

**New `apps/web/app/components/VillagerDialog.vue`.** `GameDialog` titled with the villager's name. Body: `TownPortrait` (64px), name and role, then by state:
- offer: the `questSummary` quote, `Goal` and its resolved goal, `QuestRewards`, the hold sentence if `questHold` returns one, and `Take quest` (`data-testid="npc-take"`, disabled unless `canTake`).
- active: the resolved quote and goal from `questSummary`, `QuestRewards`, the quantity bar from `questCard`, and `Close`.
- ready: the goal with a check mark, `QuestRewards`, and `Hand over` (`data-testid="npc-hand-over"`).
- none: `idleLine`.
Emits `take(id)`, `handOver`, `close`.

**`apps/web/app/components/FactoryFrame.vue`.**
- Journal request selection and tracker name/title open the same `VillagerDialog`; the Journal closes before the NPC dialog opens. Keep the Journal as the keyboard-accessible route when the renderer fails. Focusing a villager through the tracker also centres the floor on that spot; do not require the camera to move before the modal can open.
- `villageView` computed from `world` and `kettlewick.questList`; pass it to `LazyFactoryFloor`.
- `@select`: an id starting with `npc:` opens `VillagerDialog` for that `who` (and clears `selectedId`); any other id keeps `openMachine`.
- `take` and Hand over from the dialog call the same `take(id)` and `send({ kind: 'complete' })` as the Journal and tracker, then close the dialog.

### Acceptance

- `village.test.ts`:
  - `villagers(questList)` lists bram, ines, odile, elsie, harrow, tomas, pell, wen once each, names without `Mayor`.
  - every house cell and villager spot is inside the band (`-4 <= x <= -1`, `0 <= y <= 5`); no two share a cell; every `building` used by `questList` has a house.
  - fresh world: bram is `offer`, everyone else has no mark and is dim.
  - after taking Bram: bram is `active`, nobody else has a mark. After his tests pass (drive the world with the same helpers the sim tests use, or set the fields the tests read): `ready`.
  - after handing Bram over: forge is `working`, bram's `idleLine` equals Bram's `change`, ines is `offer`.
  - a held request (Odile cleared but drone-2 missing, an old save shape: Elsie) has no mark, remains readable via the Journal/NPC dialog, and `canTake` is false.
  - Odile with `odile` cleared and `crew` not yet reachable: `villagerQuest` returns undefined and `idleLine` returns Odile's `change`; when `crew` is reachable it returns `crew`.
  - an old save with an unknown quest id in `cleared` does not throw.
  - `fieldBounds({ width: 16, height: 6 })` is `{ left: -384, top: 0, width: 1920, height: 576 }`.
- `floorPick.test.ts`: a point on a villager's cameo returns `npc:<who>`; a point on a station is still that station; a cart standing over a villager still wins; existing cases pass unchanged.
- `townBuildings.ts` and `townLandscape.ts` differ from `art-archive` only in import lines (`git diff art-archive -- <file>`).
- `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm sim` pass; the sim report is unchanged; `rg -n "grid" packages/sim/src/v8/sites/kettlewick.ts` still shows `width: 16, height: 6`.

### Do not

- Do not add the band to `world.grid`, `findPath`, occupancy, or any sim file. Drones never walk into the village.
- Do not make villagers move yet (phase 5).
- Do not draw new character or building art. Use `portrait()` and `drawBuilding()`.
- Do not restore `townScene.ts`, `TownView.vue`, `townFixture.ts`, or the town simulation.
- Do not add a trader, a bank, a debt, day and night, or new villagers.
- Do not write dialogue beyond `quote`, `goal`, `change`, and the two `idleLine` fallbacks.
- Do not remove the Journal's Take or the tracker's Hand over.
- Do not touch `tests/e2e`. No browser, no e2e, no shots.

---

## Phase 4. The machine card next to the machine

### Goal

Clicking a machine or a drone opens its card beside it, not in a corner. The card stays next to its target while the map pans, zooms, or the cart moves.

### Files

**New `apps/web/app/lib/popupPlace.ts` + `popupPlace.test.ts`.**
- `popupPlace(target: Box, popup: { w; h }, frame: { w; h }, gap = 10)` returns `{ left, top, side, width, maxHeight }` in frame pixels. Prefer the right of the target, top-aligned with it; if it does not fit, the left; if neither fits, below; then clamp inside the frame with a 8px margin. `side` is `'right' | 'left' | 'below'`.
- `screenBox(shapes: Shape[], origin: { x; y }, camera: { x; y }, scale)` returns the bounding box of the shapes in frame pixels.

**`apps/web/app/lib/floor.ts`.** `anchorBox(id)` returns the world-pixel bounding box of a station, a drone (from its live sprite), or a villager, using `stationShapes`, `cartMark`, and `npcShapes`; undefined when the id is gone.

**`apps/web/app/components/FactoryFloor.vue`.** Emit `anchor` with the selected id's frame box (`screenBox` of `anchorBox`) at the end of each `sync()` and after pan or zoom, also on animation frames while a selected cart moves (only emit a changed box), and `undefined` when nothing is selected or the id is gone. Clicking empty floor (no hit) emits `select('')`.

**`apps/web/app/components/FactoryFrame.vue`.** Keep the anchor box in a ref. `MachineCard` gets `left` and `top` from `popupPlace(anchor, cardSize, frameSize)`; `cardSize` comes from a `ResizeObserver` on the card, `frameSize` from the `.map-frame`. Close the card (`selectedId = ''`) on its X, on Escape while it has focus or the floor has focus, on `select('')`, when a modal opens, and on restart. Drop the pinned `top: 12px; left: 12px` rule from phase 1.

### Acceptance

- `popupPlace.test.ts`: right fits gives `side: 'right'` at `target.x + target.w + gap`; a target at the right edge flips to left; a target wider than the space on both sides goes below; the result never leaves the frame (property loop over a grid of targets); a frame smaller than the requested popup constrains its effective width/height to `max(0, frame dimension - 16)`, places it at 8px, and lets the body scroll. Assert effective dimensions too; merely clamping the origin is insufficient.
- `screenBox` at scale 1 and camera 0 equals the shape box plus origin; at scale 2 and camera (10, 20) it scales and shifts.
- `floorPick.test.ts` or a new `floorAnchor.test.ts`: `anchorBox('furnace')` matches `stationShapes('furnace', ...)` around the furnace cell; an unknown id gives undefined.
- `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm sim` pass; the sim report is unchanged.

### Do not

- Do not change what the card says or which buttons it has (`inspectMachine` and the `manual` commands stay).
- Do not draw a speech-bubble tail or an arrow; position only.
- Do not move the selection outline or the hover rules.
- Do not touch `packages/sim`, art, or `tests/e2e`. No browser, no e2e, no shots.

---

## Phase 3b. A bigger village

### Goal

Nick playtested Phase 3 on 25 November 2026 (t241u). He likes the village on the left of the works on the same canvas, its look, and the villager cameos and names. Everything else is too small: the houses are tiny and their signs cannot be read, and the band is too narrow to feel like a village. This phase makes the village area five times wider, draws the houses at 1.4× their native size so their signs read at the default zoom, gives every house a lot with its villager standing beside it, and fills the rest with a river, a bridge, roads, lanes, trees, orchards, fields, fences and a horse, all from art that already exists. Behaviour is unchanged: marks, dim, dialogs, picking, the tracker and the Journal work as in Phases 3 and 4. It runs before Phase 5 because wandering is measured from the new spots.

### Key values

| Value | Phase 3 | Phase 3b |
| --- | --- | --- |
| `villageCols` | 4 | **20** (band x from −1920 to 0 world px) |
| `fieldBounds({ width: 16, height: 6 })` | `{ left: -384, top: 0, width: 1920, height: 576 }` | **`{ left: -1920, top: 0, width: 3456, height: 576 }`** |
| `houseScale` (sprite scale of a 210×176 print) | ≈0.46 | **1.4** (plaque text 8px → 11.2 world px) |
| House print resolution | 2 | **3** |
| Villager and house positions | cells | **world pixels** (tables below) |
| Default camera (`homeView`) | the whole field | **the works plus the 8 nearest village columns**: `{ left: -768, top: 0, width: 2304, height: 576 }` |
| Zoom range | 0.32–2.8 of the fit | unchanged; at about 0.67 the whole field is visible |

`world.grid` stays 16×6. The band is drawing only.

### Layout

The band is cut into lots of 4 columns × 3 rows (384 × 288 world px). Lot columns start at x = −1920, −1536, −1152 and −768; lot rows start at y = 0 (north) and y = 288 (south). The last 4 columns (x −384 to 0) are the square: the main road and the gate. A house's **base** is the point where `drawBuilding` puts its origin (the print draws it at (105, 138) of 210×176). Base x = lot x + 152. Base y = 230 in the north row and 515 in the south row. A villager stands to the east of their house at lot x + 344, 10px above the base line. Harrow stands 110px north of Ines.

| Lot (x, y) | Building | House base | Villager spots |
| --- | --- | --- | --- |
| (−768, 0) | forge | (−616, 230) | bram (−424, 220) |
| (−1152, 0) | town-hall | (−1000, 230) | ines (−808, 220), harrow (−808, 110) |
| (−1536, 0) | bakery | (−1384, 230) | elsie (−1192, 220) |
| (−1920, 0) | none: the meadow (river, orchard, fields, firs) | — | — |
| (−768, 288) | mill | (−616, 515) | tomas (−424, 505) |
| (−1152, 288) | lamp-street | (−1000, 515) | wen (−808, 505) |
| (−1536, 288) | riverside | (−1384, 515) | pell (−1192, 505) |
| (−1920, 288) | bridge | (−1768, 515) | odile (−1576, 505) |

`houseBox(base)` is the sprite box at 1.4: `{ x: base.x − 147, y: base.y − 193.2, w: 294, h: 246.4 }`.

Ground, all inside the band:
- **River**: runs north to south at x −1828 to −1708 (centre −1768) for the whole height. The bridge house stands on it in the south row.
- **Main road**: x −168 to −120, full height. A spur runs along y 120 to 168 from the main road east to the gate gap in the fence (x = 0, row 1, as in Phase 3).
- **Two lanes**: y 238 to 262 and y 523 to 547, each running from the main road west to the river. The south lane continues across the bridge to the west edge.
- **The fence** on x = 0 with the gate gap at row 1 stays exactly as in Phase 3.

### Files

**`apps/web/app/lib/art/townLandscape.ts`.** Add the keyword `export` to `landColors`, `orchard`, `splitRail` and `fields`. Change nothing else: no body, no colour, no parameter. This is the only art change in this phase, and it reuses existing drawings without redrawing them.

**`apps/web/app/lib/village.ts` + `village.test.ts`.**
- `villageCols = 20`, `houseScale = 1.4`, `homeCols = 8`. `fieldBounds(grid)` keeps its formula. New `homeView(grid)` = `{ left: -homeCols * tile, top: 0, width: (grid.width + homeCols) * tile, height: grid.height * tile }`.
- `villageHomes` becomes the house base per building in world pixels, from the table. The villager spots become world pixels from the table. `villageView(...).npcs[].spot` is `{ x, y }` in world pixels (type `Point`), no longer a cell.
- `houseBox(base)` as above. `villagerBox(spot, name)` is the bounding box of `npcShapes(name, true)` around the spot (cameo, caption and mark).
- `villageLots` lists the eight lots (x, y, w 384, h 288, building or `'meadow'`).
- `villageGround` holds the river, road, spur and lane rectangles from the Layout section as plain data, and the painter draws them.
- `villageProps`: a constant, deterministic list of environment props, each `{ kind, x, y, size }`, with `kind` one of `'fir' | 'orchard' | 'fields' | 'rail' | 'horse'`. Each kind is drawn by `fir`, `orchard`, `fields`, `splitRail` or `horse` from the existing art files. At least 16 firs, 8 orchard trees, 2 fields, 6 split-rail runs and 1 horse. The horse stands within 200px of the forge base. Most props go in the meadow, along the north and south edges, between lots and around the square.
- `propBox(prop)` returns a conservative box of what that drawing paints at that size. Read the extent from the drawing code and write the formula in a one-line comment for each kind.
- Keep `villagers`, `villagerQuest`, `villagerMark`, `villagerDim`, `buildingState`, `idleLine`, `villagerDialog` and `journalRequests` unchanged.

**`apps/web/app/lib/floor.ts`.**
- `village(scene, grid)`:
  - Paint the band once into one printed sprite (1920 × 576, resolution 2): a flat ground of `landColors.day[0]`, the lanes, road and spur in `landColors.day[1]` with a `landColors.day[2]` edge, the river in `landColors.day[3]` with `landColors.day[4]` ripples, then every entry of `villageProps` with its existing drawing.
  - Remove the landscape crop that Phase 3 used as ground.
  - Keep the fence and gate drawing.
- Houses: print 210×176 at resolution 3, place the sprite so the building origin lands on its base, and scale it by `houseScale`. Re-print only when the state changes, as now.
- Villager tokens: same art, same sizes, same mark, caption and dim as in Phase 3. Only their position changes, from a cell centre to `npc.spot` in pixels.
- Hover, outline, `npcAnchors` and `anchorBox` keep working with the pixel spots.

**`apps/web/app/lib/floorPick.ts` + `floorPick.test.ts`.** Add `panToPoint(point, size, camera)`, the pixel twin of `panToCell`. Keep `panToCell` and its test.

**`apps/web/app/components/FactoryFloor.vue`.**
- `place` is `containPlace` of `homeView(grid)` instead of `fieldBounds(grid)`, and the camera x adds `-homeView.left * scale`. Recenter and the Phase 4 anchor emit keep working against that view.
- `focusSpot?: Cell` becomes `focusPoint?: { x; y }` in world pixels and uses `panToPoint`.
- `floorPoint`, picking and zoom limits are unchanged.

**`apps/web/app/components/FactoryFrame.vue`.** The tracker's villager focus passes the villager's pixel spot as `focusPoint`. Nothing else changes.

**Docs.**
- `docs/art.md`: one line saying the field draws firs, orchard trees, fields, split rails and the horse from `townLandscape.ts` and `townBuildings.ts`.
- `docs/specs/v8-screen-layout.md`: one sentence on the village size and the default camera.

### Acceptance

- `village.test.ts`:
  - `fieldBounds({ width: 16, height: 6 })` is `{ left: -1920, top: 0, width: 3456, height: 576 }`; `homeView({ width: 16, height: 6 })` is `{ left: -768, top: 0, width: 2304, height: 576 }`.
  - `houseScale >= 1.4`. `containPlace(1904, 560, 2304, 576).scale * houseScale * 8 >= 9`: the sign text is at least 9 screen px at the default zoom on a 1904 × 560 map frame.
  - `villageHomes` and the villager spots equal the Layout table exactly.
  - Every `houseBox` lies inside the band (x ≥ −1920, x + w ≤ 0, y ≥ 0, y + h ≤ 576). No two house boxes intersect.
  - No house box intersects any `villagerBox`. No two villager boxes intersect.
  - Every villager spot is within 240px (Euclidean) of their house base and east of the house box's right edge.
  - Every house box and villager box stays clear of the river, except the bridge house, and of the main road.
  - Every prop's `propBox` lies inside the band, clears the fence (x + w ≤ −8), and intersects no house box, villager box, river or road rectangle.
  - Prop counts meet the minimums, and the horse is within 200px of the forge base.
  - Every existing behaviour test (marks, dim, held Elsie, Odile and crew, idle lines, unknown cleared ids) passes with only its layout expectations changed.
- `floorPick.test.ts`: `panToPoint` puts a pixel point at the viewport centre at two zoom levels. Existing cases pass unchanged.
- `git diff art-archive -- apps/web/app/lib/art/townLandscape.ts` shows only the import line and `export` added to the four declarations. `git diff origin/main -- apps/web/app/lib/art/townBuildings.ts` is empty.
- `rg -n "grid" packages/sim/src/v8/sites/kettlewick.ts` still shows `width: 16, height: 6`.
- `pnpm test`, `pnpm typecheck`, `pnpm build` and `pnpm sim` pass. After `pnpm sim:report`, `git diff --exit-code docs/sim/report.md` is clean.

### Do not

- Do not delete, redraw, recolour or retouch any art. Do not change a drawing body in `apps/web/app/lib/art/`; the four `export` keywords are the only edit. Do not draw new buildings, characters or trees. Simple flat ground shapes for the river, roads and lanes in `floor.ts` are allowed; nothing pictorial.
- Do not change the NPC cameos, their size, ring, name captions, marks, mark colours or dim alpha.
- Do not make villagers move. Wandering is Phase 5.
- Do not change `world.grid`, `findPath`, occupancy, the save format, quest data, quest text, balance, or anything under `packages/sim/`. Drones never enter the band.
- Do not change the machine card, tracker, Journal, toasts, shop or villager dialog beyond the `focusPoint` rename.
- Do not add day and night, a trader, a bank, new villagers or new dialogue.
- Do not touch `tests/e2e`. No browser, no dev server, no e2e, no shots.

---

## Phase 5. Villagers wander; final documentation

### Goal

Villagers take a few steps around their Phase 3b pixel spots now and then, so the field feels alive, without ever being hard to click. Each stays inside the 384×288 lot of their house, at most 240 world px from its base, never on the river or road. The screen spec and glossary describe the finished screen, including the anchored machine card.

### Files

**New `apps/web/app/lib/wander.ts` + `wander.test.ts`.**
- `wanderOffset(who: string, ms: number, radius = 0.3 * tile)` returns `{ x, y, walking }` in world pixels. Deterministic from a hash of `who` and active animation time: each villager idles 4–8 s, then walks 1.2–1.8 s to a new point within `radius` horizontally and `radius / 2` vertically of their home spot, with ease-in-out. Different villagers are out of phase. No sim RNG or wall-clock state in this pure function.
- Constrain the motion to the actual Phase 3b layout using pure, tested helpers in this file. Read `villageHomes`, `villageLots`, `houseBox`, `villagerBox` and `villageGround` from `village.ts`; do not copy the layout table. A villager belongs to the lot whose `building` matches theirs. The whole marked token footprint (cameo, caption and marker, allowing 2px marker bob) stays within that lot, clear of house boxes, other villager footprints, river, road, gate spur, lanes, props and the fence. The anchor stays within 240px of its house base at all times, not just at endpoints. Treat `propBox` rectangles as static exclusions, not simulation collisions.
- Choose a deterministic safe local motion envelope around each existing home spot; constrain endpoints before interpolation so a straight walk never crosses an exclusion. Narrow lots/corridors may reduce travel below the nominal radius. Do not clip the final animated position in a way that causes jumps. Do not change the Phase 3b homes or initial spots to make a test pass.
- `wanderFrozen({ hovered, dialog, reducedMotion })` is true when any is true.
- Keep the per-villager active clock and freeze/resume calculations pure and testable here if practical. Document the active-time units. No timers inside the helpers.

**`apps/web/app/lib/floor.ts`.**
- In `animate(now, ...)`, move each villager container to its Phase 3b pixel spot plus the constrained wander offset, unless frozen (hovered id, pointer pressed on the token, the id passed by `setFrozen(id)`, reduced motion, hidden document, or pause), in which case it stays where it is. Keep a per-villager active animation clock: resuming continues from the frozen position with no jump. Reduced motion always uses the home spot. Do not let the absolute wall clock skip the token to a different target after a dialog closes or after a hidden tab resumes.
- Provide scene setters for dialog-frozen id, pointer-pressed id, reduced motion and document visibility, as needed. The floor component owns browser APIs; the scene remains usable in the existing unit-test environment.
- Keep the cameo readable: move the token only, never mirror portrait art or text. The mark bobs 2px on a 1.6 s sine for `offer` and `ready`; no bob under reduced motion. Freeze bob as well as movement during hover, pointer press, dialog, hidden tab and pause. Include the live bob displacement in hit/anchor/outline geometry so the mark remains clickable.
- `npcAnchors()` and `anchorBox()` return the moved positions. The existing hover scale, outline and cart behaviour stay unchanged. Updating quest marks/house states with `setVillage` must not reset an NPC's active clock each tick.

**`apps/web/app/components/FactoryFloor.vue`.**
- Read `matchMedia('(prefers-reduced-motion: reduce)')` once and on change; pass it to the scene. Set initial and changed `document.visibilityState` on the scene. Clean up listeners on unmount.
- Refresh hover hit-testing against the saved pointer coordinates while villagers move. When the pointer leaves the floor, clear the saved pointer so a token cannot freeze under an absent pointer. Preserve the existing drag and pinch rules.
- Freeze a token from pointerdown through pointerup/cancel so it cannot escape a click. Clear pressed state on cancel, loss of capture and unmount.
- New prop `frozen?: string` (the `npc:` id whose dialog is open), passed to `scene.setFrozen`. Opening/closing a dialog must not depend on waiting for a camera move.

**`apps/web/app/components/FactoryFrame.vue`.** Pass the open villager's `npc:` id as `frozen`. No other behaviour changes.

**`docs/specs/v8-screen-layout.md`.** Final pass for the whole screen: the 20-column village, 1.4× houses, 384×288 lots, default works-plus-eight-column home camera, villager marks/dialog and constrained wander/freeze, toasts, anchored machine/drone card following pan/zoom/motion (not a pinned corner), tracker, Journal and Shop. Update the One home each table. Remove stale rail, request-selection and duplicated goal descriptions. Keep the editor, status bar and API book prose word for word; edit only references explicitly superseded by ADR 0039 outside those protected sections.

**`CONTEXT.md`.** Update only the Check and Hint entries to match the current UI: checks live in Tests and the persistent tracker (not the removed rail); taking a quest inserts a nudge comment once, handing over a trigger quest inserts an example once, and deleted examples/comments are not restored. Grant/code hints are in the tracker/API book and event feedback in toasts; no new mechanics or glossary terms.

**`docs/art.md`.** Final accuracy pass for the live village renderer: native building art reused at scale 1.4, existing landscape props, unchanged cameo art now moved as tokens. Keep the archive inventory and preservation rules; do not claim archived renderers are live.

**`docs/adr/0024-quest-rail-and-status.md` and `0033-quest-card-stays-still.md`.** Add one sentence to each header: `[ADR 0039](0039-quest-ux-village.md) replaces the rail with the village, the tracker, and the Journal.` Nothing else.

**Optional cheap style cleanup.** Dedupe identical `.quest-action` and `.need` styles between `QuestTracker.vue` and `QuestCard.vue` only if it can be done with a small shared stylesheet and no markup, specificity or visual change. Keep their intentional differences. Skip and say so if it needs restructuring. This is not an acceptance blocker.

### Acceptance

- `wander.test.ts`: nominal offset within radius for every sample over a long range; same who/time gives same result; two villagers differ at the same time; at least 60% idle over a sampled minute; no jump larger than `radius / 4` between 16ms samples. Check wrap/cycle boundaries as well.
- `wanderFrozen` is true for each flag and false for none.
- Sample every villager over at least ten active minutes with the real Phase 3b layout. At every sample, its full marked/bobbing footprint is inside its own 384×288 lot, clear of all house boxes, river/road/spur/lanes, props and fence; every pair of moving footprints is disjoint; each anchor is within 240px of its house base. At least Bram and Ines move nonzero distance, and narrow corridors do not break continuity. No home/spot/layout changes.
- Scene tests (in `wander.test.ts` or existing `floorPick.test.ts` style) cover hover, dialog, pressed pointer, hidden tab and pause separately: the frozen NPC anchor is identical across two `animate` calls, and resuming after a long freeze is continuous within the same per-frame bound. `setVillage` on the next world tick does not reset wander. Reduced motion puts every NPC at its exact home spot, with no bob; motion changes are handled without a wall-clock jump when re-enabled.
- The moved cameo, caption and live marker are pickable through the existing cart-first picker. `anchorBox` follows their moved positions. Pressed-token anchoring remains fixed until release/cancel. Existing cart picking and anchored-card tests remain green.
- Source review verifies media-query/visibility listeners, saved-pointer refresh/leave clearing, pointer capture cleanup, and `frozen` prop wiring.
- Final docs describe the implemented UI, including the anchored card, Check/Hint glossary and art reuse. Editor/status/API prose is preserved, old ADRs receive only the specified sentence.
- `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm sim` pass. After `pnpm sim:report`, `git diff --exit-code docs/sim/report.md` is clean. No deleted files, no art changes, no `packages/sim` or `tests/e2e` changes.

### Do not

- Do not give villagers navigation, sim paths, collision mechanics or routes between lots. Safe visual envelopes are not a new game mechanic.
- Do not let a villager leave its lot or the 240px radius, enter the river or road, overlap the fence, a house, prop or another villager. Do not move houses, props or home spots.
- Do not change portrait art, token size, names, mark meaning/colour, dim rules, dialogue or quests. Do not add animation to machines, drones or grid.
- Do not change the camera, village layout, machine-card content, Journal, shop or toasts. Existing UI interactions stay functional.
- Do not touch `packages/sim`, art files, `components/town`, save format, balance, `world.grid` (16×6), or `tests/e2e`. No browser, dev server, e2e, screenshots or shots.


## Phase 6. Top bar, toasts in the window, a Quest tab

Runs after Phase 5. Comes from Nick's playtest on 25 November 2026 (pt242u). It changes where things sit; it adds no feature beyond the six items below.

### Goal

The top bar reads like a game's navigation: logo, credits, then Journal, Machines and Shop as text links, and on the right Settings and a player block with the level and its XP ring. Toasts leave the field and sit at the bottom right of the window, bigger and readable. The quest tracker overlay leaves the field; the open quest is read in a new Quest tab beside Tests and Console. A new game shows one clear pointer to the first villager. The Journal keeps quests, villagers and their story; the machine list moves to its own Machines dialog. The CPU item on the status bar looks like its neighbours.

### Files

**1. Top bar**

- `components/PackNav.vue`.
  - The brand link keeps `/mark.svg`, `href="/"`, `aria-label="Inherit"` and the classes `pack-brand brand`. The visible text `Inherit` and the gold `.` span are removed from the template. Nothing else is drawn next to the logo.
  - Add one named slot, `account`, rendered after the Settings block. The order inside the bar becomes: brand, default slot, `clock` slot, Settings, `account` slot. The `clock` slot stays in the component for compatibility; FactoryFrame stops using it.
- `components/FactoryFrame.vue`, `#nav`.
  - Remove `<strong class="pack-switch">Kettlewick Works</strong>`. The page title from `useHead` stays `Kettlewick Works · Inherit`.
  - Default slot, in this order: the credits pill (the existing `<p class="pill" data-testid="credits">` with its `Coins` icon, number, title and the floating `gains`), then Journal, then Machines (item 6), then Shop.
  - Journal and Shop stay `<button type="button" aria-haspopup="dialog">` with the same handlers, `ref="journalButton"`, the Journal `aria-label` switch and the new-request gold `.dot`. Their class becomes `nav-link` (replace `nav-btn` everywhere, CSS included). They drop the `BookOpen` and `Store` icons and show only their text from `overlayLabels`. Remove those two imports if nothing else uses them.
  - `.nav-link` CSS: no border, no background, no border-radius, padding `4px 2px`, `color: var(--sub)`, the bar's font, `font-size: 14px`, `font-weight: 600`, `cursor: pointer`, and a 2px bottom border that is `transparent` at rest. Hover and `:focus-visible`: `color: var(--text)`. Active (that dialog is open: Journal while `journalOpen`, Shop while `shopOpen`): `color: var(--text)`, `border-bottom-color: var(--gold)`, and `aria-current="true"` on that button. Disabled Shop (no world yet): `opacity: 0.5`, `cursor: default`, no hover change.
  - The `#clock` template with the centred `.pills` wrapper is removed. The `.pills` rule goes.
  - New `#account` template: one block, `<p class="account" data-testid="level" :title="xp.title" :aria-label="xp.title">`. Inside, left to right: an avatar 32×32px drawn as an inline SVG ring (track circle in `var(--line)`, progress arc in `var(--gold)`, 3px stroke, starting at 12 o'clock, clockwise, length from the XP fraction) around a `User` icon from `@lucide/vue` at 16px on `var(--surface-low)`; then two lines of text: `Level {n}` (13px, 600) and the XP label such as `XP 12/20` (11px, `var(--sub)`, tabular). The level badge and thin bar from the old level pill are replaced by this block; their `.badge` and `.bar` rules stay only if something else still uses them (`.cpu-meter .bar` does).
  - The account block is not a button and has no click handler. No level or profile panel exists in the game, so none is added. No name, no login, no sign-in copy.
  - The `xp` computed moves into the new module (below) as `xpProgress`; FactoryFrame calls it. Its `label` and `title` strings stay exactly as today (`XP 12/20`, `Level 2. 12 / 20 XP.`, and past the last step `XP 140`, `Level 6. 140 XP.`).
- `assets/game.css`: only the `.brand` rule may change, to drop the right border and padding that framed the old wordmark if it now looks detached. No other global rule changes.

**2. Toasts in the window**

- `components/ToastStack.vue`.
  - Same component, props, emits, `TransitionGroup`, `role="status"`, `aria-live`, icons and cameo. Its CSS changes:
  - `.toast-stack`: `position: fixed`, `right: 16px`, `bottom: 37px` (the 25px status bar plus 12px), `width: 340px`, `max-width: calc(100vw - 32px)`, `max-height: calc(100dvh - 65px - 25px - 32px)`, `z-index: 20` (above the field and the editor, below native modals, which sit in the top layer), `gap: 8px`. It still stacks upward and lets clicks through between toasts.
  - `.toast`: `padding: 10px 12px`, `gap: 10px`, `font-size: 14px`, `line-height: 1.4`, `border-radius: 8px`, `box-shadow: 0 4px 16px var(--shadow-light)`. Icons 18px. `.cameo` 40×40px.
- `components/FactoryFrame.vue`: the `<ToastStack>` element leaves `.map-frame` and is placed in the StudioShell default slot (next to the `Teleport`), with the same props and handlers. It renders whether or not a world is loaded, as today.
- `lib/toasts.ts` keeps `visibleLimit = 3`, the queue and the durations. The event kinds in `worldEvents.ts` stay. The only new event is the welcome toast (item 4).

**3. The Quest tab replaces the tracker overlay**

- `components/FactoryFrame.vue`.
  - Remove `<QuestTracker …>` from `.map-frame`. Nothing is drawn over the field's top-right corner any more.
  - The checks pane tablist becomes Quest, Tests, Console, in that order. The new tab is `<button type="button" role="tab" :aria-selected="side === 'quest'">Quest</button>`. While `card?.ready` is true and the Quest tab is not selected, the tab shows the same gold `.dot` the Journal link uses, with the accessible name `Quest, ready to hand over`.
  - `side` becomes `'quest' | 'tests' | 'console'`. The pane's `aria-label` reads `Quest` for the Quest tab. The tablist `aria-label` becomes `Quest, tests and console`.
  - The Quest panel is `<section v-if="side === 'quest'" class="quest-tab" aria-label="Quest">` holding the reused `QuestTracker` component (below), which now also gets the open `quest` and emits `openTests`.
  - `showOpenTest` still selects Tests and the remaining test. A new `openTests()` selects Tests without picking a row.
- `components/QuestTracker.vue` is reused as the Quest tab panel. Same file, same props plus what is listed, same emits plus `openTests`. Move the markup that survives; do not rewrite the component from scratch.
  - **What the tab is.** An in-game quest log, the kind an MMO keeps: who asked, what the quest is called, a few lines of story, and plain objectives with counts. It is not a task tracker and not tests. The hidden tests never appear here. No test names, no test marks, no test counts, no ticket ids, no status pills (`In progress`, `Open`, `Done` badges), no kanban look, no tables.
  - Root element: `<div class="tracker quest-log">` (no longer `aside`, no `aria-label`; the section has it). Remove the overlay CSS: `position`, `top`, `right`, `width`, `max-width`, `max-height`, `z-index`, the overlay background and border. It fills the pane, scrolls inside it, padding `10px 12px`.
  - Remove the fold button, the `open` ref, the `onMounted` read and `toggle`. `inherit.v8.tracker` is no longer read or written. Its helpers in `questTracker.ts` stay exported and tested; leave them. `trackerRows`, `testMark` and `testLabel` are not used in this tab.
  - **Look.** A quest-log page with a parchment feel built from the existing palette and fonts only: entry background `var(--accent-surface)`, 1px border `var(--accent-line)`, radius 7px, a faint inner shadow or a top rule in `var(--accent-shadow)`; title in `var(--accent-soft)`, 15px, 700, Space Grotesk (the body font); story lines 13px `var(--soft)`, italic; objective counts in `var(--mono)`, tabular. Checked objectives use a gold `✓` box (`var(--gold)`), open ones an empty box in `var(--accent-line)`. No new font, no image file, no new colour variable.
  - **A list that holds more later.** The panel renders `<ol class="quest-entries">` with one `<li class="quest-entry">` per entry from `questLog(...)` in the new module (below). Today the array has zero or one entry, and the first entry is expanded. An expanded entry shows its body; a collapsed one would show only its header line. Phase 6 never produces a collapsed entry and adds no toggle, but the template and CSS handle both so two or three entries can stack later without a redesign.
  - **No open quest.** No entries. One quest-log page with: the next step (`step`, for example `Talk to Bram`) in bold, as the existing villager button that emits `visit` when `canVisit` (opens the dialog and centres the map, as today); under it `questTabHint` (`Go and talk to a villager with a gold ! over their head.`); then the existing Journal button. When `step` is `More is coming.`, the hint is not shown.
  - **An expanded entry, top to bottom:**
    1. Header: the giver's portrait (`TownPortrait`, 40px, the same `person` shape `ToastStack` builds from `kettlewick.questList`), the giver's name without `Mayor ` and their role, and the quest title. The header is the existing villager button (emits `visit`).
    2. Story: `quest.quote` in italics (the villager's own line), then `card.goal` as one plain sentence. Both are read from the quest and card; do not write new quest text.
    3. Objectives: a checklist from `questObjectives(card)`. One row per delivery line, label then count, for example `Deliver ingots 0/1` or `Deliver plates 1/1`, ticked when that line is full. Labels are derived in the UI layer from `item`/`qty`/`lines` with the existing `named()` helper in `questNote.ts` (export it if needed; do not change what it returns). The giver's name is not repeated in the label.
    4. Next: `step` as one quiet line with a small `MoveRight` or `Footprints` icon from `@lucide/vue`, then the existing grant line and file link when `granted` is set. No `In progress` text anywhere.
    5. Footer: when `card.ready`, the gold `Hand over` button with `data-testid="complete-quest"` and the one-time pulse (emits `handOver`). Always, at most one small text link `See Tests`: it emits `showTest` when `card.remainingTest` is set (selects that test) and `openTests` otherwise. Nothing else in the footer.
- Hand-over works from the villager dialog (as today), from this tab's Hand over, and from the Journal's Now card. No other path is added or removed.
- `lib/factoryLayout.ts`: `readSideTab` returns `'quest'` for `null` and for unknown values, `'tests'` for `'tests'`, `'console'` for `'console'`, and `'quest'` for `'quest'`. Same key `inherit.v8.side`; the stored value `quest` is the one new value. Update its test.

**4. First open**

- When a world is first shown in a page session with no open quest and nothing handed over (`!world.questId && world.cleared.length === 0`), push one welcome event toast through the existing `pushToasts`, key `welcome`, so `seenToasts` keeps it to once per page session. Its text comes from the new module: the existing next step plus a pointer, `Talk to Bram. Click the gold ! next to the house.`, where the name is taken from `questNextStep` / the first available request, never hard-coded.
- The welcome toast uses the event kind with a new icon key `talk`, mapped to `MessageCircle` in `ToastStack.vue`. It lasts as long as a villager line (7 s): `show()` in `toasts.ts` treats `key === 'welcome'` like `npc`. Hover holds it; a click dismisses it.
- The Quest tab is selected by default when nothing is stored (item 3), so the same step stays readable after the toast leaves.
- Nothing else is added: no tutorial, no overlay, no arrow, no camera move, no extra highlight on the field. The gold `!` marks stay as they are.

**5. Status bar CPU item**

- `components/FactoryFrame.vue`, `.cpu-meter` CSS only. The element, `role="meter"`, `data-testid="cpu"`, `data-tone`, ARIA values, title, `Cpu` icon, the readout and the short bar all stay, in that order: icon, label, bar.
- The item uses the same `.context .item` look as Ln/Col and the tick: `gap: 4px`, the icon right before the text, the text left-aligned, the same 11px mono font and `var(--sub)` colour at rest.
- Remove `width: 148px`, and the readout's `width: 10ch` and `text-align: right`. To keep the caret still when the figures change, give the readout `min-width: 9ch` (left-aligned, tabular). The bar stays 36px after the readout.
- Order on the right of the bar stays as the spec says: drone line, CPU, caret, tick.
- The tones from ADR 0034 stay: gold above 80%, alert colour and alert surface at the limit. `steadyCpu`, the Charts traces from #111 and `cpuMeter.ts` do not change.


**6. Machines get their own link and modal; the Journal keeps quests**

- New `components/MachinesDialog.vue`, in the shape of `ShopDialog.vue`. Its markup is the Machines `<section>` moved out of `JournalDialog.vue` unchanged (the `<ul class="shop-list">` rows with name and detail, the same `openMachine` emit), inside `<GameDialog :title="overlayLabels.machines">`, without the `<h3>` (the dialog title names it). Props: `machines: ReturnType<typeof machineList>`. Emits: `close`, `openMachine`. Copy only the scoped styles that section needs; if `.shop-list` is global, copy nothing.
- `components/JournalDialog.vue`: remove the Machines section, the `machines` prop and the `openMachine` emit. Now, Requests and Done stay exactly as they are, in that order. Nothing else in the Journal changes.
- `lib/gameOverlay.ts`: `GameOverlay` gains `{ kind: 'machines' }`; `openOverlay` and `closeOverlay` handle it like `shop`. Extend `gameOverlay.test.ts` with it.
- `components/FactoryFrame.vue`:
  - Nav order: credits, Journal, Machines, Shop. Machines is a `nav-link` button with `aria-haspopup="dialog"`, `:disabled="!world"`, text `overlayLabels.machines`, `aria-current` while open.
  - `machinesOpen = computed(() => overlay.value.kind === 'machines')`. In the `Teleport`, add `<MachinesDialog v-else-if="machinesOpen && world" :machines="machines" @close="closeSurface" @open-machine="inspectFromJournal" />`. Selecting a row closes the modal and opens the card beside that machine or drone, as the Journal row did.
  - The Journal element drops `:machines` and `@open-machine`.
- The modal contract holds for Machines: one surface at a time, Escape and backdrop close it, focus returns to the Machines link, editor shortcuts wait.
- Docs: in `v8-screen-layout.md`, the Journal lists three sections; Machines is its own dialog from the nav. The "keyboard route" sentence names Journal and Machines.

**The one new module.** `apps/web/app/lib/shellBar.ts` with `shellBar.test.ts`. It holds the new UI strings and these pure helpers:

- `xpProgress(xp: number)`: `{ level, fraction, width, label, title }`, using `levelSpan`; `fraction` is 0–1 and 1 past the last step; `width`, `label`, `title` equal what the inline `xp` computed returns today.
- `xpRing(fraction, radius)`: `{ circumference, dashArray, dashOffset }` for the SVG arc, clamped to 0–1.
- `welcomeToast(world, step)`: a `GameEvent` with key `welcome`, kind `event`, icon `talk`, or `undefined` when a quest is open, something has been handed over, or `step` does not start with `Talk to `.
- `questObjectives(card)`: rows `{ id, text, count, done }` from the card's lines, or its single `item`/`qty`/`shipped`. `text` is `Deliver ` plus `named(item, qty)`, `count` is `shipped/qty` clamped, `done` when full. Old saved contracts use the card's resolved lines and quantities.
- `questLog(quest, card)`: `[]` with no open quest, otherwise one entry `{ id, who, name, role, title, quote, goal, objectives, ready, expanded: true }`. Returns an array so a later phase can pass more.
- `questTabHint`: `Go and talk to a villager with a gold ! over their head.`

`GameEvent`'s `EventIcon` union in `worldEvents.ts` gains `'talk'`. No other change to `worldEvents.ts`.

**Docs.**

- `docs/specs/v8-screen-layout.md`: update the Proportions paragraph (no tracker), Reading order items 1, 2 and 4, the Nav section, replace the Quest tracker section with a Quest tab section, the Toasts section (window corner, sizes, welcome toast), the Status bar CPU sentence only where the look changed, and the One home each table rows that name the tracker, the two pills or the field's zoom controls. Describe the UI as built.
- `CONTEXT.md`: in the Check row, replace "The persistent tracker shows up to three with their marks." with "The Quest tab shows the story and delivery objectives; checks stay in Tests." No other row changes.
- ADR 0039 already carries the amendment for this phase. Do not edit it.

### Acceptance

1. Top bar left to right: logo (mark only), credits pill, Journal, Machines, Shop, then Settings and the account block at the right edge. No `Kettlewick Works` or `Inherit` text in the bar. Journal and Shop have no border or background; hover, focus and the open dialog change colour and the gold underline, with `aria-current` on the open one. The new-request dot still shows.
2. The account block shows the avatar ring, `Level n` and the XP label, with the old tooltip text. It is not clickable. The old centred pills are gone.
3. `xpProgress` reproduces today's `width`, `label` and `title` for 0 XP, mid-level and past the last step; `xpRing` clamps and gives a full arc at 1 and none at 0. Tests prove both.
4. Toasts render outside the field, fixed at the bottom right of the window, 340px wide, 14px text, 10px 12px padding, above the status bar, at most three visible, with the same event kinds, durations, hover hold and click dismiss.
5. No quest overlay on the field. The checks pane has Quest, Tests, Console. With no quest the Quest tab shows the step, the villager button, the hint sentence and Journal. With an open quest it shows one quest-log entry: portrait, name, role, title, the quote and goal, the objective checklist with counts, the next step with any grant line and file link, and the footer. No test names, marks or counts, no ids, no status pills, no `In progress` in the Quest tab. The parchment styling uses only existing variables and fonts.
6. Hand over in the Quest tab completes the quest (same `send({ kind: 'complete' })`), shows only when ready, pulses once, and keeps `data-testid="complete-quest"`. The one `See Tests` link selects the remaining test when there is one, otherwise opens Tests. The gold dot on the Quest tab shows only while ready and not selected.
7. `readSideTab` tests cover null, `quest`, `tests`, `console` and an unknown value.
8. A fresh game shows one welcome toast naming the first giver, once per page session, for 7 s; a loaded game with an open quest or a hand-over shows none. `welcomeToast` tests cover all three cases and the `More is coming.` case.
9. `questObjectives` tests cover a single-item order, a multi-line order (Harrow plate and blank), a full line ticked, an old saved contract, and that labels never contain a test text or the giver name. `questLog` tests cover no quest (empty) and an open quest (one expanded entry).
10. The CPU item: icon, left-aligned label, then the bar, same gap and font as its neighbours, no fixed 148px width; tones and tooltip unchanged; `cpuMeter.test.ts` and `metricHistory.test.ts` pass unchanged.
11. Docs updated as listed. Only the Check row in `CONTEXT.md` changes, and it includes the sentence "The Quest tab shows the story and delivery objectives; checks stay in Tests."
12. The nav has Journal, Machines, Shop as text links. Journal shows Now, Requests and Done only. Machines opens its own modal with the same rows; a row closes it and opens that machine's card beside it. `gameOverlay` tests cover the `machines` kind.
13. The Quest tab renders `<ol class="quest-entries">` from `questLog`; the template and CSS handle an expanded and a collapsed entry; only one expanded entry is ever produced now.
14. `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm sim` pass. After `pnpm sim:report`, `git diff --exit-code docs/sim/report.md` is clean. No deleted files, no art changes, no `packages/sim` or `tests/e2e` changes, `world.grid` still 16×6.

### Do not

- Do not change quests, quest text, rewards, levels, balance, the sim, `FactorySave` or its version, `world.grid`, or `tests/e2e`. No new localStorage key; only the value `quest` for `inherit.v8.side`.
- Do not support more than one open quest. Do not add a collapse toggle or sorting to the Quest tab. Do not edit quest content files to get objective text; derive labels in the UI layer.
- Do not show tests, test counts, ids or status pills in the Quest tab.
- Do not delete any file, component or art. `QuestTracker.vue` is reused, not deleted; `questTracker.ts` stays.
- Do not redraw screens. Move markup and keep classes and `data-testid` values except `nav-btn` → `nav-link`.
- Do not add a profile, login, avatar upload, player name, level panel or any click on the account block.
- Do not add a tutorial system, onboarding steps, arrows, spotlight, camera move or new marks. One welcome toast is the whole of item 4.
- Do not change the Journal (beyond moving Machines out), Shop, villager dialog, machine card, API book, the editor, Tests rows, the Console, the field, villagers, wander or the camera, beyond what is listed.
- Do not change toast timing, count, queue or event kinds, except the welcome toast.
- Do not change CPU behaviour, `cpuMeter.ts`, the Charts panel or the status-bar order.
- No new dependencies. No browser, dev server, e2e, screenshots or shots.

## Phase 7. The machine card becomes a modal

Runs after the polish PR (#120). Comes from Nick's playtest of the Phase 4 card on 25 November 2026 (pt248u). The card opened next to the machine inside the field. It ran out of height, so the actions sat below the fold, and its content was an unstructured pile. In one case two lines ran together: `2 ore + 1 coal → 1 steel` ran straight into `Steel for the bridge unlocks furnace.alloy()`. The selection was also drawn as two separate gold boxes, one round the sprite and one round its name.

### Goal

Clicking a machine, drone or vein, or choosing a row in the Machines dialog, opens its card as a modal over the whole app. It uses the same `GameDialog` as Journal, Machines and Shop: centred, with a dim backdrop, and closed by Escape, its X or a backdrop click. The card is split into labelled sections and fits a 1280×720 window without inner scroll for every machine type. The field keeps the selection while the card is open, drawn as one highlight around the sprite and its label together. The card shows the same data as before and offers the same actions; only the presentation changes.

### Files

**1. The card is a shell modal**

- `components/GameDialog.vue`. Add one optional prop, `wide?: boolean`. When it is set, `.panel` is `width: min(880px, 100% - 32px)`. Without it nothing changes. No other change to GameDialog.
- `components/MachineCard.vue` is reused as the dialog's content. Same file name, same props (`inspected`) and the same `manual` emit. It renders inside `<GameDialog :title="inspected.name" wide @close="emit('close')">`. Remove its own close button and the `closeButton` focus code; GameDialog owns the X, focus and Escape. Its template is reorganised into the sections in item 2. Do not create a second card component.
- `components/FactoryFrame.vue`.
  - Remove the `.machine-card` wrapper from `.map-frame`, along with `cardPosition`, `cardSize`, `frameSize`, `cardInsetCss`, the `watch([mapFrame, machineCard])` measuring block, the `machineCard` ref, the `anchor` shallowRef, the `@anchor` listener on `LazyFactoryFloor`, the `popupMargin`/`popupPlace` import, and the `.machine-card` CSS rule. Keep `mapFrame`: `inspectFromFloor` uses it to find the map as the focus opener.
  - In the `Teleport`, add `<MachineCard v-else-if="inspected" :inspected="inspected" @close="closeSurface" @manual="send({ kind: 'manual', action: $event.id, drone: $event.drone, vein: $event.vein })" />` as the last branch.
  - `modalOpen` becomes `overlay.value.kind !== 'none' || !!inspected.value`, so editor shortcuts wait and `LazyCodeEditor :book-open` is true while the card is open.
  - `selectedId`, `openMachine`, `inspectFromFloor`, `inspectFromJournal` and `closeSurface` keep their meaning. The field's `:selected` still gets `selectedId`, so the selection stays drawn while the modal is open. Closing returns focus to the opener: the Machines link, or the Factory map after a canvas click (the existing `opener` logic).
  - Remove the Escape branch for `.machine-card, .floor` in `shortcut()`; GameDialog's cancel closes the card.
  - Opening Journal, Machines, Shop, the API book or a villager still clears `selectedId` (`showDialog` already does), so only one surface is open at a time.
- `components/FactoryFloor.vue`: remove the `anchor` emit and the code that computes and emits it (`lastAnchor`, the `anchorBox` call, `sameBox`/`screenBox` imports if they become unused). `FloorScene.anchorBox` stays; tests use it.
- `lib/popupPlace.ts`: remove `popupPlace` and `popupMargin` and their cases in `popupPlace.test.ts`. Keep `screenBox`, `sameBox` and `shapeBounds`, which `village.ts`, `floor.ts` and the tests use. The file stays.
- `VillagerDialog.vue` already uses `GameDialog`. It is not the anchored card and does not change.

**2. A clear structure (new module `lib/machineSheet.ts` + `machineSheet.test.ts`)**

`machineSheet(view: InspectView, kind)` takes the `inspectMachine` result unchanged and returns the sections. It reads only what the view has. It never edits sim text; it only regroups it.

- **Header:** an icon for the kind (from `@lucide/vue`: furnace `Flame`, depot `Warehouse`, press and spare `Stamp`, lathe `Cog`, bench `Hammer`, drone `Truck`, vein `Mountain`), the name (the dialog title), and `view.description` as the one-line role under the title (13px `var(--soft)`, one line, ellipsis).
- **State.** Every `line` whose value is `a/b` (whole numbers) becomes a meter `{ label, value, max, text }`: label left, a 4px bar, `a/b` right in mono. They are laid out two per row. Every other line becomes a fact row `{ label, value }`: label in `var(--sub)`, value in `var(--text)`, one line with an ellipsis. `progress`, when set, is one more meter row with its label and percent. Heading: `State`.
- **Recipes:** each unlocked recipe on its own line, `{input} → {output}`, with `Missing {missing}` on the same row, right-aligned and muted, when set. Heading: `Recipes`. Locked recipes are not listed here.
- **Code API:** each action is a row with three parts. The first line has the action's button label and the `api` signature in mono (`var(--accent-soft)`). The second line has `reason` as the short description. While `enabled`, the row is the existing manual button and emits `manual` exactly as today; when not enabled, the button is disabled. Heading: `Code API`.
- **Locked:** recipes with `locked`, and actions that are disabled with a `reason` starting with `Unlocks`, move here under a `Locked` heading. Each one is a muted row: the recipe text or the action label with its mono `api` on one line, then the unlock reason on its own line. A locked action is still a disabled button, so nothing new becomes clickable. The section is omitted when empty.
- Empty sections are omitted. Text is never joined into one string; each value is its own element, so the run-together bug cannot recur.
- **Layout.** The dialog body is a grid. From 860px of panel width (the `wide` panel at a 1280px window), use two columns: left State and Recipes, right Code API and Locked, with the header above both. Below that width, one column in the same order.
- **Fit.** Export fixed row heights: `heading 18`, `meter 22`, `fact 20`, `recipe 20`, `api 40`, `locked 36`, `progress 22`, `gap 8` between sections. The CSS uses exactly these heights (fixed `height` and `overflow: hidden` with an ellipsis on single-line text, two fixed lines for API and locked rows). Two meters share one 22px row. Export `sheetHeight(sheet, columns: 1 | 2)`, the tallest column in px. The 1280×720 budget: GameDialog's panel is `min(80dvh, 720px)` = 576px, minus the 44px header and 24px body padding, minus the header strip (44px), which gives **464px** per column. Export `fitBudget = 464`.
- `MachineCard.vue` renders only what `machineSheet` returns. Do not compute anything in the template.

**3. One highlight per selected object**

- `lib/floor.ts`, `strokeId`. Instead of stroking each shape of the footprint, stroke one rounded rect (radius 8) around the union of all its shapes, `shapeBounds(shapes)` from `popupPlace.ts`, grown by `style.grow`. This applies to hover and selection, and to every selectable kind: stations, carts and villagers. Remove `strokeShape` if nothing else uses it; keep `strokeBox`. Colours, widths and alphas (`selectionStroke`, `hoverStroke`) stay. Picking (`pickFloor`, footprints) does not change; only the drawing does.

**4. Docs**

- `docs/specs/v8-screen-layout.md`. Replace the anchored-card sentences (Proportions, Works and the One home each row "Card beside the selected machine or moving drone") with the modal: a 880px GameDialog over the app, the sections, two columns at 1280px, and one highlight around sprite and label. Update the Machines-dialog sentence that says a row opens the card "beside" the machine.
- `docs/adr/0039-quest-ux-village.md`: already amended in the plan commit. Do not edit it.

### Acceptance

1. A field click on a machine, drone or vein, or a Machines dialog row, opens MachineCard inside GameDialog (`wide`) over the app, in the `Teleport`. Nothing is drawn in `.map-frame`. Escape, the X and a backdrop click close it, and focus returns to the opener. `modalOpen` is true while it is open. Opening any other dialog clears it.
2. The field keeps `selected` while the card is open, and the highlight stays drawn.
3. `machineSheet` tests cover the furnace (meters for hopper ore, coal, ingots and steel; two recipes; alloy and its recipe under Locked before Steel for the bridge, and under Recipes and Code API after), the depot, the press, the spare press, the lathe, the bench, both drones (one idle, one with a task and progress), and every vein. For each, the State, Recipes, Code API and Locked contents match the `inspectMachine` data with nothing dropped. No recipe row contains a lock sentence.
4. Fit test: for every machine type, in an early world and in a late world with all machines installed, two drones and everything unlocked, `sheetHeight(sheet, 2) <= fitBudget`. The test lists each case by name.
5. Sections without content are omitted. The header shows the kind icon, the name and the one-line role.
6. Manual actions behave as before: same `manual` emit payloads, disabled with the same reasons, and the card stays open after an action.
7. Selection and hover draw one rounded rect around the whole footprint for stations, carts and villagers. A test on `FloorScene` checks that selecting the furnace, a cart and a villager each adds exactly one stroked shape to the ring (or one `roundRect` call), and not one per footprint shape.
8. `popupPlace` and `popupMargin` are gone with their tests. `screenBox`, `sameBox`, `shapeBounds` and `FloorScene.anchorBox` remain, and their tests pass. The `anchor` emit and all card-placement code in FactoryFrame and FactoryFloor are gone.
9. VillagerDialog, Journal, Machines, Shop and the API book are unchanged apart from the shared `wide` prop default.
10. Docs updated as listed.
11. `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm sim` pass. After `pnpm sim:report`, `git diff --exit-code docs/sim/report.md` is clean. No deleted files, no art changes, no `packages/sim` or `tests/e2e` changes, `world.grid` still 16×6.

### Do not

- Do not change `inspectMachine` or anything under `packages/sim`, including the sentences it returns, action ids, API names and signatures. Do not change balance, quest content, save format, `world.grid` or `tests/e2e`.
- Do not delete files or art, or edit art files. `popupPlace.ts` and `popupPlace.test.ts` stay as files.
- Do not rewrite GameDialog or the dialog system, beyond the one `wide` prop. Do not change other screens or dialogs.
- Do not add actions, tabs, buttons, tooltips, pinning, drag, or a second card component. Do not change what any action does.
- Do not change picking, hit areas, hover scale, highlight colours or widths. Change only how the highlight shape is drawn.
- No new dependencies, no new localStorage keys. No browser, dev server, e2e, screenshots or shots.

## Phase 7b. Machine modal polish

Runs after Phase 7 (#121). Comes from Nick's playtest of the Furnace modal on 25 November 2026 (pt249u). The card fits, but it reads like things thrown into a box:

- The header is just the title and a gold-outlined X, with a tiny flame and the role line under it.
- The State bars are thin and dim, and the left column is mostly empty.
- Code API rows look like disabled buttons.
- Locked says the alloy unlock three times.

This is a polish of `MachineCard.vue`, `machineSheet.ts` and the shared `GameDialog.vue`, not a rewrite.

### Goal

Opening a machine feels like a game:

- The dialog slides down into place.
- Its header shows the machine itself, as drawn on the field, with its name, kind, role and a status chip.
- The sections breathe on an 8px scale, and stock reads as coloured bars.
- Recipes read as item chips with an arrow.
- Code API is plainly documentation ("Call these from your code.") and cannot be mistaken for buttons.
- Each locked thing is listed once.
- The existing manual actions (Smelt, Collect, Unload…) stay available as real buttons in one clearly separate Actions bar.
- Closing is obvious: a normal X, Esc, and a muted "Esc to close" hint.
- Every machine type still fits a 1280×720 window without inner scroll.

### Files

**1. Open and close motion (shared, `components/GameDialog.vue`)**

- **Open:**
  - The panel animates from `opacity: 0; transform: translateY(-24px)` to `opacity: 1; transform: none` over 220ms `ease-out`.
  - The `::backdrop` fades in over the same 220ms.
  - Use CSS on the open dialog (`@starting-style` with `transition`, or a keyframe animation on `.shade[open] .panel` and `.shade[open]::backdrop`). No JS timers for opening.
- **Close from inside the dialog:**
  - Escape (the `cancel` event), the X and a backdrop click no longer emit `close` at once.
  - GameDialog adds a `closing` class that reverses the motion over 160ms `ease-in`, then emits `close` on `animationend`/`transitionend`, with a 200ms fallback timer.
  - A second close request while closing is ignored.
  - When the parent removes the dialog for another reason (another dialog opens), it unmounts immediately as today.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, only opacity animates (no translate). Durations stay.
- **Initial focus and the X:**
  - Remove `autofocus` from the X. Put `tabindex="-1"` and `autofocus` on `.panel`, so `showModal()` focuses the panel and no ring shows on the X when it opens.
  - The X is a plain icon button: no border or outline at rest, hover `background: var(--hover)`, and `:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px }` for keyboard focus only. `.panel:focus { outline: none }`.
  - Its accessible name stays.
- **`wide` panel:** `width: fit-content; min-width: min(640px, 100% - 32px); max-width: min(880px, 100% - 32px); max-height: min(92dvh, 760px)`. Panels without `wide` are unchanged apart from the motion and the X styling.
- Nothing else in GameDialog changes. Journal, Machines, Shop, the villager dialog and the API book get the motion through it with no edits of their own.

**2. The header shows the machine (`MachineCard.vue`, `lib/floor.ts`, `components/FactoryFloor.vue`, `components/FactoryFrame.vue`)**

- **`FloorScene.artFor(id)`:** returns the display object that draws that object's art on the field, without its caption, selection ring, progress or cargo bars, badges or work glow.
  - Covers furnace, depot, press, spare, lathe, bench, each cart (the `truck` drawing) and each vein (its rock).
  - Keep references when the art is built. Do not draw anything new and do not change what the field shows.
- **`FactoryFloor.vue`:**
  - `defineExpose({ snapshot })`, where `snapshot(id): Promise<string | undefined>` returns `app.renderer.extract.base64({ target: art, resolution: 2 })` for `scene.artFor(id)`.
  - It returns `undefined` when there is no renderer or art. Errors are caught and give `undefined`.
- **`FactoryFrame.vue`:**
  - Keep a `ref` to the floor component. When `selectedId` becomes a machine id, call `snapshot(id)` and store the result in `cardSprite`, cleared on close.
  - Pass `:sprite="cardSprite"` to MachineCard. The card works without it (the plate stays empty).
- **The MachineCard header**, on one row:
  - **Left:** a 112×112px plate with `background: var(--floor-base)`, a 1px `var(--line)` border, radius 8px, and the sprite centred as `<img alt="" style="image-rendering: pixelated">` at up to 96px, `object-fit: contain`.
  - **Right**, top to bottom:
    - The name at 22px, weight 700.
    - A kind line at 12px in `var(--sub)`: `Machine` for furnace, depot, press, spare, lathe and bench; `Cart` for drones; `Vein` for veins.
    - The role sentence (`view.description`) at 13px in `var(--soft)`, up to two lines.
    - A status chip.
- **Status chip**, from `machineStatus(view)` in `machineSheet.ts`:
  - When `view.progress` is set: the progress label (for example `Smelting`), tone `working` (gold).
  - Otherwise, when a `Task` line exists and is not `idle`/`none`: that task, tone `working`.
  - Otherwise `Idle`, tone `idle` (grey).
  - No other data. The chip is a `<span>`, not a button.
- GameDialog's own title stays as the accessible name. Visually the header row carries the name, so set GameDialog's `h2` to the visually-hidden style only when `wide` is set.

**3. Layout and spacing**

- **Spacing:** an 8px scale. Dialog body padding 24px, 24px between sections and 8px between rows.
- **Section headings:** 12px, `font-variant: small-caps` (or uppercase), `letter-spacing: 0.08em`, `var(--sub)`, with a 1px `var(--line)` divider under them and 8px below.
- **Columns:**
  - Two columns, left State and Recipes, right Code API and Locked, when both sides have content.
  - When the right side is empty (the depot) or the sheet is small, use one column. `machineSheet` decides with `sheetLayout(sheet)`, which returns `1 | 2` from the column heights: two columns only when both are non-empty and the taller is at most 1.6× the shorter. Otherwise one column, unless one column would not fit, then two with State split across them.
- **Width:** follows the `wide` panel (shrinks to content between 640 and 880px).

**4. State**

- Each stock row:
  - A 10px dot in the resource colour (the item names ore, coal, ingot, steel, grate, plate, blank, gear, pin, hinge, shutter, crate and cargo, mapped in `resourceColor(label)` with a neutral fallback), then the label.
  - An 8px rounded bar filled in the resource colour on `var(--accent-shadow)`.
  - The count right-aligned in mono tabular numbers.
- Rows are 28px, one per line (no longer two per row).
- **A full bar** (`value === max`, `max > 0`): the count is in `var(--gold)` and the bar has a 1px gold glow (`box-shadow: 0 0 6px`).
- **Fact rows** (label and value): 24px, label in `var(--sub)`, value in `var(--text)`.
- **Progress** is one more 28px bar row in gold with its percent.
- Resource icons: the field's material art is not exported as DOM images, so dots are the icon. Do not add art.

**5. Recipes**

- Each unlocked recipe is one 32px row:
  - Input chips, `→`, then the output chip.
  - A chip is a 24px rounded pill on `var(--surface-raised)` with the resource dot, the quantity and the item name, from `recipeChips(text)` parsing `"2 ore + 1 coal"` into `[{ qty: 2, item: 'ore' }, { qty: 1, item: 'coal' }]`. Unparseable text becomes one plain chip with that text.
  - On the right, the call in mono `var(--sub)`, from `recipeCall(view, recipe)`, using the API book entries:
    - A furnace `ingot` → `furnace.smelt()`, `steel` → `furnace.alloy()`.
    - Press, spare, lathe and bench recipes use the shown signature of the brick `<machine>.<recipe id>` up to `:` (for example `press.start("grate")`).
    - When none is found, no call is shown.
- `Missing …` (existing data) is a muted line under the row, 18px, when set.
- Locked recipes are not here (item 7).

**6. Code API is documentation**

- Under the heading, one line at 12px in `var(--sub)`: `Call these from your code.`
- Each action is a flat `<li>`, not a button: no border, no background, no hover, no cursor, no tabindex, and 44px tall. It shows:
  - Line 1: the `api` signature in mono `var(--accent-soft)`.
  - Line 2: a plain description, the first sentence of the matching API book entry's `doc` (match the entry whose id is the signature up to `(`, for example `furnace.smelt`), falling back to `reason`.
  - On the right: a readiness tag, `Ready` (mint) when `enabled`, otherwise the action's `reason` (muted), for example `Needs 2 ore`.
- **One optional link**, at the right of the heading: a small text link `API`, which emits `api` with the API book section id for this kind:
  - furnace → `furnace`, press and spare → `press`, lathe → `lathe`, bench → `bench`, drone → `drone`, depot → `depot`, vein → `veins`.
  - FactoryFrame handles it with `selectSection(id)` and `showDialog({ kind: 'api' })`. Opening the book closes the card as any other dialog does.
  - Nothing else in the Code API section is clickable.
- **The existing manual actions keep working.** They are not removed. They move to an **Actions bar** at the bottom of the card:
  - A row of real buttons, one per enabled-or-disabled non-locked action, labelled with `action.label` (Smelt, Collect, Clear hopper, Mine, Unload, Dump).
  - Each emits `manual` with the same payload as today, and is `disabled` with `title` and `aria-describedby` set to the reason when not enabled.
  - Buttons use the existing `.calm`/default button style with a border, so they read as buttons.
  - This is the same set of actions as before, presented separately. No new action is added.
- **Footer**, under the Actions bar: on the left the hint `Esc to close` (12px, `var(--sub)`), and on the right the action buttons. When a machine has no manual actions, the footer is just the hint.

**7. Locked: one entry per thing**

- `lockedEntries(view)` merges a locked recipe and a locked action that name the same function (the recipe's `locked` text contains the action's `api`, or the recipe is that action's recipe through `recipeCall`) into **one entry**. The entry has:
  - A lock icon (`Lock` from `@lucide/vue`).
  - The action label and its mono signature, for example `Alloy furnace.alloy()`.
  - The recipe as chips.
  - One line `Unlocks after: <title>`. The title comes from the recipe's `locked` text before ` unlocks `, or the action's reason after `Unlocks with `.
- Unmatched locked recipes or actions get their own single entry in the same shape.
- Neither the recipe's lock sentence nor the action's `Unlocks with …` reason is shown anywhere else. The quest title appears exactly once in the whole card.
- Locked entries are muted (`opacity: 0.7`) and never clickable. A locked action is not in the Actions bar.

**8. Close**

- See item 1 for the X and focus.
- The footer hint `Esc to close` is in item 6.

**9. Fit for every machine type**

- Update `rowHeight` in `machineSheet.ts` to the new heights:
  - `heading 28` (with divider)
  - `intro 20` (the Code API line)
  - `meter 28`, `fact 24`, `progress 28`
  - `recipe 32`, `missing 18`
  - `api 44`, `locked 64`
  - `section gap 24`
- Export `headerHeight = 112`, `footerHeight = 48` and `fitBudget`, computed as the 1280×720 panel (`min(92dvh, 760px)` = 662px) minus the 44px title bar, the 48px body padding, the header, a 24px gap and the footer. That gives **386px** per column.
- `sheetHeight(sheet, layout)` uses these heights. The CSS uses exactly these values: fixed heights with ellipsis on single-line text.
- **Tests:**
  - For every machine type in the early and late fixtures from Phase 7 (24 named cases), `sheetHeight(sheet, sheetLayout(sheet)) <= fitBudget`.
  - The layout chosen for each case is listed in the test names or the PR table.

**Docs.** In `docs/specs/v8-screen-layout.md`, update the machine card paragraph:

- The slide-down motion shared by every dialog.
- The header with the field sprite, kind and status.
- The sections and their look.
- Code API as documentation with the one API link.
- The Actions bar.
- Locked entries listed once.
- The Esc hint.

Do not edit ADR 0039.

### Acceptance

1. Every GameDialog opens with the 220ms slide-and-fade and backdrop fade. X, Esc and backdrop play the 160ms reverse before `close` is emitted. Reduced motion fades only. A second close request during closing is ignored. Opening another dialog still replaces the current one immediately.
2. On open, the X shows no ring. It shows a ring only on keyboard focus. It has no outline at rest and its accessible name is unchanged.
3. The card header shows the field sprite on a 112px floor-colour plate (pixelated), the 22px name, the kind line, the role and the status chip. `artFor` is covered by a FloorScene test for every kind (furnace, depot, press, spare, lathe, bench, a cart, a vein): it returns art and none of its descendants are `Text`. `machineStatus` tests cover progress, task and idle.
4. Spacing and headings follow the scale. `sheetLayout` tests cover a two-column furnace and a one-column depot, and show the 1.6× rule.
5. State rows show the dot, label, 8px bar and right-aligned count. Full bars are gold. `resourceColor` maps every item named in the recipes and stock lines and falls back to neutral.
6. `recipeChips` tests cover `2 ore`, `2 ore + 1 coal`, `1 plate + 1 pin`, `1 cut plate` and an unparseable string. `recipeCall` tests resolve every recipe of every machine type to its call, or to none, and name each case.
7. Code API rows contain no `button`, `a` or `tabindex` (a template test is not available, so assert in `machineSheet` that api rows are data only and check by source review). The intro line is present. The readiness tag is `Ready` or the existing reason. The description comes from the API book doc or falls back to the reason. The only link is `API`, which opens the API book at the right section.
8. The Actions bar has exactly the non-locked actions of `inspectMachine`, with the same `manual` payloads, disabled states and reasons as before. No action is added or removed. A test compares the action ids per machine type with the Phase 7 set.
9. For the furnace before Steel for the bridge, `lockedEntries` returns one entry, Alloy `furnace.alloy()`, with chips `2 ore`, `1 coal` → `1 steel` and `Unlocks after: Steel for the bridge`. A test asserts the string `Steel for the bridge` appears exactly once across the whole sheet's rendered strings. After the unlock, there are no locked entries and Alloy is in Code API and the Actions bar.
10. The fit test passes for all 24 cases against the 386px budget with the chosen layout.
11. Docs updated.
12. `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm sim` pass. After `pnpm sim:report`, `git diff --exit-code docs/sim/report.md` is clean. No deleted files, no art changes, no `packages/sim` or `tests/e2e` changes, `world.grid` still 16×6.

### Do not

- Do not change `packages/sim`, including `inspectMachine`, its sentences, action ids, API names and signatures, or the API book data. Do not change balance, save format, quest content, `world.grid` or `tests/e2e`.
- Do not add art, edit or delete art files, or draw new shapes for the sprite. Reuse the field's display objects.
- Do not add actions or buttons that do new things. The Actions bar holds exactly the existing manual actions. The `API` link is the only new clickable element.
- Do not rewrite GameDialog or the dialog system beyond the motion, the X styling, initial focus and the `wide` sizing. Do not change other dialogs' content or other screens.
- Do not change what the field draws, picking, highlights or the camera.
- No new dependencies, no new localStorage keys. No browser, dev server, e2e, screenshots or shots.

## Phase 8. Playtest polish: code jobs, levels, machine card v3, toasts

Runs after Phase 7b (#122). This comes from Nick's playtest on 25 November 2026 (pt251u):

- He did not see that Ines's job needs code.
- The XP display looked as if levels never grow.
- A level-up deserves a central moment.
- The machine card still felt clumsy: a strip that only holds the X, a sloppy Locked section, too much width, and a dark cover over the whole game.
- Toasts at the bottom right sit over the IDE and go unnoticed.

All changes are UI only and build on the existing components: `GameDialog`, `dialogMotion`, `MachineCard`, `machineSheet`, `QuestTracker`, `ToastStack`, `PackNav`, `shellBar` and `worldEvents`.

### Files

**1. Ines's job says it needs code (`lib/shellBar.ts`, `lib/worldEvents.ts`, `components/QuestTracker.vue`, `components/VillagerDialog.vue`, `lib/machineSheet.ts`, `components/MachineCard.vue`, the nudge-comment path in `components/FactoryFrame.vue`)**

The sim is unchanged. Manual Unload sends raw ore to the furnace, and ingot or steel to the depot (`beginUnload`). Only code can unload ore at the depot.

- **Mark code jobs in the UI.** In `shellBar.ts`, add `codeJob?: true` to the `questGoals` entries that need code. Today that is `ines` only. Export `isCodeJob(questId)`.
- **The Ines goal and hint.** The goal becomes `Write code to mine vein D and unload 3 ore at the depot.` The hint becomes `The Unload button only goes to the furnace. Use drone.unload(depot) in your code.`
  - The existing rule still holds: no code identifier in any goal line, and the test still runs.
  - Where hints are rendered (QuestTracker and anywhere else `questGoal(...).hint` shows), call-like tokens in the hint render as `<code>`. A call-like token matches `/[a-z]\w*\.\w+\([^)]*\)|\b[a-z]+[A-Z]\w*\b/`, so Bram's `smeltOnce` becomes code too.
  - Use a pure `hintParts(text): { text: string; code: boolean }[]` in shellBar, with tests.
- **The villager dialog.** For a code job, VillagerDialog shows one muted line under the existing need: `This job is done in code.`, from `shellLabels`. Quest content (`ask`, `need`, `why`, `nudge`) is not edited.
- **Toast on Take.** In `worldEvents`, when a code job is taken (the existing `taken:` branch), also announce `{ icon: 'unlock', key: 'code:' + quest.id, text: 'Run is unlocked. This job is done in code.' }`. Add a worldEvents test.
  - Run (the ▶ glyph next to a function) is unlocked by Bram's reward. It has no attention or highlight treatment today, so do not add one.
- **The nudge comment.** Taking a quest already inserts its nudge comment once (`questComment(quest.from, quest.nudge)` in FactoryFrame). For a code job, this existing path adds one more comment line after the nudge: `// Example: if (!drone.busy) drone.unload(depot)`. Use the same insert-once rule. Do not build any new starter mechanism.
- **The drone Unload label.** In `machineSheet`, the drone action `unload` is shown as `Unload to furnace` when the `Cargo` line is not `ingot` or `steel`, and `Unload to depot` when it is. This is the same rule as `beginUnload`.
  - The Actions bar and Code API rows show the new label. The `manual` payload is unchanged.
  - For drones only, one muted 18px line sits under the Actions bar: `Depot: only from code, drone.unload(depot)`, with the call in a code span.
  - Tests cover the label for empty, ore, coal and ingot cargo.

**2. XP shows the running total (`lib/shellBar.ts`, the account block in `FactoryFrame.vue`)**

- The XP thresholds `[10, 20, 40, 85, 140, 170]` are cumulative and stay as they are.
- `xpProgress(xp)` keeps `fraction` and `width` span-based for the ring.
- `label` becomes `<xp> / <next> XP`, the total XP over the next threshold.
- `title` becomes `Level <n> · <xp> / <next> XP`.
- At max level, the label is `Max level` and the title is `Level <n> · Max level · <xp> XP`.
- The account block shows `Level <n>` and the new label.
- Tests: 0 XP gives `Level 1 · 0 / 10 XP`, 10 gives `Level 2 · 10 / 20 XP`, 25 gives `Level 3 · 25 / 40 XP`, and 170+ gives max level. The ring fraction for 10 and 15 is 0 and 0.5.

**3. The level-up moment (new `components/LevelUpDialog.vue` on GameDialog, `lib/levelUp.ts`, `FactoryFrame.vue`)**

- **`levelUnlocks(level, quests)`** returns real data only:
  - For each quest with `needLevel === level`, the line `New quest: <title> from <Name>`. The name is `from` without `Mayor `, as in worldEvents.
  - The shop has no level gating today, so it adds nothing.
  - When the list is empty, the result is `{ lines: [], next }`, where `next` is the smallest `needLevel > level`, or undefined.
- **`LevelUpDialog`** uses GameDialog with no `wide`, so it gets the shared motion and the reduced-motion fade. It shows:
  - The title `Level <n>`.
  - One line: `You reached level <n>.`
  - The unlock list, or `Keep going. New work opens at level <next>.` (or `Keep going.` when there is no next).
  - One primary button `Got it`. Enter and Esc close the dialog. Enter is handled on the dialog, so it works with focus on the panel.
- **Wiring.** FactoryFrame removes `level` events from the toast batch before `pushToasts`, so there is no level toast. It still adds their keys to `seenToasts`. Each new level key sets `levelUp = n` (the highest new level if two arrive at once).
  - The dialog renders in the existing Teleport chain after the other dialogs. It shows only when no other overlay or card is open, and it waits until they close.
  - `modalOpen` includes it.
  - Nothing new is stored. Events are only produced for live changes (`worldEvents` returns nothing without `prev`, which is the load case), so loading an old save never replays past levels. `seenToasts` stops repeats in the session. A new game resets them as it does today.
  - Pure tests in `levelUp.test.ts`:
    - the unlock lines for levels 2 to 7 from `questList`
    - the empty case with `next`
    - `pickLevelUp(events, seen)`, which returns the level to show and marks it seen, so a level shows once, never on load, and two at once pick the highest

**4. Machine card v3 (`GameDialog.vue`, `MachineCard.vue`, `machineSheet.ts`, `FactoryFloor.vue`, `FactoryFrame.vue`, new `lib/cardPlace.ts`)**

- **No title strip.** For `wide`, GameDialog drops the 44px header band. The X becomes a 32px icon button absolutely placed at the top-right of the panel (12px inset). It keeps its accessible name and focus-visible ring. The `h2` stays visually hidden. Non-wide dialogs are unchanged.
- **The sprite breaks out of the card.**
  - For `wide`, the panel and body use `overflow: visible`. That is safe because the fit budget guarantees no scroll.
  - The sprite plate is 120×120px and pulled up by 32px (`margin-top: -32px` relative to the body's top padding), so it overlaps the panel's top border.
  - It keeps the floor colour, the 1px line border, radius 8px, a soft drop shadow, the 2× extract and `image-rendering: pixelated`.
  - Name (22px), kind, role and status chip sit to its right. The header row takes 88px in flow.
  - The wide panel `max-height` becomes `min(86dvh, 720px)`, which leaves room above for the overlap at 720px tall.
- **Locked is compact.** `lockedEntries` rows become:
  - the lock icon
  - the thing's name (action label, or recipe output) plus its mono call if there is one
  - one muted line, either `Unlocks with <quest title> (<Name>)`, looked up from `questList` by title, or `Level <n>` when the lock is by level
  - No chips and no boxes. Rows are 44px. At most 4 rows show, then one muted row `+<n> more`. The section is hidden when nothing is locked.
  - Tests: the furnace before Steel for the bridge shows exactly `Unlocks with Steel for the bridge (Odile)` once, and five locks show four rows plus `+1 more`.
- **Debug.** No Debug disclosure exists in MachineCard or GameDialog on main. Do not add one. If one exists under another name, make it a collapsed `<details>` with a `Debug` summary at the bottom of the right column: `max-width: 420px`, monospace, `max-height: 160px; overflow: auto`, and it never widens the panel.
- **Width.** The wide panel is `width: fit-content; min-width: min(600px, 100% - 32px); max-width: min(820px, 100% - 32px)`.
- **A light cover.** For `wide`, the `::backdrop` is `rgba(8, 8, 9, 0.35)` with no blur, so the floor and the selected machine's existing outline stay visible. Other dialogs keep their backdrop.
- **Keep the card off the machine.**
  - `cardSide(machineCenterX, viewportWidth)` in `lib/cardPlace.ts` returns:
    - `'center'` when `viewportWidth < 1100` or the x is unknown
    - `'right'` when the machine centre is left of the viewport middle
    - `'left'` otherwise
  - GameDialog gets an optional `side?: 'left' | 'right' | 'center'` prop. `right` aligns the panel to the right with a 24px margin, `left` mirrors that, and the vertical position stays centred.
  - `FactoryFloor` exposes `anchorRect(id)`, the viewport rect of `scene.anchorBox(id)` offset by the canvas's `getBoundingClientRect()` and camera, as the old popup code did.
  - FactoryFrame computes the side when the card opens, passes it to MachineCard, and MachineCard passes it to GameDialog. A card opened from the Machines dialog, with no rect, is centred.
  - Tests cover `cardSide` for the left, right and narrow cases.
- **Fit.** Update `rowHeight` (locked 44, plus a `more` row of 24) and set `headerHeight = 88`, with no title bar. `fitBudget` is the 1280×720 panel (`min(86dvh, 720px)` = 619px) minus 48px padding, the 88px header, a 24px gap and the 48px footer (plus 18px for drones). That gives **411px**.
  - All 24 cases from Phase 7 and 7b pass against it with their chosen layout.
  - The PR lists each case's height.

**5. Toasts at the top centre of the floor (`components/ToastStack.vue`, `FactoryFrame.vue`)**

- **Position.**
  - Render the ToastStack inside `.map-frame` (give it `position: relative` if needed), or position it from the map frame's rect. The stack sits at the top centre of the floor area: 12px under its top edge, centred over the floor, never over the IDE.
  - Width `min(400px, 100% - 24px)`.
  - Up to 3 toasts (the existing limit), newest on top, with an 8px gap.
- **Look.**
  - The background, border, radius and shadow match the GameDialog panel.
  - 15px text, line-height 1.4, 12px by 14px padding.
  - The icon is 20px. The villager cameo is a fixed 40×40 square, vertically centred (`align-items: center`) with the same padding as icon toasts and no odd offset.
- **Motion.** Enter slides down from `translateY(-12px)` with a fade over 240ms ease-out. Leave fades up over 180ms (TransitionGroup leave classes). Under reduced motion, opacity only.
- **Unchanged.** Toast kinds, keys, timers, hover hold, click to dismiss and the once-per-session welcome. Update any tests that assert the position.

**Docs.**

- `docs/specs/v8-screen-layout.md`:
  - The Toasts section: position, size and motion.
  - The machine card paragraph: no title strip, the break-out sprite, compact Locked, the light cover and side placement, the 820px width.
  - The new level-up dialog.
  - The XP label.
  - The table row for toasts.
- `CONTEXT.md`: one sentence each where behaviour changes. The Hint row mentions the code-job example line, and a glossary line covers the level-up dialog if levels are defined there.
- ADR 0039: one amendment sentence "after the 25 November playtest" covering the level-up dialog, the toasts' new place and the card v3.

### Acceptance

1. The Ines goal and hint read exactly as above. Hints render call-like tokens as code. No goal line has a code identifier (the existing test). The villager dialog shows `This job is done in code.` for Ines only. Taking Ines toasts `Run is unlocked. This job is done in code.` once. The nudge path adds the example line once. Drone Unload reads `Unload to furnace` or `Unload to depot` by cargo, with the depot line under the Actions bar. The `manual` payloads are unchanged.
2. The XP label and title show the total over the next threshold, or `Max level`. The ring stays span-based. Tests cover this.
3. A level-up opens one centred LevelUpDialog with real unlock lines or the keep-going line, and `Got it`. Enter and Esc close it. There is no level toast. It never shows on load and shows once per level. Tests cover `levelUnlocks` and `pickLevelUp`.
4. The wide card has no title strip, and the X sits top-right in the header. The 120px sprite overlaps the top edge by 32px and is pixelated. Locked is compact (max 4 plus `+N more`, hidden when empty) with no repeated text. The width is 600 to 820px. The backdrop is 35% with no blur. The side placement follows `cardSide` (tested). The fit test passes for all cases at 411px.
5. Toasts sit at the top centre of the floor, 400px wide, at 15px, newest on top, max 3, with the new motion and a centred square cameo. Kinds, timers and the welcome are unchanged.
6. Docs updated as listed, with one-sentence amendments only.
7. `pnpm test`, `pnpm typecheck`, `pnpm build` and `pnpm sim` pass. After `pnpm sim:report`, `git diff --exit-code docs/sim/report.md` is clean. No deleted files, no art changes, no `packages/sim` or `tests/e2e` changes, and `world.grid` is still 16×6.

### Do not

- Do not change sim balance, the XP steps, quest xp, pay or `needLevel`, the manual Unload rules, or anything under `packages/sim`, including quest text, API names and the API book.
- Do not add multi-quest.
- Do not delete or edit art, and do not rewrite components from scratch. Extend the listed ones. `LevelUpDialog` is the only new component.
- Do not add browser, e2e or screenshot tests, or new dependencies.
- Do not touch unrelated screens.
- Do not add features not listed: no sounds, no achievements, no tutorial framework, no new toast types beyond the one code-job line, no new run-button highlight, no new storage keys.
- Do not change the wordmark or the top bar order.

## Final documentation gate

No open product question blocks these phases. Nick playtests the completed UI and may adjust appearance; agents do not playtest. Before each PR, compare its base to current main, check that no art or component file is deleted, and include all five allowed command results. A phase is not done because scaffolding exists: each named interaction must be wired to the existing commands, and each decision helper must have the listed tests. Record any unmet criterion explicitly rather than calling the phase complete.
