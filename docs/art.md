# Art

Drawings stay in the tree. A file that looks unused stays too, and it is listed here. The pictures removed in commit `843137c` (PR #58) are on the git tag `art-archive`, which points at `843137c^`.

Restore one file with:

```sh
git checkout art-archive -- path/to/file
```

## Live

These files are on `main`. `apps/web/app/lib/floor.ts` paints the works from `shared`, `floorMachines`, and `materials`. `TownPortrait.vue` paints a villager from `townPaint` and `townPortrait`.

| File | What it draws |
| --- | --- |
| `apps/web/app/lib/art/shared.ts` | The machine palette and the elevation helpers (`drawing`, `mountingPlate`). Not a picture on its own. |
| `apps/web/app/lib/art/floorMachines.ts` | The depot crane and crate, the hauler truck, and the furnace with its charging mouth. |
| `apps/web/app/lib/art/materials.ts` | One lump of iron ore, one iron ingot, and one lump of coal. There is no steel lump. |
| `apps/web/app/lib/art/townPaint.ts` | Canvas helpers (box, line, stipple) for the portraits. The comment also names printed scenery. That scenery is in the archive. |
| `apps/web/app/lib/art/townPortrait.ts` | Cameos of Bram, Elsie, Tomas, Wen, Odile, Harrow, Ines, and Pell, each worried or happy. |
| `apps/web/app/lib/art/contact-sheet.png` | The palette and line-weight sheet. [The pack authoring guide](packs/AUTHORING.md) points at it. Nothing in the game renders it. |
| `apps/web/app/components/town/TownPortrait.vue` | The canvas that shows one cameo. |
| `packages/sim/src/visuals/Villager.vue` | The standing figure the beginner pack uses. |
| `packages/sim/src/visuals/AppleTree.vue` | The trees on the beginner village panorama. |

The floor draws a drone's load as ore unless that drone was created already carrying coal, and it draws one ingot whenever the furnace holds ingots or steel. Those are gaps in the floor, not missing files.

## Archived

Tag `art-archive`. Each row is a file that `843137c` deleted. The last column is a use that file could serve later. It is not a decision to build that use.

| File | What it draws | Could serve |
| --- | --- | --- |
| `apps/web/app/lib/art/townBuildings.ts` | Forge, bakery, mill, bridge, lamp street, town hall, bank, and riverside, plus the horse, the lamps, and the mill wheel. | Buildings on the one Kettlewick map. |
| `apps/web/app/lib/art/townLandscape.ts` | Sky, ground, and firs for morning, day, evening, and night. | The ground of that map. |
| `apps/web/app/lib/art/townPaint.ts` | The same paint helpers as the live file, at the revision that the buildings imported. | Restore only if a building file needs that revision. The live `townPaint.ts` is the one to edit. |
| `apps/web/app/lib/art/townPortrait.ts` | The cameos at that revision. | Restore only to compare. The live file already has the eight people. |
| `apps/web/app/lib/art/extraction.ts` | A crawler miner for iron, copper, or coal, and a second furnace. | A vein machine on the map. The live furnace is `floorMachines.ts`. |
| `apps/web/app/lib/art/fabrication.ts` | A press, a cutter, and an assembler. | Later fabrication, if a quest ever needs it. |
| `apps/web/app/lib/art/recycling.ts` | A scrap hopper with two toothed drums. | A scrap station. |
| `apps/web/app/lib/art/routing.ts` | A roller junction that splits or merges, and a sorter. | Belts, if the map ever has them. |
| `apps/web/app/lib/art/shipping.ts` | A crate, a truck, a depot, a dock, and a storage pile. | A dock or a storehouse. The live depot and truck are `floorMachines.ts`. |
| `apps/web/app/lib/art/materials.ts` | Ore, ingot, and coal at that revision, plus helpers the station sheet imported. | Compare with the live `materials.ts` before restoring over it. |
| `apps/web/app/lib/art/shared.ts` | Palette and elevation helpers at that revision. | Compare with the live `shared.ts` before restoring over it. |
| `apps/web/app/lib/art/contact-sheet.html` | The page that laid out the station sheet. | Regenerating `contact-sheet.png`. The png itself is still live. |
| `apps/web/app/lib/machineArt.ts` | The station sheet: mine, coal, furnace, press, cutter, assembler, splitter, merger, storage, sorter, scrap, dock, depot. | A picker of those machines. |
| `apps/web/app/components/town/TownView.vue` | The whole town view, including an optional debt line. | A map view. The debt line is not the game. |
| `apps/web/app/lib/townScene.ts` | Pixi scene: terrain, buildings, and a moving layer, 1000 by 420. | Drawing the archived buildings onto one map. |
| `apps/web/app/lib/townFixture.ts` | Names, buildings, and sample asks for that view. | Sample data for the drawing. The roles in this file do not match the live quests. |
| `packages/sim/src/packs/workshop/town.ts` | The old town simulation: days, a coin debt, and requests. | Not a drawing. The pictures were built against it. Do not restore the debt. |
| `packages/sim/src/packs/workshop/town-view.ts` | The snapshot types that simulation and the town view shared. | Types for the archived drawing, not a picture. |

`apps/web/app/components/town/ShedStreet.vue` and `apps/web/app/components/town/preview/` were removed in the same commit. They are a street strip and a preview app, not the drawings above. Restore them from the tag the same way if a street strip is needed.

Example:

```sh
git checkout art-archive -- apps/web/app/lib/art/townBuildings.ts
```
