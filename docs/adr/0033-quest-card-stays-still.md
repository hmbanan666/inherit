# The quest card does not narrate the drone

Accepted 24 November 2026. Amends the quest-rail clause of [the screen layout](../specs/v8-screen-layout.md) and the status-bar list in [ADR 0024](0024-quest-rail-and-status.md). [ADR 0039](0039-quest-ux-village.md) replaces the rail with the village, the tracker, and the Journal.

## Context

The next step on an open quest followed the drone's task. While the quest was in progress that sentence changed with the task, and the portrait moved because the line grew and shrank. The words were a status, and they sat above the villager with no label.

## Decision

**The card names the next thing to do.** The sentence stays a player action: talk, take, press Run, smelt, carry, hand over, or the bring line. A live task does not replace it. A full cart still says to unload. The goal keeps two lines of height. The quantity line is one line, with tabular figures. The footer row keeps the height of the Hand over button.

**What the drone is doing sits in the status bar.** The line is `drone-1: mining Vein A`, one row, with an ellipsis. It keeps its height. The words change after the same task has held for two ticks. Cargo and stock stay on the map and the machine inspector. The inspector still names the task on the drone, on one fixed line.

## Consequences

The portrait stays put while the works tick. The machine inspector remains the place for cargo, position, and buttons.
