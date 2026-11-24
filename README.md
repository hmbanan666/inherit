# Inherit

You inherit Kettlewick Works, Uncle's workshop in a village. Villagers give one quest at a time, and a quest asks for a count of goods. Edit the program beside the works, press **Deploy**, and press **Hand over** when the goal lines pass. That pays credits and XP. The shop sells conveniences. The clock keeps ticking, and the works do not play themselves. The vision is [docs/concept/v8.md](docs/concept/v8.md).

## Run locally

Use Node 24 and the pnpm version pinned in `package.json`.

```sh
corepack enable
pnpm install
pnpm dev
```

Open the local address the dev server prints. That is Kettlewick Works. To serve a production build locally:

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

Packs were removed. [ADR 0030](docs/adr/0030-packs-removed.md) is the record.

`packages/sandbox` runs player projects inside QuickJS. `apps/web` contains the frame, the editor, and the worker. Before a change, run `pnpm test`, `pnpm typecheck`, and `pnpm build`.

Released under the [MIT license](LICENSE).
