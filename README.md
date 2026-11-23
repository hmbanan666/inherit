# Inherit

You inherit Kettlewick Works, Uncle's workshop in a village. Villagers give one quest at a time. Edit the program beside the works, press **Deploy**, and press **Complete quest** when the checks pass. That pays credits and XP. Credits are spent in the shop. The clock keeps ticking, and the works do not play themselves.

**Game packs** are a legacy mode at `/?packs`. Village at Dawn and Workshop stay playable there. They are not the v8 game, and they are not removed.

## Run locally

Use Node 24 and the pnpm version pinned in `package.json`.

```sh
corepack enable
pnpm install
pnpm dev
```

Open the local address the dev server prints. That is Kettlewick Works. Add `?packs` for the legacy showcase. To serve a production build locally:

```sh
pnpm build
pnpm --filter web preview --port 4173
```

## Self-host with Docker

```sh
docker build -t inherit .
docker run --rm -p 8080:80 inherit
```

Open `http://localhost:8080`. The image builds the workspace with Node 24 and serves the static files with nginx on **port 80**. Fonts, editor workers, artwork, and the WebAssembly engine are included in the build.

## Legacy packs

`pnpm new-pack <id>` creates a pack in `packages/sim/src/packs`. Follow the [authoring guide](docs/packs/AUTHORING.md). The showcase at `/?packs` discovers the folder. Packs are a legacy mode.

`packages/sandbox` runs player projects inside QuickJS. `apps/web` contains the frame, the editor, and the worker. Before a change, run `pnpm test`, `pnpm typecheck`, and `pnpm build`.

Released under the [MIT license](LICENSE).
