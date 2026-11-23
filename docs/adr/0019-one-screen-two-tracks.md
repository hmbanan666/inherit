# One screen, two tracks

Accepted 22 November 2026.

## Context

In the v5 playtest a beginner could finish a starter by copying its comment, yet reached a loop without knowing what repeated. In Workshop a player who could already program had to follow Bram’s story to reach a condition worth solving. Four successive clicks after his loop changed small things outside the player's focus. The [UX audit](../audits/2026-11-22-ux-v6.md) traces these experiences to the lesson contract, studio and playback.

## Decision

Ship **TypeScript from zero** as a finite, ordered Beginner course. Group short lessons into ten units. Teach syntax before asking for it. Open a short theory card with a tiny example in another situation. Give each lesson one goal, a reason visible in its scene, a starter with TODOs describing the desired outcome, progressive hints, compact checks and a visible result. Reading, predicting and repairing alternate with writing. Reuse scene parts and let the player build functions across several units. Show every unit, its done/current/locked lessons and the finish in the course map. Preserve drafts on revisit. Mark a unit with a permanent village landmark.

Ship **Workshop** at Game level. Each challenge has an independent typed-parcel fixture, a measurable condition, comments-only starter and input-labelled checks. The arm moves parcels between four labelled places: the incoming belt (`belt`), left bin (`left`), right bin (`right`) and dispatch cart (`cart`). Counting challenges also use a scale display. The player may start anywhere. Remove the whole economy and story progression. Put the rules, examples and typed reference within reach. Introduce automation with a dedicated challenge and an on-screen explanation of Run, Deploy and Stop.

Adopt the audit’s thirteen ordered changes, specified in [the implementation sequence](../specs/v6-course-and-challenges.md#implementation-sequence). Use the same frame and sim-owned lesson flow for both packs. A nav progress strip, palette and wide primary action sit above the resizable game and IDE. Checks stay directly under the IDE. A single drawer overlays the game for Learn (including the map), Hints, API and Console. Pause/Play, speed and the tick counter live on the game. A watched call and its arm movement share one timeline. Live ticks retain a steady gutter mark across tick boundaries. Remove section switching and deployment history.

Centre the celebration over the game, with a little confetti, the idea learned and one focused Continue bound to Enter. Advancing commits every earned effect together. Drain any legacy reveal queue on that click during the transition, then remove reveals and release from the contract. Extend lessons with unit, exercise kind, theory and challenge task. Author scene, controls and celebration through pack data. Keep a versioned save per pack. Archive v5 Workshop under ADR 0004 and carry over Beginner completion for surviving lesson ids.

## Decision history

- **0018** supplies the showcase, discovery, pack levels, typed bridge, isolated runner, validation and per-pack slots. Replace its 13-lesson village, v4 Workshop port and live chapter import, teaching through answer-shaped starter comments, section unlocks, solved-card placement and one reveal per Continue.
- **0001, 0003, 0008, 0013, 0016** lose their remaining Workshop town, debt, orders, coins, construction and chapter progression. Preserve 0008’s calm pace and the player's authorship of functions. Village landmarks in the course record learning.
- **0002, 0007, 0010, 0014** inform visible consequences, the one-item hand and watched calls. Replace the machine-building syllabus, prefilled import, story rewrites, solved-card location and per-click rewards with independent floor conditions.
- **0005, 0011, 0012, 0015** now disclose help inside the drawer. Replace growing navigation sections, the Console below the IDE and queued reveals. The sim still evaluates checks and owns advancement.
- **0004, 0006, 0009, 0017** continue to govern archived code, palette, readable API documentation and quiet routine feedback. Extend the last two with full reference entries and synchronized playback.

## Consequences

The runner can validate a course frontier or an independent fixture with the same lesson evidence. The studio must distinguish a selected lesson from earned progress, and tick simulation from presentation of that tick. Old Workshop code needs a recovery path outside the play screen. Use the [curriculum](../specs/v6-beginner-curriculum.md) and [challenge briefs](../specs/v6-workshop-challenges.md) as the content contracts.

> Superseded by ADR 0021. [ADR 0022](0022-quest-loop-no-loss.md) does not restore it. Packs stay playable as a legacy mode.
