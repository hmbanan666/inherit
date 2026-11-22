---
name: author-pack
description: Build an Inherit game pack from a topic and learning goal, or extend a pack with a playable lesson.
---

Choose a course or independent challenges. Describe the player's first edit, who needs it and what the scene will visibly do. For a course, order lessons into named units and give each unit a landmark.

Use `pnpm new-pack <id>` and the [authoring guide](../../../docs/packs/AUTHORING.md). Set the scene, exercise kind and unit or challenge condition. Explain the concept in three to eight short lines with a different worked example. Put a TODO at the one-based edit location describing what the code must accomplish. Make the starter compile and leave the goal outstanding.

Give each operation a documented signature, parameters, return behaviour and example in player.ts. Write progressive hints. The last Beginner rung may show the edit. A Game or Advanced hint describes an approach. Scope input-labelled checks to observable outcomes.

Play each starter and reference from the same checkpoint with `pnpm test`. In Chromium, inspect Learn, the API and the visible effect. Continue once to the next lesson. Revisit a completed lesson, resume its frontier draft, and check the final world, stats and next destination. Use `pnpm shots` to inspect a published preview. A new pack registers through its folder.
