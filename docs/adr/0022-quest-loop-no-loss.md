# Quest loop, no loss

Accepted 23 November 2026. Amends [ADR 0021](0021-v8-inherit-a-factory.md). Supersedes ADR 0002, 0003, 0005, 0007, 0010, 0011, 0013, 0014 and 0017.

> Amended by [ADR 0023](0023-quest-unlocks-functions.md) (functions come from quests, veins do not run out), [ADR 0024](0024-quest-rail-and-status.md) (the rail and the status bar), [ADR 0025](0025-functions-with-triggers.md) (triggers and depot delivery), and [ADR 0026](0026-quantity-quests-one-world.md). ADR 0026 withdraws the speed bonus, the par time, and the shop-tier schedule in "Decided by architect" below. Those paragraphs stay as the record of what was decided that day. They are not in force.

[ADR 0023](0023-quest-unlocks-functions.md) amends the shop clause and the vein clause: a function is granted by taking the quest that needs it, veins do not run out, and quests stay quantities with no rate and no deadline. [ADR 0024](0024-quest-rail-and-status.md) moves the hint into the editor and the goals onto the rail.

## Context

PR #77 shipped one quest at a time at Kettlewick Works. ADR 0021 still specified deadlines, rent, bankruptcy, pause, speed buttons, a ban on the quest card and on visible checks, and the deletion of packs. The code and Nick's decisions of 23 November 2026 disagree with those clauses. This ADR is the loop.

## Decision

**The place.** The player inherits Uncle's workshop, Kettlewick Works, in a village. Villagers give quests, in order: Bram, Odile, Elsie, Tomas, Pell, Wen. One quest is open at a time. The player takes it with **Take quest**. The next one waits until this one is completed and the level is high enough.

**The card and the checks.** The card states the goal and why the current program is not enough. Checks sit under the editor and read the live world on every tick, counting from the moment the quest is taken. **Complete quest** is manual. It pays that quest's credits and XP only when every check passes. The quest pays nothing when the goods merely arrive. Each quest stays open under the program that cleared the previous one. The player keeps growing `lib/`.

**No loss.** There is no rent and no bankruptcy. Credits rise only when a quest is completed and fall only in the shop. The balance never goes negative: a tick cannot lower it, and the shop refuses a purchase the player cannot pay. A failed check, a refused purchase, and a runtime error cost nothing. The game does not wipe the works. **Start over**, behind a confirm, is the only reset, and it is the player's.

**No deadline.** A quest does not expire, and late work is not paid less. An optional speed bonus is specified below and is not in the code yet.

**The clock.** Ticks always run, including while the tab is hidden. v8 has no pause and no speed buttons. The tick is 0.5 s. The sim is deterministic and has no UI, so a later server can own the same clock for async multiplayer. The client renders snapshots and submits code. Legacy packs keep the playback bar they already have. That bar is not part of v8.

**Not idle.** The clock running is not the game playing itself. Uncle's program never brings the cart home, so nothing is delivered and no credits move until the player edits, deploys, and completes a quest.

**Shop, XP, levels.** Credits are spent in the shop. A purchase applies at once and stays. XP from completed quests raises the level. On this chain the thresholds are 20, 40, 65, 90, 115 and 145, and each quest's XP crosses exactly one. The next villager unlocks at the level that reward reaches. Shop tiers are specified below and are not in the code yet: today every item is listed, and the price is the only gate.

**CPU.** The frame shows used and limit. A call that would pass the limit does not run, the rest of that tick's player code is skipped, and the sim still finishes the tick.

**Hint.** The why line is the hint. It never contains the solution.

**Checks.** [ADR 0012](0012-live-checks.md) still puts checks under the editor. For v8 they are open or done. They do not use amber, they do not collapse, and they do not complete the quest.

**Packs.** Packs stay, as a legacy mode at `/?packs`. Their docs stay. They are not v8, and their code is not deleted.

**Sessions.** A session is the saved works. Audit and the next inheritance stay as ideas and obey no-loss. Both are specified below and are not in the code. After the last quest the card says more is coming.

**Frame.** Build on the existing frame and components. Do not restart a screen from scratch.

**Checks before a PR.** `pnpm test`, `pnpm typecheck`, and `pnpm build`. Nick playtests. Agents do not run browser suites or screenshots. CI does not run them either.

## Decided by architect 2026-11-23

- A hint may name a field, a brick, or a shop item, and it never shows the expression. The six why lines already do this, and the expression is the solution the hint must not give.
- The speed bonus is 25% of that quest's XP, rounded half up, when the quest is completed within a par time shown on the card. There is no penalty. Par times are measured from a working solution when the bonus is implemented, and stored on the quest in ticks. A guessed par would be either free or impossible, and the bonus is not in the code.
- Levels on this chain stay the thresholds already in `levelFor`. From level 7, the next level costs 100 times the current level in XP. Applying 100 times level from level 1 would make the six quest rewards miss every level. With or without the bonus, those six rewards still raise one level each.
- Shop tiers, when built, open with the villager who needs them: level 1, bigger cart and hotter furnace; level 2, alloy; level 3, second drone; level 4, prospect; level 6, CPU +10. The tool is for sale when that quest can be taken, and buying it does not pass a check. Until then the shop lists all six items.
- Audit, when built, is a summary after the quest chain: credits, level, quests completed, shop items owned, and the names exported from `lib/` that `main.ts` still imports. Every `lib/` file is kept. A ranking must not become a wipe.
- The next inheritance, when built, is a new site and map. `lib/` is copied, credits and XP are kept, and the new site supplies its own `main.ts`. The library is what the player inherits; the new works are the new problem.
- A failed check never costs credits or XP. Completion and purchase already refuse without charging, and a miss must not grow a penalty later.
- The CPU line in the nav is the rule for overflow: the overspending call does not run, the rest of `onTick` is skipped, and the sim tick continues. That is what the meter and the guest interrupt already do.
- `order.due` is not a deadline, is not shown, and does not change pay. The field is still on the order type; displaying or scoring it would put a deadline back.

## Consequences

- ADR 0021's pressure, pause, speed, step-card ban, and pack-removal clauses no longer apply.
- The concept, the first-playable spec, the glossary, and `AGENTS.md` follow this ADR.
- Game code is unchanged by the ADR. Where a rule above is not in the code yet, it is marked later and must not be improvised as rent, a deadline, or a wipe.
