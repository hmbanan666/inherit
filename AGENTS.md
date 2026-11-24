# Inherit development

Use Node 24 and the pnpm release pinned in the root manifest. `pnpm dev` opens Kettlewick Works.

Keep game rules and goal evaluation in `packages/sim`. The page renders the world the worker sends. Player code stays in QuickJS. v8 code lives in `packages/sim/src/v8/`. Build on the existing frame and components. Do not restart a screen from scratch.

Read [ADR 0026](docs/adr/0026-quantity-quests-one-world.md) and [ADR 0022](docs/adr/0022-quest-loop-no-loss.md) before changing the game. The [v8 concept](docs/concept/v8.md) is the vision. The chain is `packages/sim/src/v8/quests.ts`. The [first playable spec](docs/specs/v8-first-playable.md) is the slice. The [screen layout](docs/specs/v8-screen-layout.md) is the arrangement. The glossary is `CONTEXT.md`. Art is [docs/art.md](docs/art.md). Do not delete a drawing.

When changing a quest, keep a test that the previous program fails it and a working program completes it.

## Checks

Nick playtests. Agents do not run browser suites or screenshots. Before a PR, on the final commit:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
```

## Commits and merging

Cursor cloud agents run on grok-4.7 high. Squash-merge with an explicit subject and body. Omit `Co-authored-by` trailers and AI tool or model names from commit messages, PR titles, and PR bodies. GitHub's default squash message appends `Co-authored-by` trailers for commit authors.

## Issue tracker

Track issues and specs in GitHub Issues. See `docs/agents/issue-tracker.md`. Triage with `docs/agents/triage-labels.md`.

## Domain docs

All packages share one glossary and one set of architecture decisions. See `docs/agents/domain.md`.

Record lasting product and design decisions as ADRs in `docs/adr/` using the next free number. When a decision replaces an earlier one, name it in the new ADR and keep the original file.
