# Chapter 1 as a game: watched runs, then the loop

> Historical. This chapter was removed. It is not v8. [ADR 0026](../adr/0026-quantity-quests-one-world.md) is the vision. The legacy packs are a different mode.

## Problem Statement

Nick played the from-scratch chapter (#44) and failed it. As a beginner he saw only a code editor with no world, the first task asked for imports from two files, a constant and a two-argument `put` with a magic place name, the next task had an unclear goal, tasks advanced on their own after a timer, `inherit` and `onTick` appeared before anyone explained them, words like "verbs" and "wire-up" leaked into the text, the Deploy button shrank to the bottom, and a lone "Code" tab sat in the navigation. The world never appeared when he needed it. It felt like exercises, not a game.

## Solution

The shed is on screen from the first second: the mine, the furnace, the cart and Uncle's arm, labelled with their exact place names, and Bram in the doorway with a speech bubble. The player writes one line at a time in a single `main.ts` that already holds Uncle's note and import line. He presses **Run** and watches his code play out on the floor at a readable pace, line by line, with the arm moving and the result shown. Each task teaches one new idea with a story reason, ends on a solved card that says what he did, and waits for **Continue**. After he has pressed Run by hand for Bram's ingots a few times, Bram asks whether he means to do that all day, and the player learns `export function onTick()`; the button becomes **Deploy** and the cart fills on its own while he watches. Coins, the town, the inbox and the debt appear one per Continue. The rest of chapter 1 keeps growing the same project, ending as today with the debt paid and the bridge standing. Decisions: ADR 0014 and ADR 0015.

## User Stories

1. As a new player, I want to see a living shed with labelled machines and a person asking for help in the first second, so that I know this is a game and what I am working on.
2. As a new player, I want the first editor to contain Uncle's note and the import line already, so that my first task is a single line.
3. As a new player, I want my first line to be `take("mine")`, with "mine" autocompleted and the mine lighting up when I hover the name, so that I learn that a call names a place on the floor.
4. As a new player, I want to press Run and see the arm lift a rock while my line lights up, so that I can connect code to what happens.
5. As a new player, I want a clear "Done" card with what I did, the idea I used and a Continue button, so that I decide when to move on.
6. As a new player, I want each following task to add one new idea, explained in one sentence when it appears, so that I am never asked to use something nobody explained.
7. As a new player, I want `put("furnace")` to put what the arm holds, so that I do not need variables before I need decisions.
8. As a new player, I want "not ready yet" shown on the furnace when I take too early, so that waiting for machines makes sense.
9. As a new player, I want to wrap my lines into `smelt()` and `ship()` and see the function name over the arm while it runs, so that I understand what a function is for.
10. As a new player, I want Bram to ask whether I will press Run all day before `onTick` appears, so that the loop solves a problem I felt.
11. As a new player, I want one sentence on what the clock and `export` do when I first write `export function onTick()`, so that the magic words are explained.
12. As a new player, I want the primary button to say Run before the loop lesson and Deploy after it, so that I never hit "Export onTick" errors before I know what onTick is.
13. As a new player, I want to watch Bram's three ingots fill the cart at a calm pace after Deploy, so that I enjoy my automation.
14. As a new player, I want coins to appear only when Bram pays, with a "+64" moment, so that the reward feels earned.
15. As a new player, I want the Town tab, the Inbox and the debt to appear one per Continue, so that nothing arrives in a burst.
16. As a player, I want a misspelt place such as "mines" to say "There is no place called "mines". Places: mine, furnace, cart.", so that typos are easy to fix.
17. As a player, I want hints in three steps (the idea, the places and functions, the exact lines), so that I can try before I see the answer.
18. As a player, I want practice tasks after a new idea to give only the goal and the places, so that I apply what I learned.
19. As a player, I want every later request to change my existing code (a new requirement, a bug report, a refactor), so that the project grows instead of resetting.
20. As a player, I want new primitives to arrive as one-word additions to Uncle's import line, so that import syntax is learned gently.
21. As a player, I want all my code in `main.ts` until the Mayor asks me to move my functions into their own file, so that files and imports arrive when they help.
22. As a player, I want My library to list my functions collapsed by name and signature, so that I see my toolbox without clutter.
23. As a player, I want checks to describe the world ("A rock reaches the furnace", "Ingots in Bram's cart: 1 / 3") in red, amber and green, collapsed when passed, so that I know what is left.
24. As a player, I want no timers or penalties, so that I learn calmly.
25. As a player, I want the frame I know (top navigation starting with Shed, thin footer with a prominent primary button, menus, palette, Monaco editor beside the floor), so that the game looks like before #44 but plays better.
26. As a player, I want plain words: function, place, Run, Deploy, never "verb", "wire-up", "bench" or "kata".
27. As a player with an old save, I want chapter 1 to restart with my previous code kept as a snapshot, so that nothing is lost.
28. As a returning player, I want "Run once" in the button's menu after the loop lesson, so that I can debug a single tick.

## Implementation Decisions

- The sim owns the lesson flow (ADR 0015): lessons are data records, the step phase is `brief → working → solved`, `continueStep` moves on, reveals queue and release one per Continue. No timers in progression; the 1200 ms auto-advance and the bench are removed.
- `take(place)` lifts the front finished item into the arm's hand and returns its name or nothing; `put(place)` puts what the hand holds; both fail softly with a plain message when there is nothing to take, the hand is full or empty, or the place is unknown. At the start of a Run, the arm returns anything it still holds to where it came from.
- A Run executes `main.ts` once. The sandbox records each primitive call (file, line, function, arguments, result, message, the player function it ran in, the hand afterwards) and the floor and the editor play the record back at about two calls per second.
- After the loop lesson the button is Deploy: top-level code runs once on Deploy and `onTick` runs every tick. "Run once" (one tick) stays in the menu.
- The place type is a literal union from the machines on the floor, refreshed when machines change; hovering a place name in the editor lights up the machine.
- The shed shares its forge and street lamps with the Town view. Bram’s payment, Town, Inbox, Mrs Harrow’s first letter and the debt each have a separate Continue.
- Run once follows the deployed clock’s current state. A changed draft can try one tick without repeating setup purchases on the floor.
- The shop keeps story labels available and checks that an extra purchase leaves enough coins to finish the chapter. The bank shows any coins still needed for machines.
- Chapter 1 pace is retuned so Bram's three ingots take about 30 to 45 seconds after Deploy.
- Single `main.ts` until the Mayor's request; player-to-player imports only then.
- Concept order: call with a place name, sequence, nothing ready, function, tick loop, then variable and `if` (mixed vein), object property (`look`), loop over a list (breakdowns), parameters (`move`), and modules (the Mayor). Chapter requests and the ending stay as in ADR 0013.
- Frame as before #44: the primary button fills the footer height with its label and shortcut and never relabels on an error. The navigation starts with Shed; there is no Code tab.
- `?step=<id>&speed=<n>` dev and test hook and `data-testid`s on the task card, checks, primary button, Continue and navigation.
- Saves from the previous version restart chapter 1 with the code as a snapshot (ADR 0004).

## Testing Decisions

- Sim unit tests for the step machine, the reveal queue, hand semantics, unknown places and the reference playthrough of the whole chapter through the real sandbox, written in the player's style.
- Browser tests through the visible UI only: first screen shows the floor and labels; first Run plays back; solved card waits for Continue; Run becomes Deploy at the loop lesson; one reveal per Continue; the button size matches the pre-#44 footer.
- A naive-junior review: a fresh reviewer with no repository access sees only the screenshots and visible text of the first eight steps and reports where a beginner would get stuck; iterate until it reports none.

## Out of Scope

- Chapter 2, multiplayer, sound.
- Deleting the legacy v2 code (follow-up).
- A CI workflow (follow-up).

## Further Notes

- Source: `docs/audits/2026-11-21-foundation.md`, Nick's seven notes on #44.
- Supersedes spec #32.
