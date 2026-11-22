# Author a game pack

Pick the learning goal first. What will a player know how to do at the end? Choose a setting where each idea does something visible. Village at Dawn uses a counted loop to light five separate lamps. A sixth lamp or a missing lamp is visible on the path.

Run `pnpm new-pack lantern-garden`. Open `pnpm dev` and choose Lantern Garden. Its starter leaves a lantern dark. Enter `light()`, press Run, watch the lantern glow and Continue to the ending. The new folder is the registration. Use a fresh id for a different game.

## Work in the pack folder

| File | What to supply |
| --- | --- |
| `manifest.ts`, `cover.svg` | Stable folder id, title, tagline, level, genre, learning goals, time range and local cover. Set `next` to another pack’s id to recommend it on the finish card. |
| `player.ts` | Export the typed `PlayerAPI` interface. Put one line of JSDoc on every method for hover help. |
| `pack.ts` | Initial serializable world, decoder, entity rows, panels, lessons, available names and typed operations. |
| `lessons.ts` | Ordered lessons and their complete reference projects. Keep browser reference data importable from Node. |
| `WorldView.vue` | Render the displayed world and played calls. Give each visible effect a test id and accessible name or visible text. |
| `art/` | Local scenes and drawing parts where needed. |

Implement each method in `beginAttempt(world)`. Check arguments before changing the world. Return ordinary data if a player needs a result. The same method definition supplies QuickJS and the declarations in Monaco. A Beginner pack exposes globals in one file, `main.ts`. Give each lesson access only to methods already introduced. A module pack can export names from `inherit`, supply guest modules with declarations, or supply a clock for an exported `onTick`. Workshop has its own live floor, history and simulation adapter.

Give each saved entity an id and readable rows. A pack can declare a panel with an optional reveal id. Empty panels stay hidden. For cumulative decorations choose entry-state retries. A live simulation can keep its current world between attempts. Keep ids stable after release. When changing the saved shape, bump the pack version and supply an upgrade and decoder. The framework uses `inherit.pack.<id>` and leaves an unreadable slot available for recovery.

## Write a lesson

1. Write a short, plain goal, on one line of at most 70 characters.
2. Pre-fill every line the player can leave alone. Put a comment immediately above the edit that explains the new idea and shows its shape. Point the starter at that file and one-based line. Give the player one new idea. In Beginner, store a returned value before using it in another call.
3. Make the starter compile and run with the lesson still open. Make the reference project pass through the same runner. Check resulting state and calls. For a language idea, also check the syntax tree. Give each check a short label.
4. Give progressive hints when needed. End with the exact edit. Write the solved reaction, what the player did and one sentence about what they learned. Leave progression to Continue. List optional reveals in order.
5. Render each change from the worker snapshot. Give the effect marker the id and text in the lesson record. Check that the result is legible while the source line is highlighted.

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
