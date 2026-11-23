# Live checks under the editor

> v8 goal lines sit on the quest rail ([ADR 0024](0024-quest-rail-and-status.md)). They are open or done, they read the live world, they never complete the quest, and they never cost anything ([ADR 0022](0022-quest-loop-no-loss.md)). The Checks tab beside the code is the error log. Amber and the collapsed "N done" line stay with legacy pack lessons.

v1 had a short list of checks that turned green while the factory ran, and players liked watching them. v2 hid them behind a Tests tab and v3 dropped them. Without them a player has to guess whether the code is close.

From now on the panel under the editor has two tabs, Checks and Console, with Checks open by default. A check is one plain sentence about what the code should make happen ("The mine digs iron ore", "Ore reaches the furnace", "The furnace smelts ingots", "Ingots reach the cart: 1 / 3"). Each has a colour that updates live while the factory runs: red when nothing happened yet, amber when there is partial progress, green when it is done.

Checks come from the current request, not from a test runner. The request card and its checks tell one story: who asks and why, then the checks that describe what the factory must do, then the code line. Only the current request's checks are shown, usually three to five. Passed checks collapse into a single "3 done" line, and older requests' checks are not shown at all, so the panel never becomes a wall. Checks are gentle hints: they never block, never pop up, and never cost anything.

The sim evaluates checks from the world state each tick (next to the onboarding step), so the UI, the reference playthrough and the tests use the same definitions. Player-written `test()` cases from v2 can stay in the engine but are not shown in chapter 1.
