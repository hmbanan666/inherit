# Inherit development

Use Node 24 with the pnpm release pinned in the root manifest. Run `pnpm dev` from the workspace root to open the pack showcase.

Keep game rules and goal evaluation in `packages/sim`. Render the world sent by the worker. Keep player code inside QuickJS and expose operations through the typed factory bridge. When changing a lesson, exercise both the starter and a working solution.

Before a PR, run these checks on the final commit.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install chromium --only-shell
pnpm test:browser
```

Documentation-only PRs may skip the Chromium install and browser suite. Run both for changes to code, dependencies, build configuration or test tooling.

The browser test serves the generated site on loopback port 4173. Set `INHERIT_SHOTS` to a directory outside the checkout when capturing pack screenshots.

## Commits and merging

Omit `Co-authored-by` trailers and AI tool or model names from commit messages, PR titles and PR bodies. When squash-merging on GitHub, pass an explicit subject and body, for example `gh pr merge --squash --subject "..." --body "..."`. GitHub's default squash message appends `Co-authored-by` trailers for commit authors.

## Agent skills

### Author a pack

When adding a pack or designing a lesson, use [.agents/skills/author-pack/SKILL.md](.agents/skills/author-pack/SKILL.md) and [the authoring guide](docs/packs/AUTHORING.md). Use [ADR 0019](docs/adr/0019-one-screen-two-tracks.md) and the [v6 spec](docs/specs/v6-course-and-challenges.md) for course and challenge decisions. ADR 0018 governs the shared pack foundation.

### Issue tracker

Track issues and specs in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

When triaging an issue, use the labels in `docs/agents/triage-labels.md`.

### Domain docs

All packages share one glossary and one set of architecture decisions. See `docs/agents/domain.md`.

Record lasting product and design decisions as ADRs in `docs/adr/` using the next free number. When a decision replaces an earlier one, name it in the new ADR and keep the original file.
