# The lesson flow lives in the sim

The audit found the step flow split across three layers: lesson text generated from strings in the sim, progression on a 1.2 s timer in the web store, validation in a module variable of the worker. Sections unlocked whenever a state condition held, so several fired on the same tick, and place names were plain strings.

From now on:

- Lessons are plain data records in the sim: id, who, the story line, the task (two or three lines), the new idea and its one-sentence explanation, the starter code, the three hint rungs, the checks, the solved text and the reward, and whether the button is Run or Deploy.
- A pure state machine in the sim holds the current step and its phase, `brief → working → solved`, and `continueStep` moves on. The UI only renders it. There are no timers in the progression.
- Reveals (sections, coins, debt, letters) wait in a queue in the sim and are released one per Continue.
- The sandbox records every primitive call of a run in order (file, line, function, arguments, result, the player function it ran inside, and a message for a failed call) and sends it to the UI, which plays it back on the floor and in the editor.
- The place type is a string literal union generated from the machines on the floor, refreshed when the player buys a machine. Unknown places fail with a plain message at run time.
- Dev and test hooks: `?step=<id>&speed=<n>` jumps to a lesson and speeds up the clock in development and tests, and the request card, checks, primary button and navigation carry `data-testid`s.

> Superseded by ADR 0021 (v8: inherit a factory, play on ticks).
