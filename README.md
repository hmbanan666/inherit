# Inherit

Your uncle left you a shed, three idle machines and a tab at Kettlewick Bank. Write one TypeScript controller to get the mail horse shod, bring bread and light back to town, and rebuild the bridge to Riverside.

## Your first shift

Bram needs three iron ingots by evening. Open **Hint** on his request, add a line inside `onTick` in `main.ts`, and press **Deploy**. Connect the mine to the furnace, smelt the ore, and connect the furnace to the cart. Click a machine to inspect its bins or jump to the line that drives it. **See it** opens the Town view when a delivery changes Kettlewick.

Each request brings another regular who pays for deliveries. Use **Pay** to settle the three installments. Late deliveries still count and missed installments collect interest once. After the bridge stands and the debt is paid, regular orders continue.

The floor, working copy and deployed controller save locally. **Ctrl/Cmd+S** deploys, and the arrow beside **Deploy** opens revisions. Earlier saves start a fresh shed with the old project filed under **v2 code**. The mayor brings a filing cabinet for multi-file controllers.

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

- `packages/sim` runs the factory simulation, town requests, orders, hiccups, and debt.
- `packages/sandbox` compiles the player’s TypeScript and runs it in QuickJS.
- `apps/web` contains the workshop, floor renderer, editor, and simulation worker.
- `tests/e2e` exercises the generated site through the editor and town views. Set `INHERIT_SHOTS` to a directory outside the checkout to capture workshop screenshots.

Released under the [MIT license](LICENSE).
