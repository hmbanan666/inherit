# Inherit development

Use Node 24 with the pnpm release pinned in the root manifest. Run `pnpm dev` from the workspace root to open the workshop.

Keep game rules and goal evaluation in `packages/sim`. Render the world sent by the worker. Keep player code inside QuickJS and expose operations through the typed factory bridge. When changing a level, exercise both the starter and a working solution.

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

The browser test serves the generated site on loopback port 4173. Set `INHERIT_SHOTS` to a directory outside the checkout when capturing chapter screenshots.

## Commits and merging

Omit `Co-authored-by` trailers and AI tool or model names from commit messages, PR titles and PR bodies. When squash-merging on GitHub, pass an explicit subject and body, for example `gh pr merge --squash --subject "..." --body "..."`. GitHub's default squash message appends `Co-authored-by` trailers for commit authors.
