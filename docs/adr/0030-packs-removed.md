# Packs removed

Accepted 24 November 2026. Supersedes the packs clauses in [ADR 0022](0022-quest-loop-no-loss.md), [ADR 0021](0021-v8-inherit-a-factory.md), and [ADR 0018](0018-game-packs.md). Those files stay. The sentences that say packs remain playable at `/?packs` are the record of that day. They are not in force.

## Context

The logo on Kettlewick Works linked to `/?packs`. That route opened the v5–v7 pack showcase. Nick's playtest on 24 November 2026: packs are gone from the product. The game is the quest at `/`.

## Decision

**One home.** The Inherit mark links to `/`. That is Kettlewick Works and the current save. `?packs`, `?pack`, and `?lesson` do not open another screen.

**The pack mode is removed.** The showcase, the studio, the lesson routes, the pack switcher, the pack worker, and the pack tests are gone. `pnpm new-pack` is gone. Do not add a pack.

**Drawings stay.** Covers, village scenes, `Villager.vue`, `AppleTree.vue`, and the files in [the art list](../art.md) stay in the tree. A drawing that no longer has a screen is still a drawing.

This ADR is the source of truth for that removal. The glossary, the first-playable slice, and the older pack specs point here. They do not restate a second pack mode.

## Consequences

Old links to `/?packs` open the game. A save of the works is unchanged.
