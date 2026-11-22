# A TypeScript course and a challenge pack

[ADR 0019](../adr/0019-one-screen-two-tracks.md) governs v6. The [Beginner curriculum](v6-beginner-curriculum.md) and [Workshop briefs and reference](v6-workshop-challenges.md) are the pack content.

## Problem

Nick's v5 playtest notes, verbatim.

1. Beginner lessons swing between no theory (loops and arrays were never explained) and blunt comments like "change 1 to 5" that leave nothing to think about.
2. Workshop Deploy lesson: the hand stalls on the line take("mine") repeating, then jumps (animation/tick desync bug). Text like "Deploy starts the clock" squeezes the top nav: remove it. Hide the deploy history. Deploy/onTick are unclear when introduced.
3. Continue had to be pressed 3-4 times with no visible change while reveals opened. One Continue.
4. Bring back pause and speed, on the game area (not in the nav), appearing once onTick/automation exists.
5. The "change ship" lesson (furnace->cart became press->cart): the player got stuck.
6. The "rock into a const + console.log" lesson: no reason why.
7. The player loses motivation and has no sense of when it ends; the Workshop flow does not come together.
8. The code line highlight flickering during a loop is noise.
9. PRIORITY: pack 1 becomes a full TypeScript track from absolute zero, like Duolingo/Exercism: many short lessons in strict order, every concept chewed with theory (values, types, variables, the colon and type annotations, interfaces, functions, parameters, what a function returns and putting it in a const, if/else, comparisons, arrays, loops, objects, etc.), varied game-flavoured tasks (no single plot needed), each with a visible effect in the game area, practice writing your own functions, steady motivation and visible progress to the finish.
10. Pack 2 Workshop = for mid-level players, skill sharpening: no ready lines, each task has a condition + TODO hints in comments, a mini-challenge that is neither tedious nor trivial. Remove coins, debt, extra locations, ore, progression. Explain the API reference well.
11. Too much UI. Everything on ONE screen, no switching to town/inbox. Extra info (hints, theory, API reference) lives in a side drawer/popover that never shifts the frame. A centred celebration (small confetti) on solve. Keep: top nav, palette, IDE beside the game area, wide Run button top right, compact checks under the editor.

## Solution

Feature **TypeScript from zero**, pack id `beginner`, with 52 lessons across ten units, about 3½ hours. Early on, the player gives Mila words of their own. At the finish they write a function that opens stalls from a list of typed bookings. Every new syntax element has theory before its first required edit. Each scene shows who needs the code and what changes when it runs. Completed units furnish the village visible at the finish.

Keep the id `workshop` for twelve Game-level challenges. A player can go directly to a condition that tests their skill. The arm serves four places on the parcel floor: `belt` (incoming belt), `left` and `right` (bins), and `cart` (dispatch cart). Counting challenges add a scale display. A label and an arrow identify each route. In *Dispatch from the right bin*, the arrows show both legs of the route: belt to right bin, then right bin to cart. *Count heavy parcels* needs the value returned by a pickup to decide which parcels count. Both are observable uses for lines that felt arbitrary in the chapter.

## User stories

- As a newcomer I can read what quotes mean, try one call and see my own words appear at the village gate.
- As a learner I can inspect an expected type, fix my value and watch a score ticket print. I can choose a hint without moving the line I was editing.
- Between sessions I can see the finish, revisit a completed lesson and resume the exact draft at my frontier.
- At a unit boundary I see my new landmark and can stop there. Enter takes me to the next lesson in one action.
- As an experienced player I can choose a condition, inspect the initial parcels and write my own functions. Checks tell me which input exposed a mistake.
- On direct entry to an automated challenge I can see who calls onTick, stop the arm halfway through a reach, change speed and follow the rest of that same delivery.
- As a pack author I can supply the lessons, fixtures, reference programs and renderer in a pack folder and use the same frame and runner for a third pack.

## Framework changes

At the audit base, the generic contract is in `packages/sim/src/framework/{pack,save,declarations}.ts`. Beginner provides global player functions, `retry: 'entry'`, a thirteen-entry lessons.ts and a cumulative village. Workshop’s pack.ts adapts chapter checks, but app.vue discovers its Studio.vue override and the live playthrough uses useGame.ts and runner.worker.ts. Remove the custom studio after porting the floor to the generic pack worker. Keep QuickJS isolation, execution budgets, mapped call records, folder discovery, typed declarations, sim-owned checks and serializable world frames.

### Lessons and packs

