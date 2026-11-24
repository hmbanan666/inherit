# Quest rail and status

Accepted 23 November 2026. Amends [ADR 0022](0022-quest-loop-no-loss.md). Amended by [ADR 0031](0031-quest-gift-before-take.md). [ADR 0033](0033-quest-card-stays-still.md) moves the live drone task off the quest card and onto one fixed status-bar line.

## Context

The quest rail had grown a title, a goal, a hint list, a quote, a second count, a Next list, and a shop-tier line. The header mixed credits, XP numbers, CPU, and a Running label. The footer listed every stockpile as `name number`.

## Decision

**The rail.** The header of a request is the portrait, the name, and one line in the villager's voice. Goals are progress lines with a bar, named by place, and the stuck check keeps its reason. Rewards are tiles for credits, XP, and a granted function. Hints are not on the rail. Taking a quest inserts one comment at the top of the open file. The comment is a nudge, never the solution, and never a shop. The same quest does not insert it again after the player deletes it. With no quest open, the rail lists the villagers who can be asked. Hand over appears when the goals are met. Until then the footer says the work is in progress.

**The chrome.** The header keeps the logo and the title on the left and Settings on the right. The center is two pills: credits, with a float when they arrive, and level, with the XP numbers on hover. The footer is a status strip: script, problem counts, caret, tick, and CPU when the tick is spending half its budget or has hit the limit. Each item has a tooltip.

## Consequences

- ADR 0022's hint clause now lives in the editor comment, and the check list lives on the rail.
- The screen layout follows this ADR.
