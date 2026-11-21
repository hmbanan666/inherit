# Inherit

Your uncle left you a factory and a 600-coin debt. In Kettlewick, the mail horse needs shoes, the baker needs an oven grate, and the bridge to Riverside is down. Write one TypeScript controller that gets the town working again.

## Your first shift

Start in `verbs/dig.ts`. Bram’s card explains how to take a rock from the mine. Open Hint for the idea, then Show exact step for the lines. The bench runs as you edit. Use your dig in smelt, write ship, then import your verbs into `main.ts` and click **Deploy**. When the third ingot ships, click **See it** to visit the forge.

Find solved functions under **My library**. Machines work automatically when supplied. Use the floor to inspect inputs and the lines that moved them. Requests and finite orders pay for machines and the debt. The cart keeps extra items until someone needs them. Your progress saves in this browser. Open **Deploy history** to find snapshots from earlier versions.

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
