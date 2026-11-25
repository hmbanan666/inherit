# Plan: quests live in the village

Implements [ADR 0039](../adr/0039-quest-ux-village.md). Six PRs, in this order. Each one ships on its own, leaves the game playable, and is merged before the next one starts.

| # | PR | Depends on |
| --- | --- | --- |
| 1 | Top bar, Journal and Shop modals, quest tracker, machine card as a pinned popup. The left rail is removed. | main |
| 2 | Toasts and the world events behind them. | 1 |
| 3 | The village band on the field: houses, villager tokens, marks, hit-testing, the villager dialog. | 1, 2 |
| 4 | The machine card anchored next to the machine or drone. | 1, 3 |
| 3b | A bigger village: 20 columns, houses at 1.4×, lots, river, roads and props from existing art. Runs after 4, before 5. | 3, 4 |
| 5 | Villagers wander; hover and motion polish; the screen spec is finished. | 3b, 4 |

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
- **Modal and keyboard contract.** Every dialog uses native `showModal()` focus handling. Escape closes only the topmost surface. Closing returns focus to the opener, or to the Factory map after a canvas click. Opening Journal, Shop, a villager dialog, or the API book closes the machine card and any other modal; nothing stacks. Editor shortcuts are suppressed while a modal is open. Every icon button has an accessible name. The Journal is the route that never needs the canvas: taking quests, reading history, opening machines. A toast is never the only place a hint can be read.
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
- `place` is `containPlace` of `homeView(grid)` instead of `fieldBounds(grid)`, and the camera x adds `-homeView.left * scale`. Recenter, double-click reset and the Phase 4 anchor emit keep working against that view.
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

## Phase 5. Villagers wander; polish

### Goal

Villagers take a few steps around their spot now and then, so the field feels alive, without ever being hard to click. The screen spec describes the finished screen.

### Files

**New `apps/web/app/lib/wander.ts` + `wander.test.ts`.**
- `wanderOffset(who: string, ms: number, radius = 0.3 * tile)` returns `{ x, y, walking }` in world pixels. Deterministic from a hash of `who` and the time: each villager idles 4–8 s, then walks 1.2–1.8 s to a new point within `radius` horizontally and `radius / 2` vertically of the spot, with ease-in-out. Different villagers are out of phase.
- `wanderFrozen({ hovered, dialog, reducedMotion })` is true when any is true.

**`apps/web/app/lib/floor.ts`.** In `animate(now, ...)`, move each villager container to `spot + wanderOffset(who, now)`, unless frozen (hovered id, pointer pressed on the token, the id passed by `setFrozen(id)`, reduced motion, hidden document, or pause), in which case it stays where it is. Keep a per-villager active animation clock: resuming continues from the frozen position with no jump. Reduced motion always uses the home spot. Do not let the absolute wall clock skip the token to a different target after a dialog closes. Keep the cameo readable; move the token only, never mirror portrait art or text. The mark bobs 2px on a 1.6 s sine for `offer` and `ready`; no bob under reduced motion. `npcAnchors()` returns the moved positions, so hit-testing follows the villager.

**`apps/web/app/components/FactoryFloor.vue`.** Read `matchMedia('(prefers-reduced-motion: reduce)')` once and on change; pass it to the scene. Refresh hover hit-testing against the saved pointer coordinates while villagers move, and freeze a token from pointerdown through pointerup/cancel so it cannot escape a click. New prop `frozen?: string` (the villager whose dialog is open), passed to `scene.setFrozen`.

**`apps/web/app/components/FactoryFrame.vue`.** Pass the open villager's `npc:` id as `frozen`.

**`docs/specs/v8-screen-layout.md`.** Final pass for the whole screen: the field with the village band, villager marks and dialog, toasts, the anchored machine card, the tracker, Journal and Shop. Update the One home each table. Keep the editor, status bar, and API book sections word for word.

**`docs/adr/0024-quest-rail-and-status.md` and `0033-quest-card-stays-still.md`.** Add one sentence to each header: `[ADR 0039](0039-quest-ux-village.md) replaces the rail with the village, the tracker, and the Journal.` Nothing else.

### Acceptance

- `wander.test.ts`: the offset is within the radius for every `ms` in a long sampled range; the same `who` and `ms` give the same result; two villagers differ at the same `ms`; a villager is idle (`walking: false`) for at least 60% of a sampled minute; the offset is continuous (no jump larger than `radius / 4` between samples 16 ms apart).
- `wanderFrozen` is true for each flag and false for none.
- Resume after hover/dialog/hidden-tab freeze is continuous within the same per-frame bound. A click held down on a villager freezes its anchor until pointerup/cancel.
- A frozen villager's anchor does not change between two `animate` calls (test on `FloorScene` the way `floorPick.test.ts` builds one).
- `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm sim` pass; the sim report is unchanged.

### Do not

- Do not give villagers paths, collisions, or routes between houses.
- Do not let a villager leave the village band or overlap the fence.
- Do not add new animation to machines, drones, or the grid.
- Do not touch `packages/sim`, art files, or `tests/e2e`. No browser, no e2e, no shots.


## Final documentation gate

No open product question blocks these phases. Nick playtests the completed UI and may adjust appearance; agents do not playtest. Before each PR, compare its base to current main, check that no art or component file is deleted, and include all five allowed command results. A phase is not done because scaffolding exists: each named interaction must be wired to the existing commands, and each decision helper must have the listed tests. Record any unmet criterion explicitly rather than calling the phase complete.
