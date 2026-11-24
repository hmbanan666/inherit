# A gift blocks the quest that needs it

Accepted 24 November 2026. Amends [ADR 0022](0022-quest-loop-no-loss.md) and [ADR 0024](0024-quest-rail-and-status.md).

## Context

After Bram and Ines the level is 3. Elsie and Odile are both high enough to take. Elsie's first check is that drone-2 leaves the depot. That drone is Odile's gift, and it arrives on Hand over. Taking Elsie first leaves a quest that cannot be finished or switched.

## Decision

**One eligibility check.** `canTake` is the gate for Take and for `acceptQuest`. A quest can be taken when it is not cleared, the level is high enough, and `questHold` is empty. The request list still shows a held quest.

**A missing gift is a hold.** A quest may name `needs` as another quest's `gift`. Until that machine is in the world, Take stays closed. The sentence is the giver's name, the giver's building, and the gift: `Finish Odile's bridge for drone-2`. Odile's `gift` is the name of the drone. Elsie's `needs` points at that same gift. The save repair that grants drone-2 to a world already past Odile, or already on a later quest, is unchanged. A quest already taken stays taken.

## Consequences

The chain stays in `packages/sim/src/v8/quests.ts`. Other level-eligible requests stay open. Handing over Odile still grants drone-2, and Elsie can be taken after that.
