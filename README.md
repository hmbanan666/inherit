# inherit

Your uncle left you a shed, a working ore extractor, and an order for ten iron ingots. Open the workshop, edit the TypeScript controller, and watch the first ingot reach the loading dock. Inherit is a single-player automation game that runs entirely in the browser.

## Playing the shed

The starter controller runs as soon as you open the game. Click a machine to inspect its state and highlight its mentions in the controller. The `api.d.ts` tab describes the available commands. Edit `controller.ts` and press **Run** to start a fresh shift with your code. **Pause** preserves the shift and **Step** advances it by one tick.

| Level | Customer order | Factory problem |
| --- | --- | --- |
| The shed | 10 iron ingots | Ore piles up until the furnace gets a work instruction. |
| Second furnace | 48 ingots, at least 185/min, each furnace at most 50% idle | Belt in the one-tick furnace. Compare the input bins to keep it and its four-tick partner busy. |
| Parts department | 10 pressed parts | Place the coal mine on the floor, connect it to the press, and feed both ingredients. |
| Loading bay | 7 ingots with zero ore lost | A slow truck fills the line. Check belt capacity before digging. |
| First real order | 12 gate parts by tick 128, at most 12 sacks of coal, zero spills | Feed the press from two furnaces. Remember each successful coal draw across ticks while the truck takes one part every eight ticks. |

A tick represents 250 ms of simulation time. Speed changes how quickly you watch the shift. Throughput counts deliveries over the last simulated minute, using elapsed time for younger shifts. The idle readout shows the least utilized furnace. Each recipe has separate ingredient bins. A completed machine holds its product until the outgoing belt has room.

Layout changes start a new shift. Select player-built equipment to remove it. Each order has three progressive hints. Shipping unlocks the next level in the chapter log. This browser saves controllers, layouts, hints and unlocked orders in local storage. Reset level restores the current starter plan.

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

- `packages/sim` defines levels, layouts, fixed-tick physics, the controller API and order checks. A fresh world and the same synchronous controller produce the same shift. The chapter uses no random inputs.
- `packages/sandbox` transpiles controllers with the TypeScript compiler and runs them in QuickJS WASM. Each instance has an 8 MiB guest heap, a bounded stack, a 25 ms handler interrupt and a limit of 128 factory calls per tick. Runtime errors use the TypeScript source map.
- `apps/web` contains the Nuxt 4 workspace, Monaco editor, PixiJS equipment and local notebook. A dedicated worker owns the active simulation. The UI can terminate it and start a fresh run.
- `tests/e2e` plays through the production build using the editor and floor controls.

## Screenshots

The chapter browser test captures all five running orders and the first and last shipment receipts. Set `INHERIT_SHOTS` to an output directory to regenerate them. A gallery is planned for the first release.

## Roadmap

1. **Functions and onTick** — restore the shed, route ore and ship the first orders.
2. **Modules** — split a growing controller into reusable machine programs.
3. **Types and contracts** — specify which materials cross each machine boundary.
4. **Async, events and queues** — coordinate deliveries and handle slow consumers.
5. **A reactive control panel** — build a small framework of your own from the signals your factory produces.

Released under the [MIT license](LICENSE).