| Field or projection | v6 authoring and runtime contract |
| --- | --- |
| Track and units | Manifest distinguishes course from challenges. Course supplies ordered nonempty units with stable id, title and landmark. Every course lesson names one `unit`. Challenges omit it, have no prerequisites and use authored order for suggested next. |
| Exercise kind | `kind: 'write' \| 'fill' \| 'fix' \| 'predict'`. Write starts at a blank edit, fill completes a working fragment, fix repairs a wrong result or quoted diagnostic, predict records a choice in Learn before running the edit. Record the first prediction for feedback. |
| Learn | `theory?: { title, body, example }` uses 3–8 short authored lines plus a tiny distinct example. Required in every course lesson and before new syntax, APIs or automation in either track. `task?: { condition, examples }` is required for a challenge and includes inputs, rules, two worked cases and edge conditions. On direct entry expand the relevant API teaching even if the player skipped earlier challenges. Open Learn once on first entry, with Got it and a way back to the card. |
| Goal and starter | Keep the ≤70-character goal, `starter(previous): Starter`, files and one-based edit location. Each TODO says what should happen at that spot. Never print the literal solution there. Workshop starts with comments only. A starter compiles and leaves at least one required check outstanding. A fix lesson can quote a diagnostic in a comment and ask for a corrected statement. |
| Hints and checks | Keep ordered hint rungs and pure `Check<W>.evaluate(Evidence<W>)`. Add per-check `input` labels for variants. Show 1–2 compact course rows or 3–5 challenge rows with red/amber/green text and counts. Offer 2–3 hint rungs. A Beginner final hint may show an exact line. Workshop ends with an approach or pseudocode. Checks accept equivalent programs. Inspect syntax-tree relationships only where the construct is taught. |
| Scene and effect | A scene id names pack-owned components. A scene may bind a read-only input card by name, type and serializable value (for example, lane: number). Install these constants in both the QuickJS context and the matching Monaco declarations before running the file. Variant fixtures change only these bindings and initial world. Reject collisions with player API names. Lesson entry sets its fixture and reason, and `visibleEffect` names a testable change. Renderer consumes the worker's world and ordered moments. A course retry restores the lesson entry checkpoint, including the accumulated village. A challenge retry restores its own clean fixture. Validate that a reference changes the actual scene from that checkpoint. |
| Celebration | Supply reaction and learning text from the lesson and its visible result. Derive unit/finish text, no-hint star and optional first-try chip from live attempt data. Replaying a lesson cannot duplicate a landmark. |
| Runner and clock | Lessons retain run/deploy mode. Pack supplies clock handler/interval and a long-watched-run capability when relevant. Use one snapshot per ordered call. Auto-stop at the solved tick boundary after the final moment plays. |
| Reference and validation | Keep referenceSolution as a full player project. Pack available names govern sandbox, Monaco and API drawer together. Extend readPlayerAPI beyond its current one-line comment to read @param, @returns, @example and named types. Validate lesson ids, unit membership, kind, body length, distinct example, nearby TODO, check inputs, resolvable scene and effect id. For Workshop reject executable starter lines and exact-solution hints. Review pedagogical meaning editorially as well. |

### Course map and saved selection

Derive the map from ordered units, ordered lessons, completed ids and the first missing id (the frontier). The frontier is current, completed lessons are done and revisitable, other lessons locked. Selected id is separate. Show the total from the first visit, a highlighted unit, dots and text such as **Unit 3 · Lesson 10 of 52**. The showcase uses the same saved counts. Learn contains the full map or the challenge picker. Challenge completion is a mark on a freely selectable list.

Flush working files before selection. Keep per-activity draft, active file, edit point and entry checkpoint. Revisit a completed lesson in a review attempt. Its Continue returns to the saved frontier (or completed map) and preserves the forward draft. Switching away suspends the clock. Resume opens the saved selection with its draft, hints and mapped progress. Stop here at a unit ending saves the solved boundary and returns to the showcase. Resume offers the same one-click advance.

### One Continue

Currently continueLesson shifts one pendingReveals item and returns early. Workshop also drives continueStep from its own studio. During rollout, drain distinct unreleased entries in authored order and advance in **one** transition. Once the chapter is gone, delete revealsAfter, Lesson.reveals, Pack.release, pendingReveals, released, section unlocks and their UI handling. New pack effects come from completed world actions and unit entry/landmark data.

After all checks pass, finish the last visible action, suspend live ticks and present the celebration. Accept Continue only for the matching solved activity and attempt revision. Construct the next checkpoint, record completion and the unit landmark, select the next uncompleted lesson or recommended unsolved challenge, and persist together. On review use the return destination above. At the last completion show the finish on the same click. Ignore repeated click/Enter and stale worker replies. On write failure preserve the solved boundary and draft for retry. Reload either resumes that boundary or opens the committed destination. No timer advances the map.

## Layout

