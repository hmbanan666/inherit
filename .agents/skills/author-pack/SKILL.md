---
name: author-pack
description: Build a legacy Inherit game pack from a topic and learning goal, or extend a pack with a playable lesson. Not v8.
---

Legacy mode, not v8. Packs stay playable at `/?packs`. The game is the quest loop in [ADR 0022](../../../docs/adr/0022-quest-loop-no-loss.md).

Choose a course or independent challenges. Describe the player's first edit, who needs it and what the scene will visibly do. For a course, order lessons into named units and give each unit a landmark.

Use `pnpm new-pack <id>` and the [authoring guide](../../../docs/packs/AUTHORING.md). Set the scene, exercise kind and unit or challenge condition. Explain the concept in three to eight short lines with a different worked example. Put a TODO at the one-based edit location describing what the code must accomplish. Make the starter compile and leave the goal outstanding.

Give each operation a documented signature, parameters, return behaviour and example in player.ts. Write progressive hints. The last Beginner rung may show the edit. A Game or Advanced hint describes an approach. Scope input-labelled checks to observable outcomes.

Play each starter and reference from the same checkpoint with `pnpm test`. A new pack registers through its folder. Do not run a browser suite or screenshots.
