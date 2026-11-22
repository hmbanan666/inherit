# Author a game pack

Pick the learning goal first. What will a player know how to do at the end? Choose a setting where each idea does something visible. Village at Dawn uses a counted loop to light five separate lamps. A sixth lamp or a missing lamp is visible on the path.

Run `pnpm new-pack lantern-garden`. Open `pnpm dev` and choose Lantern Garden. Its starter leaves a lantern dark. Enter `light()`, press Run, watch the lantern glow and Continue to the ending. The new folder is the registration. Use a fresh id for a different game.

## Work in the pack folder

| File | What to supply |
| --- | --- |
| `manifest.ts`, `cover.svg` | Stable folder id, title, tagline, level, genre, learning goals, time range and local cover. Set `next` to another pack’s id to recommend it on the finish card. |
| `player.ts` | Export the typed `PlayerAPI` interface. Give every method a JSDoc summary, @param for each parameter, @returns (including empty/failure behaviour) and @example. The API tab reads these tags from the same file as Monaco. |
| `pack.ts` | Initial serializable world, decoder, entity rows, panels, lessons, available names and typed operations. |
| `lessons.ts` | Ordered lessons and their complete reference projects. Keep browser reference data importable from Node. |
| `WorldView.vue` | Render the displayed world and played calls. Give each visible effect a test id and accessible name or visible text. |
| `art/` | Local scenes and drawing parts where needed. |

Implement each method in `beginAttempt(world)`. Check arguments before changing the world. Return ordinary data if a player needs a result. The same method definition supplies QuickJS and the declarations in Monaco. A Beginner pack exposes globals in one file, `main.ts`. Give each lesson access only to methods already introduced. A module pack can export names from `inherit`, supply guest modules with declarations, or supply a clock for an exported `onTick`. Workshop has its own live floor, history and simulation adapter.

Give each saved entity an id and readable rows. Optional panels with rows appear in Learn. For cumulative decorations choose entry-state retries. A live simulation can keep its current world between attempts. Keep ids stable after release. When changing the saved shape, bump the pack version and supply an upgrade and decoder. The framework uses `inherit.pack.<id>` and leaves an unreadable slot available for recovery.

## Write a lesson

Set `manifest.track` to `course` or `challenges`. A course manifest owns an ordered `units: { id: string; title: string; landmark: string }[]`. Group the lesson array in that same order. A challenge manifest omits units. Each challenge starts from its own initial world and can be selected immediately.

The exported TypeScript definitions in [pack.ts](../../packages/sim/src/framework/pack.ts) are the authoring contract. The [scaffold lesson](../../scripts/pack-template/lessons.ts.template) is a complete example.

1. Choose a stable lesson id and a `scene` from the pack’s `scenes` array. The world view receives `world`, `scene`, `inputs` and ordered `calls`. Use `enter(world)` to set an activity's starting fixture. Optional `inputs(world)` returns a name-to-`{type, value}` record. Use serializable values and distinct names. The worker binds them read-only and declares them to Monaco.
2. Set `kind` to `write`, `fill`, `fix` or `predict`. A write lesson offers a blank edit. A fill lesson completes a working fragment. A fix lesson repairs a wrong result. A predict lesson supplies `prediction: {question, choices, answer}` and records the first choice in Learn.
3. Name the course `unit` and supply `theory: { title, body: string[], example }`. Write three to eight short lines explaining each new idea before the edit. Illustrate another situation. For challenges omit `unit` and supply `task: { condition, examples: string[] }` with the rules, edge conditions and at least two worked cases. Include theory for new syntax, APIs and automation.
4. Give the scene a reason and write one goal of at most 70 characters. Return `{files, edit: {file, line}}` from `starter(previous)`. Put a TODO on or immediately above the one-based edit line describing the result the player should achieve. Keep starters compilable. Independent challenges use comments-only files.
5. Run the starter and full `referenceSolution` from the same entry. The starter leaves a required check outstanding and the reference produces the specified `visibleEffect`. Each check has a stable id, a short label and a pure evaluator returning red, amber or green. Add an `input` label for every challenge case. Use `variants: [{input, enter(world), maxTicks?}]` to set alternate fixtures. Each runs the unchanged files in a fresh guest. An input-labelled check runs on its named fixture. An unlabelled check runs on the displayed scene and every alternate, with failing inputs listed together in its row. A clock variant defaults to 120 ticks and can request up to 1200. A language check can inspect the syntax relationship being taught.
6. Supply two or three progressive hints. Only a Beginner final hint may show the actual statement. Write the solved reaction, what happened and the idea learned. Continue records completion, preserves the entry and draft, and opens the next activity. A completed course lesson can be replayed from Learn. Its Continue returns to the frontier.
7. Set the pack version for the world schema. Shared saves use envelope version 2. V5 migrations preserve original bytes under the pack's archive prefix. Lesson previews use memory and leave these slots alone.

## Drawing parts

| Part | Source | Rendered example |
| --- | --- | --- |
| Ground and trees | `apps/web/app/lib/art/townLandscape.ts` (`landscape`, `fir`) | Hills behind the Workshop town |
| Buildings and working wheels | `apps/web/app/lib/art/townBuildings.ts` (`drawBuilding`, `wheel`) | Riverside mill |
| Street lamps | `apps/web/app/lib/art/townBuildings.ts` (`lamps`) | Lamp Street after Tomas’s delivery |
| Faces | `apps/web/app/lib/art/townPortrait.ts` (`portrait`) | Bram on the shed floor |
| Vector characters and fruit trees | `packages/sim/src/visuals/Villager.vue` and `AppleTree.vue` | Neighbours and the orchard at the fair |

See the [machine drawing contact sheet](../../apps/web/app/lib/art/contact-sheet.png) for the reusable palette and line weights.

## Play the reference

Run `pnpm test` for the discovered pack suite. It compiles starters and references against the declarations the editor sees, then plays both from the same checkpoint. A specialized simulation can supply a `validation.ts` checkpoint adapter that drives its production runner and bounded ticks. Keep ordinary packs on the default runner. The browser suite loads the ordinary lesson list automatically. A specialized studio can put its UI playthrough in a local `playthrough.ts`, as Workshop does.

Build the site and run the browser suite. Set `INHERIT_SHOTS` to an external directory to inspect the opening, watched call and solved card. Check the ending, an unfinished draft after switching packs, and the narrow layout. The ordinary repo checks are listed in [AGENTS.md](../../AGENTS.md).
