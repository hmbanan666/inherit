# The CPU meter stays on the status bar

Accepted 24 November 2026. Amends the status-bar clause of [ADR 0024](0024-quest-rail-and-status.md) and [the screen layout](../specs/v8-screen-layout.md).

## Context

CPU is the limit the player hits. The status bar showed used and limit only after a tick had spent half the budget, or had already hit the limit. The rest of the time the number was absent, and the console line was the only signal.

The world's `cpu.used` and `cpu.limit` are the budget. The shop's CPU +10 adds 10 to that limit. Wen's quest sets it. The guest had also kept the limit from deploy, so a purchase could raise the world and leave the guest on the old ceiling.

## Decision

**The meter is always on the status bar**, beside the drone line. It reads `world.cpu` and does not keep a second copy of the numbers. The label is `CPU 34/50`. A short bar shows the same ratio. The width is fixed and the figures are tabular.

**The spent figure is the highest of the last few ticks.** A quiet tick does not flicker the bar. The limit is the limit on that snapshot. Buying CPU +10, or a quest that sets the limit, changes the meter on that snapshot.

**Three tones.** At or under 80% the meter stays quiet. Above 80% it is gold. At the limit it is the alert color and the bar is full. The console line `CPU limit (n) hit.` stays. The tooltip says that CPU is the budget for one tick, that a call past the limit does not run, and that CPU +10 in the shop raises the limit.

**One ceiling.** The guest's per-tick ceiling is `world.cpu.limit` when the host supplies it. The budget captured at deploy is the ceiling only when the host does not.

## Consequences

ADR 0024's half-budget hide no longer applies. The page does not recompute the shop bonus. A full bar is the over-limit state, because a call that would pass the limit is clamped to it and does not run.
