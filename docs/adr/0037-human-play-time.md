# Human play time is estimated beside the balance gate

Accepted 24 November 2026. Builds on [ADR 0035](0035-balance-simulation-gate.md) and the minute bands in [ADR 0036](0036-region-1-fabrication-chain.md).

## Context

The balance simulation plays a reference program as soon as a quest is taken. Nine quests finish in about eight minutes of machine time. That clock is the works. It does not include reading the villager, writing the program, a failed run, or a look at the shop. ADR 0036's bands include reading and debugging. Nick's playtest is still the experience. The report had no number for it.

## Decision

The same reference run estimates human play time. Human minutes are the bot's quest time plus four overheads:

- **Reading.** Dialogue and quest text, by word count.
- **Writing.** The line diff from the previous reference project to the next, at a rate per line, plus a one-time cost for each works API call and each concept the first time it appears. The concepts are a function, a loop, multiple inputs, and routing.
- **Debugging.** An expected number of failed runs, higher when the quest introduces a concept, times the time to run and inspect. The successful run stays in the bot column.
- **Shop and inspection.** A new shop row, the hand-over that can first afford a convenience, a purchase, and a machine the tick it appears.

Every rate, concept rule, and profile multiplier lives in [sim/human.ts](../../sim/human.ts). The profiles are fast, average, and new to TypeScript. Average is the default. The report shows a per-quest table for that profile: bot minutes, each overhead, human minutes, and cumulative time. Each profile has a total line.

Three checks are warnings, not balance failures. An average quest longer than about 25 minutes warns. A stretch of machine time longer than about 15 minutes with no code change warns. An edit that adds no new function, branch, loop, or API call warns. `pnpm sim` does not fail on these. A warning is not an expected-failure key.

The diff is the deployed project, including files under `lib/`. Reference programs grow by quest. Each quest keeps the previous files and adds the step it teaches: die switching, the lathe, two-input assembly, cargo-dependent routing, then manifests. A swapped literal or job name is not new code. A token diff at or below the count in `sim/human.ts` is not new code either. New code is a new function, a branch, a loop, or an API call, and it has to clear that count. A quest whose edit is not new code warns. That warning is not a balance failure, and it is not silenced by raising the caps.

## Consequences

Content changes read the Human time section of [the report](../sim/report.md), as [the simulation guide](../sim.md) describes. The constants change when the model should change, not to hide a long quest. The gate from ADR 0035 is unchanged: quest duration on the tick clock, gaps, shop affordability, program changes, XP, and completion. Nick's playtest remains the judgment of how the works feel. This estimate is the number to look at before that playtest, and the reason a long wait or a front-loaded program shows up in the report.