Final layout adopted from the [22 November audit](../audits/2026-11-22-ux-v6.md). Keep the neutral palette and warm primary action. At desktop widths a resizer separates the game on the left and IDE on the right. The header holds the logo, pack switcher, progress strip, drawer toggle, settings/palette and wide Run/Deploy at far right. Keep operational status with the game. The footer shows save state only. Directly above Monaco put one fixed-height goal line and a ? button. Below its host put compact checks and runtime diagnostics. On solve keep code readable and read-only.

**Drawer.** Position SideDrawer absolutely at the right edge of .world-shell, width min(360px, 40% of game width). The grid tracks and camera keep their dimensions. Learn contains theory, example, goal context, course map/challenge picker and a file chooser only if a Workshop challenge has multiple files. Hints preserves the current rung. API shows the lesson’s names, types, arguments, returns, failure behaviour and examples. Console holds logs; a “Console: 3 lines” badge in checks opens it. Hide empty content. A tool first available gets a tab dot. Run closes the drawer before playback. Escape or Close restores focus to the opener. On narrow screens stack game above IDE and use a bottom sheet over the game. Content scrolls inside the sheet.

**Celebration and finish.** Centre CelebrationOverlay over the game only. Show a brief reaction, the idea learned, one focused Continue bound to Enter and a small one-second confetti burst. Honour reduced motion. Optional star for zero hints, chip for three consecutive first-try solves. Days practised appear only on the showcase. A unit boundary adds the landmark and offers Stop here. At finish keep the panorama or solved shed in view, show stats, learned idea chips, replay and showcase in the IDE column. Primary action becomes Next pack → when there is a next pack, otherwise Showcase.

### Playback and controls

PackFrame currently carries world snapshots, moments, mode, clockMs, declarations, logs, checks and solved text. Extend it with serializable map/selection, Learn and task, visible reference entries, disclosed hints, scene id, celebration and clock status. The studio holds view state (drawer tab, focus, playback rate and pause). The worker owns authoritative tick, deployment identity and lesson state. A playback cursor tracks generation, tick and call index; the game and editor render that same cursor.

For a manual Run, play the start world then its moments at about two calls per second. Show source, reach and grip/release from that action before painting the after-world. Replace one decoration only when the source changes. For fast repeats hold the same line or group a fast repeating block long enough to read. Retain the individual call trace. Long watched runs expose Pause/Play and 1×/2×/4× only while playing. After the clock introduction, the game’s PlaybackBar shows those controls, Stop loop and onTick #n. The wide action goes Run → Deploy → Stop loop while live, with Run once as a secondary action for a clock challenge. Keep clock explanation out of the nav.

Deploy runs setup on a candidate floor, requires an exported callable onTick, then starts the clock. Failed replacement leaves the last valid controller intact. Each tick produces an ordered batch. Play its hand, station, check and counter changes before requesting the next tick. Routine busy/empty feedback stays at the station and in Console under ADR 0017. For live ticks update one stable gutter decoration set from the lines executed that tick. Keep the previous set between ticks, including idle gaps. Never clear then re-add it for every call. Stop or switch cancels the old generation. Pause freezes both simulation requests and the remaining time in the current animation; a speed change rescales that remaining time. An acknowledged tick cannot run twice. Keep test query speed as an initial value only. No catch-up ticks on resume.

### Save migration from v5

Keep `inherit.pack.beginner` and `inherit.pack.workshop`. Dispatch before the v5 decodeSave checks lesson ids against a current pack. Both old envelopes have formatVersion 1 and packVersion 1. Workshop's world and entryWorld hold internal chapter version 6 and its project lives alongside them. Bump the envelope and pack versions for the new activity state. Decode and validate against the source version before constructing any destination.

- **Workshop.** Archive original bytes and all working files, deployed files, history and snapshots under a named read-only “v5 Workshop code” archive in Settings. Fresh challenge selection, no completions, stopped clock. If only inherit.workshop.v1 exists, archive that source through the legacy reader. Retire importWorkshop's conversion into a playable chapter. Preserve archived bytes even when project extraction fails.
- **Beginner.** Intersect old completed ids with the new curriculum by exact id. At this revision the survivors are hello, flowers, house-sign, flag, apple-basket, morning, flower-row, weather, path-lamps and neighbours. All other old ids retire. Credit surviving completions even beyond an inserted gap; the earliest missing id is current. Rebuild landmarks for fully completed units. Preserve working files with the old lesson id. Restore a compatible current-id draft at its rebuilt entry checkpoint when eligible; keep other drafts accessible in the archive and expose a mapped draft when its lesson becomes eligible. Old solved-but-uncontinued work remains a draft until validated against the new checks. Never give inserted lessons credit by ordinal.
- **Recovery.** Keep the raw Beginner archive too. Write and verify an archive keyed by pack and source identity before replacing a slot. Validate the complete candidate, then replace the active slot in one storage write. Re-running migration reuses the same archive. On malformed, unknown-newer or quota failures preserve the source, show export/recovery and offer a fresh start separately. Never write either pack’s migration into a preview slot. Reload a v6 clock at the last committed boundary paused; restart its fixture if player controller state cannot be reconstructed, with the draft retained and the reset indicated.

