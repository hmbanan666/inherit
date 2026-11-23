# One step at a time: the v7 lesson and challenge screen

Accepted 23 November 2026. Amends ADR 0019; 0019 stays in force where this does not change it.

## Context

The v6 first screen asked a complete beginner to read three columns at once: a Learn drawer that opened by itself with the whole course map, a scene caption, and a goal that named an outcome but not an action. Checks were red before anything had run, compiler messages were raw, and the solved card covered the effect the player had just caused. The [first-screen audit](../audits/2026-11-22-ux-v7-first-screen.md) traces each of these to the code. Fable's clickable prototype ([PR #62](https://github.com/hmbanan666/inherit/pull/62), `docs/prototypes/lesson-v7/README.md` on its branch) showed a screen where a beginner knows what to do within seconds. Nick also found that challenges which continue one another make the game harder, not richer.

v7 is a prototype of the frame and the game loop. It does not add content or visual polish.

## Decision

**Step card.** The goal line on top of the editor column is followed by numbered step chips that always end in "Press Run". It replaces the goal bar on both tracks. The current step is gold, finished steps get a tick.

**Gold marks only the next step.** At any moment exactly one thing is gold: the current step chip, or Run once the code is ready. Run sits top right at its full width. It is calm and outlined while the code is not ready, then fills gold and pulses a few times when the steps before "Press Run" are met. Ctrl+Enter also runs.

**Decreasing prefill.** A lesson prefills everything the player has already met and leaves one new thing to type, with the caret placed there and a grey placeholder. The support fades over the early lessons (fill the words, then the quotes and words, then a whole line). One plain comment above the code says what the line does.

**Checks.** Compact checks stay under the editor. Before the first Run they are grey rings, never red. After a Run a passed check is a mint tick, and an open check shows one plain sentence that explains the difference, read from the scene. Red is kept for real errors.

**Errors in plain words.** A compile or runtime error is translated into a short title and one sentence under the line (typo with "did you mean", wrong capital letter, missing quotes, missing quote or bracket, empty string, curly quotes, with a generic fallback). The token is underlined and the line tinted. The raw message stays behind "Technical details", with a Hint button beside it.

**Help on request.** Learn, Hints and the functions reference open only when the player asks. Nothing opens by itself. The course map leaves the drawer and becomes a popover on the progress chip in the nav.

**Solved card.** The scene reacts first. The card arrives about a second later and never covers the focus of the effect. It quotes the result, names the idea in one plain sentence and has one Continue, bound to Enter.

**Independent challenges.** Every lesson and challenge in every pack is self-contained: its own starter, its own fixture and scene state, and its own checks. No lesson starts from the player's previous code or relies on the world a previous lesson left behind. Packs keep their order for teaching, and a pack may show earlier results as decoration only.

**Workshop.** A challenge shows only the stations it uses. When checks run the program against hidden inputs, the screen says so in one line before the first Run ("Your code also runs on 3 more belts you cannot see"). The reference for `take` states that it returns `undefined` when the belt is empty.

**Scope of v7.** The frame applies to both packs in the real game. Content changes are minimal: lessons 1 to 3 of TypeScript from zero and Workshop challenge 1 are rewritten as reference examples of the format; every other lesson keeps working with defaults derived from its existing fields. The prototype route from PR #62 is not shipped.

**Standing frame.** Top nav, palette, IDE beside the game area, wide Run top right, compact coloured checks, no timers, solved card with one Continue.

## Exercise format, after Exercism

Lessons and challenges follow the format of the Exercism TypeScript track (https://github.com/exercism/typescript, MIT licence, Copyright (c) 2021 Exercism): each exercise stands alone, with short instructions, one goal, explicit visible tests and optional hints. In our terms:

- **Self-contained.** An exercise ships its own starter, fixture and checks. Nothing depends on an earlier exercise, so any exercise can be opened directly.
- **Short instructions.** The goal line and the step card are the instructions. Longer explanation lives in Learn, opened on request.
- **One goal per exercise.** One new idea or one skill to sharpen.
- **Visible tests.** Every check the code is graded on is listed under the editor in plain words, including the hidden-input runs in Workshop, which are named and counted even when their data is not shown.
- **Optional hints.** Hints are progressive and only open on request.

We borrow the format, not text. If exercise text or tests are ever adapted from that repository, the file keeps the MIT notice and names the source exercise.

## Replaces in ADR 0019

Learn opening by itself once per idea; the course map inside Learn; the goal bar; checks shown red before a Run; the solved card placed at once over the world; lessons that build on the previous lesson's code or state.

## Consequences

Lessons gain fields for steps, prefill with caret, placeholder, check reasons and a focus box; the validator gives sensible defaults so 49 lessons and 11 challenges keep working without rewrites. Filling those fields for the rest of the content is later work.

> Superseded by ADR 0021 (v8: inherit a factory, play on ticks).
