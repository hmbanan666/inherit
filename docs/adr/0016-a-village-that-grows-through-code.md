# Direction: a village that grows through code

Status: direction for the game beyond chapter 1. Nothing here is implemented yet; chapter 1 scope (ADR 0013, ADR 0014) is unchanged.

## Context

Nick confirmed the setting after the foundation audit: automating work by writing your own functions from scratch is the right core. What should carry the game past chapter 1 is a place that visibly grows because of the player's code.

## Decision

- **A simple village that grows.** The game starts in a small village around Uncle's shed and grows with the player's work. The village is the frame of the whole game: it is visible early and every chapter adds to it.
- **Townspeople.** Named villagers ask for things, react to what the player builds and move into new houses and districts as the village grows. Requests stay the only source of coins (ADR 0013).
- **Strategy.** The player decides what to build next, in which order, and how to share scarce resources and machines between competing needs. No timers or penalties (ADR 0008); choices change the pace and shape of the village, not a fail state.
- **Meta-progression through buildings.** The player gathers resources and builds new buildings. Each new building unlocks new elements the player can code: new places, new primitives or story actions, new kinds of items and requests. Code gives the village its buildings, and buildings give code its new words.
- **Still from scratch.** Every new capability arrives as a small primitive or story action from `"inherit"`; everything above it the player writes himself and reuses (no black boxes, ADR 0013).

## Consequences

- Chapter 1 must not block this: the shed sits in the village from the start, the Town section shows the same village growing, and buildings and their unlocked elements are data, so later chapters add buildings without new UI frames.
- Future chapters are designed as building unlocks plus the requests they make possible; each gets its own ADR when it is planned.

> Superseded by ADR 0021. [ADR 0022](0022-quest-loop-no-loss.md) does not restore it. The village grows by quests, not by this ADR.
