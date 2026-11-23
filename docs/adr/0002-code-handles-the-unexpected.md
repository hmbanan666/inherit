# Code exists to handle the unexpected

> Superseded by [ADR 0022](0022-quest-loop-no-loss.md). The player does not build the factory. Strain arrives as the next quest, not as a hiccup ladder.

If the mouse can do everything, code feels like homework. Code builds the factory (ADR 0007) and also decides what happens when things go wrong: mixed ore, jams, breakdowns, competing orders. Hiccups are seeded and deterministic, introduced one at a time by the story, and each one is something a few lines of code fix for good. Scale and "while you're away" pressure come later.