## Implementation sequence

Apply the audit in this order. Each step has a visible or testable completion point.

1. Adopt ADR 0019, the glossary and the two pack content specs. Preserve prior ADRs as history.
2. Extend framework lesson fields, declarations, per-input checks and validation as specified above. Update the authoring guide, scaffold and skill when implementing the new contract.
3. Make both Continue paths advance once. Drain legacy queues during overlap, then remove them with the old chapter.
4. Replace SolvedCard.vue with CelebrationOverlay.vue, keeping test ids `solved-card` and `continue`. Focus and Enter work across unit and pack boundaries.
5. Add SideDrawer.vue and its four tabs inside the world. Keep test ids `drawer` and `drawer-<tab>`. Move inline hint rungs and ApiReference there. Make GoalBar a single line.
6. Add ProgressStrip to PackNav and showcase. Remove .world-title, H1/eyebrow/Live pill, .dock-header, “Lesson n of N” band, editor status line, machine count and footer extras. Keep checks directly below the editor.
7. Add PlaybackBar.vue, studio pause/rate and pause-aware usePlayback.wait. Exercise all three rates and Stop on the game area.
8. Change usePlayback.play and CodeEditor.lightCall to retain the last live call and steady tick gutter across ticks. Preserve the watched per-call source and arm timeline.
9. Rebuild Workshop on standard PackStudio with a clock and the parcel API. Delete the campaign, UI extras and importer as detailed in the challenge plan after tracing callers.
10. Show the three-frame Run/Deploy/Stop explanation before the first clock edit and when entering another clock challenge directly. Tick count and arm movement demonstrate repetition.
11. Split Beginner lessons.ts by the ten curriculum units. Reuse basketCount and isRaining, add guests returning Guest[] and scene operations only where the first lesson that needs each explains it.
12. Move PackFinish stats and idea chips to the editor column. Keep the finished world visible and update the primary action.
13. Replace chapter e2e expectations with the acceptance cases below. Capture start, learn, running, solved and finished frames under INHERIT_SHOTS, using the finish destination or post-Continue result as appropriate.

## Verification and audit tooling

- Validate each starter and reference against the same lesson declarations. Exercise both in the real runner from identical checkpoints. For the two packs play all 52 lessons and 12 challenges, including direct clock entry, hidden variants with input labels, and the final Continue. First attempts, hint usage and revisit must have consistent map counts.
- In Chromium at 1440×900, 1280×720 and a narrow stacked size compare editor and world bounding boxes before and after opening each tab. Test Escape, tab focus, reduced motion, nonshifting checks, Enter once, double activation, unit stops and finish. A queued v5 multi-reveal must take a single click during transition.
- Pause mid-reach, change speed, resume, redeploy and leave with a tick in flight. Compare ordered world/hand/call/tick ids and decoration updates. An idle tick causes no removal. Verify diagnostic Run once does not mutate a saved fixture.
- Test migration from both envelopes, a partially solved queue, full old completion with inserted gaps, a saved draft, a pre-pack Workshop key, malformed data and interrupted writes. Test restoring exact v6 draft and solved boundaries before and after Continue.
- Allow `?pack=<id>&lesson=<id>` on production through a **non-persisting preview slot**. PackStudio currently gates lesson by local host and even the suffixed .preview.<lesson> key writes localStorage. Use an in-memory store, seed directly from the selected fixture, validate both ids and keep ordinary slots, archives, showcase counts and practice days untouched, including on reset/Continue. A reload starts that preview clean. Unknown ids give a plain selection error.
- Add `pnpm shots --url <site> --pack <id> --lesson <id>` using tests/e2e/chapter-capture.ts for paired frozen screenshot and transcript at the same instant. Use the provided site and preview, require INHERIT_SHOTS outside the checkout and name outputs by pack, lesson and frame. A remote capture needs neither a local build nor a second capture driver.
- Use Node 24, frozen pinned pnpm and a prepared Chromium headless shell in the development snapshot. Record the docs-only exemption in AGENTS.md: documentation-only PRs need no browser tests or browser install. Behaviour, tooling, mixed and uncertain changes keep the full gate. This brief specifically requires the full suite on its final commit. CI policy changes and the capture script belong to implementation.
