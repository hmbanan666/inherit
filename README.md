# Inherit

Your uncle left you a factory and a 600-coin debt. In Kettlewick, the mail horse needs shoes, the baker needs an oven grate, and the bridge to Riverside is down. Write one TypeScript controller that gets the town working again.

## Your first shift

Start below Uncle’s note in `main.ts`. Write an exported `onTick()` that prints a message, then click **Deploy**. Bram’s card gives you an idea on the first hint and the exact lines on the second. Follow it to import Uncle’s machines from `"inherit"`, dig ore, connect belts and smelt ingots. When the third ingot ships, click **See it** to watch the mail horse trot past the forge.

Build machines with `ctx.build` and lay belts with `ctx.connect`. Click a machine to inspect its bins and the line that drives it. Each delivery changes the town, and regular orders help pay the bank. Requests and orders wait and pay in full whenever you deliver. Your floor and controller save in this browser. Returning from v2? Open **Deploy history → Open v2 code** to find your old project.

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
