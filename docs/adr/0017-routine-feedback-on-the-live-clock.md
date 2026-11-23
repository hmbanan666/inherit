# Routine feedback on the live clock

> Superseded by [ADR 0022](0022-quest-loop-no-loss.md). A failed call is a console line and costs nothing. v8 does not play calls back one by one.

A working controller can try a furnace several times before it has room. During a live tick, a routine failed pickup or drop shows a small status at the machine and a full Console entry with the source line. Watched Runs still play each attempt at the arm and its line in the editor, as described in ADR 0014. Unknown places and controller errors keep their prominent feedback in both modes.
