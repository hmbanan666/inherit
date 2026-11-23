# Code builds, the canvas shows

> Superseded by [ADR 0022](0022-quest-loop-no-loss.md). The player writes the controller. The floor renders the world the sim sends. There is no build API.

Mouse building felt unintuitive and pulled play away from code. In v3 about 85-90% of play is writing code. Machines and belts are built from code (`ctx.build`, `ctx.connect`), and both calls are idempotent by name, so a controller can declare its factory every tick without paying twice. The canvas is mostly a live visualization: animated items, machines, hiccups and town changes show what the code did. The mouse only inspects (click a machine to see its state and the code line driving it), pans and zooms. This replaces the "mouse places machines" part of ADR 0002.
