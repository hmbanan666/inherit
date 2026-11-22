# Inherit

Learn TypeScript by changing a game world. Choose a pack, edit the code beside its world and press **Run**. Calls play back beside their source lines. **Continue** opens the next lesson when you are ready.

Start with **Village at Dawn**. Help Mila wake a village and build a fair in thirteen lessons, from one greeting to functions, choices and loops. **Workshop** offers twelve independent parcel challenges. Route batches, compare labels and deploy a controller to respond to arrivals. The pack switcher keeps each game and its working files on this device.

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

## Add a pack

Run `pnpm new-pack <id>` to create a playable pack in `packages/sim/src/packs`. Its folder supplies its cover, world, player functions, lessons and view. The showcase and validation suite discover it automatically. Follow the [authoring guide](docs/packs/AUTHORING.md).

`packages/sandbox` runs player projects inside QuickJS. `apps/web` contains the showcase, editor and worker sessions. Run `pnpm test` for lesson validation, then `pnpm build` and `pnpm test:browser` for the player playthroughs. Set `INHERIT_SHOTS` outside the checkout to keep screenshots and their visible text.

Released under the [MIT license](LICENSE).
