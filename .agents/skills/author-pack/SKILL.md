---
name: author-pack
description: Build an Inherit game pack from a topic and learning goal, or extend a pack with a playable lesson.
---

Start with the player's first edit and the change they can see from across the screen. Choose the pack level, genre and estimated time. Give each new idea one lesson and one visible world effect.

Use `pnpm new-pack <id>` for a new folder. Follow the [authoring guide](../../../docs/packs/AUTHORING.md) for the API, save and world-view contracts. Keep the starter compilable. Put the explanation at its edit line and finish the last hint with the exact edit.

Play each starter and reference with `pnpm test`. In the browser, enter from the showcase, edit in Monaco, watch the results and Continue until the ending. Inspect the collected pictures at desktop size. Check what remains in the world after switching away and back. A new pack is ready when its directory alone supplies the new entity, API, lesson, artwork and passing playthrough.
