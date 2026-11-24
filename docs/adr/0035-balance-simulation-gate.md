# Balance simulation is the gate for gameplay changes

Proposed 24 November 2026. Builds on [ADR 0026](0026-quantity-quests-one-world.md) and [ADR 0032](0032-rewards-on-hand-over.md).

## Context

A quest can pass its own tests while the program for the previous villager clears it unchanged. A level-eligible request can depend on a gift still held by another villager. A shop price means little without the balance the player has when the item first appears. These effects depend on the history of one works.

## Decision

Every gameplay or economy change runs a reference player from a fresh Kettlewick Works through the final Hand over. The player uses the worker's session, deploys TypeScript into QuickJS, and pays for conveniences from the same purse throughout. The elapsed-time estimate uses the site's tick interval.

CI checks the resulting quest times, gaps between milestones, shop affordability, program changes, XP plateaus, and completion. A bounded trial of the previous program supplies evidence for a proposed edit. A known balance failure has a specific expectation with a reason and stays visible in the report. A new failure or a resolved expectation requires review. A softlock always fails the gate.

## Consequences

Gameplay changes update the reference players, balance targets, and [checked-in measurements](../sim/report.md) where the new behavior calls for them. The game data and its eligibility checks remain in the core. Nick's playtest measures the experience of learning the API, writing a solution, and deciding what to do next. The simulated clock measures the works while a specified policy plays. See [the balance simulation guide](../sim.md).
