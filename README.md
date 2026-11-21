# Inherit

Your uncle left you a shed, an idle iron mine, and a furnace waiting for its first rock. Inherit is a browser game about growing one persistent factory with TypeScript. The first of 75 objectives takes one line.

## Your first shift

Open the workshop and click **Hint** on the objective card. Add `ctx.dig("mine")` inside `onTick` in `main.ts`, then click **Deploy**. Watch the rock travel down the belt. The next card shows how to turn it into an ingot.

Spend coins on land, machines, and belts. Take customer orders for extra pay and reputation. Research unlocks equipment and new controller commands. The floor, code, and `memory` carry over between objectives and save locally in your browser.

Edits stay in your working copy while the deployed controller runs. **Ctrl/Cmd+S** deploys a change. Open the arrow beside **Deploy** to roll back to an earlier revision. Research the **Workshop binder** to split your controller into files and import helpers.

Click a machine to inspect its bins. **Drivers** shows which lines in your project command each machine. Use the console and metrics to investigate a slow line, preview changes on a copy of the factory, or save a named draft in **Snapshots**.

## Run locally

Use Node 24 and the pnpm version pinned in `package.json`.

```sh
corepack enable
pnpm install
pnpm dev
```

Open the local address printed by Nuxt. To play a production build locally:

```sh
pnpm build
pnpm --filter web preview --port 4173
```

## Self-host with Docker

```sh
docker build -t inherit .
docker run --rm -p 8080:80 inherit
```

Open `http://localhost:8080`. The image builds the workspace with Node 24 and serves the static files with nginx on **port 80**. Fonts, editor workers, artwork and the WebAssembly engine are included in the build.

## Project structure

- `packages/sim` runs the factory simulation, objectives, orders, and research.
- `packages/sandbox` compiles the player’s TypeScript and runs it in QuickJS.
- `apps/web` contains the workshop, floor renderer, editor, and simulation worker.
- `tests/e2e` exercises the generated site through the editor and floor controls. Set `INHERIT_SHOTS` to a directory outside the checkout to capture workshop screenshots.

Released under the [MIT license](LICENSE).
