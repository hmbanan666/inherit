# UX audit for v7: the first screen (2026-11-22)

> Historical snapshot of `b4d3de7`. Not the current game. The beginner pack was removed ([ADR 0030](../adr/0030-packs-removed.md)). [ADR 0026](../adr/0026-quantity-quests-one-world.md) is the v8 vision.

Scope: an audit only. No product code was changed. Inputs: ADR 0019, the [v6 audit](2026-11-22-ux-v6.md), `docs/specs/v6-beginner-curriculum.md`, `apps/web/app` and `packages/sim/src/packs/beginner` on `main` at `b4d3de7`, the owner's lesson 1 screenshot, and a local walk through lessons `hello`, `sign-spaces` and `call-order` at 1280×800 and 390×844 (`pnpm dev`, `?pack=beginner&lesson=<id>`). Screenshots are attached to the PR that adds this file.

## Verdict

The owner is right: a person who has never coded cannot tell what to do on lesson 1. The screen has every part the v6 audit asked for, but it reads like a reference page, not like a game. There are three columns of text, the same sentence appears three times, the one action (type words on line 2 and press Run) is never stated, and the reward hides the effect it rewards.

The fix is not more explanation. It is **one step card** that says what to do in the player's words, an editor that already holds the shape of the line, a scene that shows the problem without a caption, checks that speak about the scene, and errors that name the fix. The Learn drawer stays, but it stops opening by itself and stops holding the course map.

**The five-second test.** In one glance a beginner should see three things. They should see a person in the scene who needs something (a visitor with an empty speech bubble), one sentence that tells them what to do with a line number in it, and a blinking caret between two quotes with grey example words. Everything else is quiet or hidden until asked for.

## 1. Diagnosis: lesson 1 through a beginner's eyes

What the screen shows at 1280×800 (screenshot `01-hello-start-1280`), in the order the eye lands:

1. **The Run button (top right, gold, the brightest thing on screen).** It is the strongest call to action, but nothing has been typed yet. A beginner presses it first. The result (`03-hello-run-empty`) is a grey line, “Your code ran. Check the TODO and try again.” They have not written code, they do not know what a TODO is, and nothing in the scene moved. *Source:* `PackStudio.vue` (`runMessage` on `data.noCalls`).
2. **The Learn drawer (centre, opens by itself).** It has 13 lines of prose, a code sample, a “Condition” block, “Got it”, then a **Course map** with a unit tree and padlocks. At 1280×800 it is 280 px wide, covering 41 % of the 677 px game area, including the cottage and the right half of the village. Its first paragraph introduces three new words (code, comment, TODO) and the next one a fourth (function), before the player has done anything. *Source:* `SideDrawer.vue` (the Learn tab renders theory, task, prediction, the panels slot and `nav[aria-label="Course map"]` in one scroll; style `width: min(360px, 40%)`), `pack.worker.ts` (`showLearn` is true on the first visit of every lesson with `theory`).
3. **The scene header band, “Visitor at the gate / A visitor is waiting. Mila waves and her bubble displays the greeting.”** It is cut off by the drawer. It is the lesson's `cue` and `reason` (`WorldView.vue`, `.scene-note`). The same `reason` text appears again in the drawer under “Condition” (`course.ts` maps `task.condition` to `page.reason`). The player reads it twice in two fonts and still does not learn what to type.
4. **The goal bar, “Give Mila a greeting at the gate” (right column, 16 px).** This is the only line that names the task, and it names the outcome rather than the action. It has no line number, no mention of `say`, quotes or Run. The `?` button next to it reopens the drawer the player just closed. *Source:* `GoalBar.vue`.
5. **The editor: `1 // TODO: Give the visitor a greeting in Mila's voice.` and an empty line 2.** The comment is grey italic at 13 px. It uses the word TODO and the phrase “in Mila's voice” (meaning `say`, which is never named here). Line 2 is empty, with no hint of the shape `say("…")`. A person who has never coded has nothing to copy, except the drawer example `say("The lantern is lit.")`, which they then retype or paste. *Source:* `units/01-calls-and-strings.ts` (`starter`), `CodeEditor.vue` (`fontSize: 13`).
6. **The checks (two red circles before anything has happened).** “The player calls say with nonblank words” and “Mila displays those words and waves”. They are red (`--alert`) at rest, so the first impression is “already wrong”. The wording is test-suite language (“the player”, “calls”, “nonblank”). *Source:* `ChecksPanel.vue` (`status` defaults to `red`; `[data-state='red'] { color: var(--alert) }`), check labels in `01-calls-and-strings.ts`.
7. **The scene itself.** Mila is about 55 px tall, name tag included, in a 677×620 px scene, standing among a whole village (house, two orchards, lamps, stream, basket, bench). The “visitor who is waiting” is **not drawn**. Only the caption mentions them. The bottom prop strip shows a lone `—`. *Source:* `VillagePanorama.vue` (full 760×555 viewBox, no visitor), `WorldView.vue` (`{{ value || '—' }}`).
8. **The progress strip, “Unit 1 · Lesson 1 of 52”.** On the very first screen this reads as “you have 51 more of these to go”. *Source:* `ProgressStrip.vue`.

### Where a beginner gets lost

| Moment | What they do | What happens | Cause |
| --- | --- | --- | --- |
| Arrive | Read the drawer top to bottom | Four new terms, then a course map with padlocks. No instruction to type anything on line 2. | Theory is written as a definition list. The action is buried in sentence 1, “Write your instruction below the TODO comment.” |
| Close drawer | Look for what to do | Goal bar names an outcome only. Line 2 is empty. | `GoalBar` has one field (`goal`). The starter has no scaffold. |
| Press Run on empty code | Expect something | “Your code ran. Check the TODO and try again.” Nothing moves. | `noCalls` message. It is not blank-aware. |
| Type `say(Hello)` | Reasonable first try | Red squiggle, then on Run: “main.ts:2 · Unknown name “Hello”. Check the spelling on this line.” The spelling is fine. The missing thing is the quotes (`05-hello-no-quotes-run`). | `player-error.ts` treats every unknown name as a typo. |
| Type `Say("Hello")` | Capital S | “main.ts:2 · Unknown name “Say”. Did you mean “say”?” Good, but the `main.ts:2 ·` file prefix is noise for a beginner. | `player-error.ts` keeps the `at` prefix. |
| Type `say("")` | Empty quotes | The runtime error “Use a short, nonblank string.” | `world.ts` `words()`. |
| Solve | Type `say("Welcome to the village!")` | The celebration card appears **on top of Mila and her bubble** (`07-hello-solved`). The bubble itself is cut to “Welcome to the…” after 15 characters. The only full echo of the player's words is the bottom strip. | `CelebrationOverlay.vue` is centred over the world at once; `VillagePanorama.vue` `boundedName` truncates at 15. |
| Lesson 2 | Type `paintSign("MoonFerry")` | The sign shows “MoonFerry”. The check stays red, “The sign matches the ticket”, with no reason. The ticket exists only in the header caption, not in the scene (`09-sign-spaces-wrong`). | `check()` returns a colour only. `Waterside.vue` draws no ticket. |
| Lesson 3 | Type a departure line and press Run | Run does nothing visible. The drawer reopens with the prediction question halfway down, under “Condition” (`11-call-order-run-before-prediction`). Nothing says “choose first”. | `PackStudio.run()` opens Learn silently when `prediction` is unanswered. |
| Narrow (390 px) | Open lesson 1 | Run on its own row, scene caption, then a bottom sheet covering 75 % of the screen. After closing, the editor has a large empty area and the checks are pinned at the bottom of the viewport, far from line 2 (`12`–`14`). | `SideDrawer.vue` `max-height: 75%`; `.editor-dock` layout in `game.css`. |

### Counting the words

Before the player types anything, lesson 1 asks them to read **about 165 words** across seven text blocks (scene band 16, drawer theory 65, condition 15, map 40, goal 7, comment 9, checks 13). Only 6 of those words (in the theory paragraph) say *where* to type, and none say *what* to type or to press Run. The same sentence (“A visitor is waiting…”) appears twice. The jargon in view is: code, comment, TODO, function, call, parentheses, string, text value, nonblank, player, Condition, Console, API.

### Root causes

1. **No “step” field.** A lesson has a `goal` (outcome) and a `theory` (concept) but nothing for the *action*. The UI therefore cannot say “type here, then press Run” (`framework/pack.ts` `Lesson`).
2. **Learn is the entry point.** ADR 0019 opens Learn on the first lesson of an idea. In unit 1 every lesson introduces an idea, so the drawer opens every time, over the scene, with the map attached.
3. **The scene explains itself in a caption** (`cue` and `reason`) instead of in pictures. The props that carry the reason (the visitor, the ticket, the flipboard) are not drawn.
4. **Checks are boolean.** `Check.evaluate` returns a colour. There is no way to say *why* it failed in the player's terms.
5. **Error translation knows three patterns** (`player-error.ts`). It does not know “missing quotes”, “missing brackets” or “empty string”, and it keeps the file prefix.
6. **The celebration is instant and central.** It lands before the player has looked at the effect, on the very spot where the effect happened.

## 2. Proposed lesson screen

### Principles

- **One instruction, one place.** The step card above the editor is the only place that says what to do. The scene shows *why*. Learn explains *more* only when asked.
- **The screen reads left to right like a sentence.** Scene (who needs what), then the step card (what you do), then the editor line (where), then Run (go).
- **Show the shape, let them fill it.** Early lessons pre-write the call so the first keystroke is a word, not syntax.
- **Neutral until tried.** Nothing is red before the first Run.
- **The effect first, the reward second.** The player sees their words in the world before any card appears.

### Visible by default

| Zone | Contents | Size at 1280×800 |
| --- | --- | --- |
| Top nav (unchanged frame) | Logo, pack switcher, **unit chip** (“Calls and strings ●○○○”), settings, wide Run | 64 px tall. Run is 160×44 px. |
| Game area (left, 52 %) | The scene, **no caption band**, cropped by a per-lesson camera so the subject is at least 110 px tall. The lesson's target is drawn (visitor, ticket, board). A result strip appears only after a Run. | About 660×710 px |
| Step card (right column, top) | **Goal** (one line, 20 px, 600), **steps** (one to three numbered lines, 16 px, each with a tick), **idea line** (“New: … More ›”, 13 px, opens Learn) | 120–150 px tall, no inner scroll |
| Editor | Starter with a plain comment and the pre-filled line, caret placed, ghost text in grey. **16 px font, 26 px lines** for Beginner units 1–4, 15 px after that. | Auto height, at least 4 lines |
| Checks (directly under the editor) | One or two checks in scene language. Grey circles until the first Run, then green ticks or red crosses with a one-line reason. Plain-word errors appear here and as a widget under the faulty line. | 24 px per row |
| Status footer | Saved state only | 24 px |

### Moved into the drawer or a popover

- **Learn drawer** (on demand only, from “More ›” on the idea line or the `?`): theory, the example, and nothing else. No “Condition” block for course lessons (the scene and step card carry it). No course map.
- **Hints, API, Console** tabs: unchanged. The Hints tab gets a dot after the second failed Run.
- **Course map**: a popover from the unit chip in the nav (see section 4).

### Reading order and timing (lesson 1)

| Time | The eye lands on | Why it lands there |
| --- | --- | --- |
| 0–1 s | The visitor at the gate, with an empty “…” bubble, and Mila facing them | Largest figures, centre of the game area, the only animated element (the bubble's dots pulse) |
| 1–2 s | Goal, “Make Mila say hello to the visitor.” | Top of the right column, biggest text on that side |
| 2–4 s | Step 1, “Type a greeting between the quotes on line 2.” | Numbered, directly below the goal. “line 2” matches the gutter. |
| 4–5 s | Line 2, `say("▌Hello!")`, caret blinking between the quotes, “Hello!” in grey | The editor has focus, and line 2 has the line highlight |
| after typing | Step 1 ticks, and step 2 “Press ▶ Run” turns gold. The Run button pulses once. | The tick is the first feeling of progress, and the pulse points to the next move |

### The one instruction

The step card replaces `GoalBar.vue` for the course track. Its fields come from lesson data:

```
Make Mila say hello to the visitor.                                  ?
① Type a greeting between the quotes on line 2.                       ✓ when line 2 changes
② Press ▶ Run.                                                        gold when ① is done
New: text inside quotes is called a string.   More ›
```

Rules: the goal is a story outcome, at most 50 characters. Steps are imperative, at most 70 characters each, at most three, and the **last step is always “Press ▶ Run.”** The first step names a line number that matches the gutter. The idea line appears only when the lesson introduces something new.

Step ticks are computed in the client from the editor and Monaco diagnostics, and have no game meaning. A step is “done” when the edit line differs from the starter and has no syntax diagnostics. A prediction step is done when a choice is recorded.

### How the editor is pre-filled

Scaffolding fades across a unit. Each new call or syntax goes through three steps:

| Stage | When | Starter shape | Caret |
| --- | --- | --- | --- |
| **Fill** | The first time a call or syntax appears | The whole line is written, with the value missing: `say("")` | Between the quotes |
| **Ghost** | The second time | An empty edit line with grey ghost text of the *shape*, not the value: `paintSign("")` | At column 1. Typing replaces the ghost; Tab accepts it. |
| **Blank** | The third time and later | An empty line under a plain comment | At column 1 |

Ghost text is a Monaco injected-text decoration on the edit line (`after.content`, class `ghost`). It is not part of the file, is never saved and disappears on the first keystroke on that line. A fill line may also carry a ghost *value* inside the quotes (“Hello!”) so that Tab-then-Run works for a player who is frozen. That still teaches the full loop and earns the check.

Comments in Beginner starters are plain English, one line, and never use `TODO:`. For example, `// Mila says the words inside the quotes.` A “fix” lesson quotes the broken line as today.

### How Run is invited

- Run is always enabled (except while busy or solved).
- When step 1 is done, the step 2 number turns gold and the Run button gets a single 600 ms ring pulse (none under `prefers-reduced-motion`). It never pulses twice for the same edit.
- The label stays “▶ Run” with the shortcut chip, which shows `⌘↵` on macOS and `Ctrl+Enter` elsewhere.
- A Run on an untouched starter does not say “Your code ran”. It flashes step 1 and shows, under the editor, “Nothing new yet. Type on line 2 first.”
- In a predict lesson, Run before a guess does not open the drawer. It highlights the guess row in the step card with “Pick a guess first. There is no wrong answer.” and does not run.

### How checks read

| Today | Proposed |
| --- | --- |
| ○ The player calls say with nonblank words (red) | ○ Mila says your words (grey) |
| ○ Mila displays those words and waves (red) | ○ The visitor waves back (grey) |
| ○ The sign matches the ticket | ○ The sign says “Moon Ferry”, like the ticket |
| ○ Boarding appears first | ○ The board shows “All aboard” first |
| ○ Departure appears second | ○ Then it shows your departure message |

Rules: describe what the player will *see in the scene*, in the present tense, at most 45 characters. Never say “the player”, “calls”, “nonblank”. Use a programming word only if it is the word this lesson teaches.

States:

- **Before the first Run:** grey `○`, normal weight.
- **Passed:** mint `✓`. A short scale pop as it turns, one check at a time, in the order the playback reaches them.
- **Failed after a Run:** red `✗`, plus one line of reason from the check's new `explain` function. The reason quotes what happened and what was expected, and ends with a fix verb. For example: “The sign says “MoonFerry”. The ticket says “Moon Ferry”. Add the space.”
- **Code stopped (an error):** the checks stay grey, and the error line takes their place at the top (see below).

### How the scene reacts

- **Before Run:** the target is drawn and waiting (a visitor with an empty bubble, a blank sign next to a ticket, a flipboard with two blank rows). Nothing moves except one idle cue (the bubble dots, a bobbing boat).
- **During Run:** the current line is highlighted (as today) and the effect plays at the existing watched-run pace.
- **Correct:** the effect plays fully, then a small secondary reaction (the visitor waves, the boat docks, the train leaves). Then the celebration.
- **Ran but wrong:** the effect still plays with the player's value (the sign really says “MoonFerry”), followed by a gentle “not quite” reaction (the visitor tilts their head with a “?”, the boat stays out). No card, no buzzer, no shake.
- **Error:** the scene does not change. Mila shrugs once.

### Errors in plain words

The error appears in two places. A Monaco content widget sits directly under the faulty line (one line, red left border). The same text replaces the checks' top line. The `main.ts:2 ·` prefix becomes `Line 2:`. Monaco hover messages for Beginner packs use the same translation, so the squiggle and the Run result agree.

| Player typed | Today | Proposed |
| --- | --- | --- |
| *(nothing)* + Run | Your code ran. Check the TODO and try again. | Nothing new yet. Type on line 2 first. |
| `say(Hello)` | main.ts:2 · Unknown name “Hello”. Check the spelling on this line. | Line 2: Words need quotes around them, like `"Hello"`. |
| `Say("Hello")` | main.ts:2 · Unknown name “Say”. Did you mean “say”? | Line 2: Capital letters count. Write `say`, not `Say`. |
| `sya("Hello")` | main.ts:2 · Unknown name “sya”. Did you mean “say”? | Line 2: The game does not know `sya`. Did you mean `say`? |
| `say("Hello)` | main.ts:2 · Close the words with a matching quote. | Line 2: Add a closing `"` after your words. |
| `say("Hello"` | main.ts:2 · Add the closing ) to match the opening one. | Line 2: Add a `)` at the end to close the brackets. |
| `say "Hello"` | raw TypeScript message | Line 2: Put the words inside round brackets: `say("Hello")`. |
| `say("")` | Use a short, nonblank string. | Line 2: Mila needs some words between the quotes. |
| `say(5)` | raw TypeScript message | Line 2: `say` needs words in quotes, not a number. |

Detection notes: “Unknown name X” where X is not within edit distance 2 of a known function **and** X is an argument inside `(...)` maps to the quotes message. A case-only difference maps to the capitals message. For Monaco hovers, TypeScript diagnostic codes 2304 (cannot find name), 1002 (unterminated string literal), 1005 with `')'` (missing bracket), 1005 with `';'` directly after a known function name (missing brackets around the words) and 2345 (argument type) map to the rows above. Anything unmatched keeps today's text without the file prefix.

### Success and failure flow

**Success.** The effect plays. About 1 s after the last moment (300 ms under reduced motion), the celebration card fades in. It keeps today's contract (centred, small confetti, one Continue bound to Enter). Three changes:

1. **It does not cover the effect.** It stays horizontally centred, and is vertically placed in whichever half of the game area does not contain the scene's focus box. The focus box is the visitor and bubble in lesson 1, the sign in lesson 2 and the board in lesson 3. Scenes expose it as `data-focus` on the element.
2. **It quotes the result.** The second line repeats what the world now shows, for example: Mila said “Welcome to the village!”.
3. **It names the idea in one plain sentence** instead of appending the theory title (“…of your own. A call and a string” today).

On Continue, the unit chip's dot fills with a short gold sweep before the next lesson loads. On the last lesson of a unit, the card shows the landmark and “Stop here” as today.

**Failure.** No card. The checks show `✗` with a reason. After the **second** failed Run on the same lesson, a link appears at the end of the step card: “Stuck? Show a hint ›”. It opens the Hints tab, and the tab gets a dot. After the third, the last hint rung (“Show me the line”) is offered. Hints never auto-open.

## 3. Lessons 1–3 in the new format

Exactly as the player sees it. Lesson ids, units and the order stay, so saves keep working. `kind` changes for lesson 1 (write to fill) and lesson 2 (fill to write, with ghost).

### Lesson 1 · `hello` · fill

**Nav chip:** Calls and strings ●○○○

**Scene (camera: the gate).** Mila stands left of the gate, facing right. A visitor in a travelling coat stands at the gate with an empty speech bubble whose three dots pulse. No caption. The name tags read “Mila” and “Visitor”.

**Step card**

> **Make Mila say hello to the visitor.**
> ① Type a greeting between the quotes on line 2.
> ② Press ▶ Run.
> New: text inside quotes is called a string. More ›

**Editor**

```ts
// Mila says the words inside the quotes.
say("")
```

Caret on line 2 between the quotes. Ghost value inside the quotes: `Hello!` (grey, Tab accepts).

**Checks (grey before Run)**

> ○ Mila says your words
> ○ The visitor waves back

**Learn (only on “More ›”)**

> **A call and a string**
> `say` is a job the game knows. Writing `say(...)` asks Mila to do it.
> Text inside double quotes is called a string. The game uses it exactly as you typed it.
> Lines that start with `//` are notes for you. The game skips them.
> ```ts
> say("The lantern is lit.")
> ```

**Hints**

1. Click between the two quotes on line 2 and type any greeting.
2. `say("Hello!")`

**Errors in this lesson:** see the table in section 2 (quotes, capitals, closing quote, empty quotes).

**On success.** Mila's bubble shows the full greeting (up to 40 characters, wrapping to two lines). Mila waves, then the visitor waves back and their bubble shows “☺”. The card appears in the upper half of the game area:

> ✓ Done · ★ No hints
> **The visitor waves back!**
> Mila said “Hello!”.
> You wrote your first line of code. Words in quotes are a string.
> [ Continue ↵ ]

### Lesson 2 · `sign-spaces` · write (ghost)

**Nav chip:** Calls and strings ✓●○○

**Scene (camera: the pier).** A blank wooden sign on the pier. A paper boat ticket is pinned to the sign post and reads **Moon Ferry** in large print. The ferry bobs offshore.

**Step card**

> **Paint the ferry's name on the pier sign.**
> ① On line 2, write `paintSign("")` with the name from the ticket.
> ② Press ▶ Run.
> New: spaces and capitals inside quotes count. More ›

**Editor**

```ts
// paintSign puts the words in quotes on the sign.

```

Caret at line 2, column 1. Ghost text: `paintSign("")`.

**Checks**

> ○ The sign says “Moon Ferry”, like the ticket

**Failure reasons (from `explain`)**

- `MoonFerry`: ✗ The sign says “MoonFerry”. The ticket says “Moon Ferry”. Add the space.
- `moon ferry`: ✗ The sign says “moon ferry”. The ticket uses capital M and F.
- `Moon Fery`: ✗ The sign says “Moon Fery”. Check the letters against the ticket.

In the scene, the letters on the sign that differ from the ticket get a red underline. The boat stays offshore.

**Learn**

> **Exact text**
> A string keeps every letter, capital and space you put between the quotes.
> `"Moon Ferry"` and `"MoonFerry"` are different strings.
> `paintSign` writes the string you give it on the sign.
> ```ts
> paintSign("East Gate")
> ```

**Hints**

1. Read the ticket letter by letter, including the space.
2. Put both words, with one space between them, inside the quotes.

**On success.** The sign shows “Moon Ferry”, the ticket gets a tick stamp, and the ferry docks.

> ✓ Done
> **The ferry docks!**
> The sign says “Moon Ferry”.
> Inside quotes, every space and capital is copied exactly.
> [ Continue ↵ ]

### Lesson 3 · `call-order` · predict

**Nav chip:** Calls and strings ✓✓●○

**Scene (camera: the platform).** A train at the platform with open doors and a flipboard above it with two blank rows, labelled 1 and 2.

**Step card**

> **Announce boarding, then departure.**
> ① Guess: which message will the board show first? [ All aboard ] [ Your departure message ]
> ② On line 3, write `say` with a departure message.
> ③ Press ▶ Run.
> New: code runs from the top line down. More ›

**Editor**

```ts
say("All aboard")
// Add the departure message on the next line.

```

Caret at line 3, column 1. Ghost text: `say("")`.

**Checks**

> ○ The board shows “All aboard” first
> ○ Then it shows your departure message

**Run before a guess:** the guess row glows gold, and the text below it says “Pick a guess first. There is no wrong answer.” Nothing runs.

**Failure reasons**

- Departure line above line 1: ✗ The board shows “Departing” first. Move your line below `say("All aboard")`.
- Only one line: ✗ The board shows one message. Add a second `say` on line 3.

**After the Run (in the step card, replacing the guess buttons):** “You guessed All aboard. Right: line 1 runs, then line 3.” or “You guessed your departure message. The board shows All aboard first, because lines run from the top down.”

**Learn**

> **Top to bottom**
> The game runs your lines one after another, from the top down.
> Each line finishes before the next one starts.
> Two `say` lines put two messages on the board, in that order.
> ```ts
> say("Morning")
> say("Afternoon")
> ```

**Hints**

1. The board fills row 1 first, from line 1.
2. Write `say("Departing!")` on line 3.

**On success.** The board flips row 1 then row 2, the doors close, the train pulls out.

> ✓ Done
> **The train leaves on time!**
> The board showed “All aboard”, then “Departing!”.
> Lines run from the top down. That order is called a sequence.
> [ Continue ↵ ]

### Template rule for all 52 lessons

Each Beginner lesson declares these fields. Validation in `tests/packs/validation.test.ts` enforces the limits.

| Field | Rule |
| --- | --- |
| `goal` | Story outcome, a verb first, names something drawn in the scene. At most 50 characters. |
| `steps` | One to three imperative lines, each at most 70 characters. The first names a gutter line number. The last is exactly “Press ▶ Run.”. In a predict lesson, the guess is step 1. |
| `idea` | “New: …”, one sentence, at most 60 characters. Only when the lesson introduces a call or syntax. |
| `starter` | One plain comment line, never `TODO:`. A fix lesson quotes the broken line. |
| `edit` | `{ line, column }`. It must point at the editable spot (inside the quotes for a fill). |
| `ghost` | Optional. It shows shape only (call name, brackets, quotes, keywords), never the lesson's answer value. It is required at the second appearance of a construct and forbidden from the third. |
| `kind` | Follows the fill, ghost, blank ladder per construct (section 2). |
| `checks` | One or two (three at most in a capstone). Each label is at most 45 characters, says what the scene shows, and avoids “player”, “call”, “nonblank”. Every check has an `explain(evidence)` that returns the actual value in quotes, the expected value and a fix verb. |
| `camera` | The scene crop that holds the target and the effect. The subject is at least 110 px tall at 1280×800. |
| `target` | The thing drawn before Run that carries the reason (ticket, visitor, board, input card). It replaces `cue` and `reason` as on-screen text. Keep `reason` as alt text. |
| `solved` | `reaction` at most 40 characters, a scene event with “!”; `result(world)` quotes what the world now shows; `did` is one sentence, second person, at most 90 characters, ending with the idea in plain words. |
| `theory` | Three body lines, each at most 20 words, then the example. It defines at most one new term. Learn shows only on request. |
| `hints` | Two or three rungs. The first says where to look, the last is the exact line (Beginner only). |

## 4. Course map and progress

- **Nav unit chip** (replaces “Unit 1 · Lesson 1 of 52” and the 52-step bar in `ProgressStrip.vue`). It shows the unit title and one dot per lesson in the unit: ✓ done, ● current, ○ to do. “Calls and strings ✓●○○”. The total “2 of 52” shows only in its tooltip and in the map.
- **Course map popover.** Clicking the chip opens a popover anchored below it, over the game area (380 px wide, at most 70 % of the height, Esc or an outside click closes it). It lists the ten units collapsed, with `done/total` per unit. The current unit is expanded, and each lesson shows its goal and state. A finished unit shows its landmark name. Locked lessons stay visible but dimmed, without padlocks in the first unit (padlocks read as “forbidden” on day one). It never opens by itself.
- **Moment of progress.** On Continue, the current dot fills gold (a 400 ms sweep), then the next dot becomes ●. On unit completion the chip briefly shows the landmark name (“Welcome arch built”) for 3 s, then returns to the next unit's dots.
- **The Learn drawer no longer contains the map.** `SideDrawer.vue` drops `nav[aria-label="Course map"]`. The Workshop “Challenge picker” moves to the same popover from its own chip.
- **The showcase card** keeps the overall strip (`12/52`), where the long view belongs.

## 5. Implementation list

Ordered by impact on the first screen. Pass 1 is tickets 1–9 (the five-second screen). Pass 2 is tickets 10–15. Each ticket is small enough for one commit, and should keep `pnpm test`, `pnpm typecheck` and `pnpm test:browser` green.

1. **ADR 0020 “First screen: one step”.** Record the decisions in this audit: step card; Learn on request only; map in a nav popover; neutral checks before Run; check reasons; plain-word errors; fill, ghost, blank ladder; and the celebration avoiding the focus box after a delay. Name what it replaces from ADR 0019 (Learn opening once per idea, the map inside Learn, the solved card placed at once over the world). Keep 0019.
   *Files:* `docs/adr/0020-first-screen-one-step.md`.
   *Accept:* the ADR exists and links this audit; 0019 is unchanged.

2. **Lesson fields: `steps`, `idea`, `edit`, `ghost`, `camera`, `target`, `solved.result`.**
   *Files:* `packages/sim/src/framework/pack.ts` (`Lesson`, `Starter.edit.column`), `packages/sim/src/packs/beginner/course.ts` (`Page`, `lessonFor`: stop deriving `editLine` from `// TODO:`; use `page.edit`), `apps/web/app/lib/packProtocol.ts` and `pack.worker.ts` (send `steps`, `idea`, `ghost`, `edit.column`), `tests/packs/validation.test.ts` (the limits in the template table; course lessons require `steps` ending in “Press ▶ Run.”).
   *Accept:* validation fails on a course lesson without `steps`, a goal over 50 characters, a step over 70, a ghost that contains the reference value, or a check over 45 characters. Workshop is unaffected.

3. **`StepCard.vue` replaces `GoalBar.vue` on the course track.**
   *Files:* new `apps/web/app/components/StepCard.vue`, `PackStudio.vue` (render it when `manifest.track === 'course'`, keep `data-testid="task-card"`), `game.css`.
   *Accept:* at 1280×800 on `?pack=beginner&lesson=hello`, the card shows the goal, two numbered steps and the idea line, with no inner scroll. Step 1 ticks after typing on line 2. Step 2 turns gold. “More ›” opens Learn. The `?` opens Learn.

4. **Learn opens on request only (course track).**
   *Files:* `apps/web/app/lib/pack.worker.ts` (`showLearn` false when `pack.manifest.track === 'course'`), `SideDrawer.vue` (hide the “Condition” block when `track === 'course'`), `tests/e2e/frame.spec.ts` (open the drawer with `?` before asserting “A call and a string”).
   *Accept:* opening any Beginner lesson shows no drawer, the editor has focus at `edit`, and the drawer opens only from `?`, “More ›” or a hint link.

5. **Starter scaffold: caret, ghost text, larger font.**
   *Files:* `CodeEditor.vue` (place the caret at `edit.line/column`; a `ghost` decoration with `after: { content, inlineClassName: 'ghost' }` on the edit line, removed on the first change to that line; Tab inserts the ghost; `fontSize` 16 and `lineHeight` 26 when the lesson's unit index is below 4), `apps/web/app/lib/editor.ts` (expose `ghost`), `game.css` (`.ghost` colour `var(--sub)`, italic off).
   *Accept:* lesson 1 opens with the caret between the quotes of `say("")` and grey “Hello!”. Typing removes the ghost. Tab then Run solves the lesson. The ghost is never saved to `localStorage`.

6. **Rewrite unit 1 copy** (lessons 1–4) to section 3 and the template.
   *Files:* `packages/sim/src/packs/beginner/units/01-calls-and-strings.ts`, `docs/specs/v6-beginner-curriculum.md` (unit 1 section).
   *Accept:* the starter and reference of each lesson pass validation. A playthrough (`playthrough.ts`) still solves the unit. The four goals, steps and check labels match this audit word for word.

7. **Neutral checks and failure reasons.**
   *Files:* `packages/sim/src/framework/pack.ts` (`Check.explain?(e): string | undefined`), `beginner/course.ts` (`check(label, passes, explain?)`), `pack.worker.ts` (send `reasons` for failed checks after a run), `ChecksPanel.vue` (a `todo` grey state before the first Run of the lesson; `✗` and the reason line after one), unit 1 checks (add `explain`).
   *Accept:* on lesson 1, the checks are grey on open. After `paintSign("MoonFerry")` on lesson 2, the panel shows “✗ The sign matches…” with the reason “The sign says “MoonFerry”. The ticket says “Moon Ferry”. Add the space.” No red appears before a Run.

8. **Plain-word errors.**
   *Files:* `packages/sandbox/src/player-error.ts` (the table in section 2, `main.ts:2 ·` becomes `Line 2:`), a new `packages/sandbox/src/player-error.test.ts`, `packages/sim/src/packs/beginner/world.ts` (`words()` gives “Mila needs some words between the quotes.” for blank text), `PackStudio.vue` (`noCalls` text, “Nothing new yet. Type on line 2 first.” using `edit.line`), `CodeEditor.vue` (a content widget under the error line; in Beginner, rewrite Monaco marker messages with the same mapper).
   *Accept:* unit tests cover each row of the error table. On lesson 1, `say(Hello)` then Run shows “Line 2: Words need quotes around them, like "Hello".” under line 2 and above the checks. Hovering the squiggle shows the same text.

9. **Invite Run, and prediction inline.**
   *Files:* `StepCard.vue` (a guess row for `prediction`), `SideDrawer.vue` (remove the prediction fieldset for course lessons), `PackStudio.vue` (`run()`: when the prediction is missing, emit a highlight to the step card instead of `openDrawer('learn')`; a one-shot `data-ready` attribute on Run when step 1 completes), `game.css` (a ring pulse keyframe, none under reduced motion).
   *Accept:* on lesson 3, pressing Run before guessing highlights the guess row and runs nothing. After a guess and a Run, the row shows the comparison sentence. Run pulses once per edit, never on load.

10. **Celebration: effect first, never over the focus.**
    *Files:* `CelebrationOverlay.vue` (props `result` and `focus`; placement in the half without the focus box; fade in after 1000 ms, or 300 ms under reduced motion; Enter still advances, and the delay does not swallow it), `PackStudio.vue` (read `[data-focus]` bounds from the world), `beginner/WorldView.vue` and scenes (mark the focus element), `beginner/course.ts` (`solved.result`), `tests/e2e/frame.spec.ts` (the card box does not intersect `[data-focus]`).
    *Accept:* on lesson 1 at 1280×800, Mila's bubble and the visitor stay fully visible with the card open. The card quotes the player's greeting. The idea sentence no longer appends the theory title.

11. **Scene camera, drawn targets and readable bubbles.**
    *Files:* `beginner/scenes/VillagePanorama.vue` (a `camera` viewBox per lesson, the visitor figure, a bubble that wraps to two lines up to 40 characters instead of `boundedName` at 15), `scenes/Waterside.vue` (the ticket prop, a difference underline, the ferry docking), `scenes/Track.vue` (the flipboard with two rows, the train departing), `beginner/WorldView.vue` (remove `.scene-note` on the course track; show the `.prop` strip only after a Run, and never a lone `—`), `beginner/world.ts` (`camera`, `target`).
    *Accept:* Mila is at least 110 px tall on lesson 1 at 1280×800. “Welcome to the village!” shows in full. The ticket and the board are visible before Run. No caption band.

12. **Course map popover and unit chip.**
    *Files:* `ProgressStrip.vue` (unit title and per-unit dots; the total in the title attribute), new `CourseMap.vue` (a popover built from the `SideDrawer` map markup), `PackNav.vue`, `SideDrawer.vue` (remove the map), `tests/e2e/frame.spec.ts` (the map test opens it from the chip).
    *Accept:* the first screen shows “Calls and strings ●○○○” and no “of 52”. Clicking the chip opens the map, and Esc closes it and returns focus to the chip. The dot fills on Continue.

13. **Failure escalation.**
    *Files:* `StepCard.vue` (“Stuck? Show a hint ›” after two failed Runs, using `save.attempts`), `SideDrawer.vue` (a dot on Hints), `PackStudio.vue`.
    *Accept:* the link appears after the second failed Run and not before. It opens Hints. Hints never open by themselves.

14. **Narrow layout (at most 780 px).**
    *Files:* `game.css` (Run stays in the first nav row at 44 px, compact; the game area is 38 vh with the camera crop; then the step card, the editor at its content height (minimum 4 lines) and the checks directly under the last line; Learn and the map open as bottom sheets of at most 60 %), `SideDrawer.vue` media query.
    *Accept:* at 390×844 on lesson 1, the scene, the step card, line 2 and both checks are visible together without scrolling. The Run button is visible.

15. **Tests and shots for the first screen.**
    *Files:* `tests/e2e/frame.spec.ts` (a new “first screen” test at 1280×800 and 390×844: no drawer, step card visible, caret at `edit`, grey checks, Run visible; after the solution, the card does not cover the focus), `scripts/shots.mjs` (a `--viewport 1280x800` option and `--state start|error|solved` with `--code`, reusing `chapter-capture.ts`).
    *Accept:* `pnpm test:browser` passes. `pnpm shots --url … --pack beginner --lesson hello --viewport 390x844` writes the narrow frame.

After pass 1, apply the template to units 2–10 (48 lessons) in one ticket per unit file (`units/02-…` to `units/10-…`), using ticket 6 as the pattern.

## 6. Mockups

### Desktop 1280×800, lesson 1 at start

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ Inherit. │ TypeScript from zero ▾ │ Calls and strings ●○○○ │               ⚙ │ [ ▶ Run  ⌃↵ ] │ 64
├──────────────────────────────────────────────┬─┬─────────────────────────────────────────────┤
│                                              │ │ Make Mila say hello to the visitor.       ? │ 20px
│              (sky, cottage roof)             │ │ ① Type a greeting between the quotes on     │ 16px
│                                              │ │   line 2.                                   │
│                       ┌───────┐              │ │ ② Press ▶ Run.                              │
│                       │ • • • │              │ │ New: text inside quotes is called a string. │ 13px
│             ●         └──┬────┘              │ │                                   More ›    │
│            /█\     ┌─┐   ●                   │ ├─────────────────────────────────────────────┤
│            / \     │ │  /█\                  │ │ 1  // Mila says the words inside the quotes │ 16px
│           Mila   gate / \                    │ │ 2  say("▌Hello!")                           │ ghost
│                       Visitor                │ │                                             │
│      (camera crop: gate, figures ≥110 px)    │ ├─────────────────────────────────────────────┤
│                                              │ │ ○ Mila says your words                      │ grey
│                                              │ │ ○ The visitor waves back                    │ grey
│                                              │ │                                             │
│                                              │ │                                             │
├──────────────────────────────────────────────┴─┴─────────────────────────────────────────────┤
│ Saved on this device                                                                         │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
        game area ≈ 660 px                              editor column ≈ 610 px
```

### Desktop, after `say(Hello)` and Run

```
├──────────────────────────────────────────────┬─┬─────────────────────────────────────────────┤
│                       ┌───────┐              │ │ Make Mila say hello to the visitor.       ? │
│                       │ • • • │              │ │ ① Type a greeting between the quotes on ✓   │
│             ●  ?      └──┬────┘              │ │   line 2.                                   │
│            /█\         ●                     │ │ ② Press ▶ Run.                          ✓   │
│            / \  (Mila shrugs once)           │ ├─────────────────────────────────────────────┤
│           Mila                               │ │ 1  // Mila says the words inside the quotes │
│                                              │ │ 2  say(Hello)                               │
│                                              │ │    ┃ Line 2: Words need quotes around them, │
│                                              │ │    ┃ like "Hello".                          │
│                                              │ ├─────────────────────────────────────────────┤
│                                              │ │ Line 2: Words need quotes around them…      │ red
│                                              │ │ ○ Mila says your words                      │ grey
│                                              │ │ ○ The visitor waves back                    │ grey
```

### Desktop, solved

```
├──────────────────────────────────────────────┬─┬─────────────────────────────────────────────┤
│      ·  *   ┌───────────────────────┐  ·     │ │ Make Mila say hello to the visitor.       ? │
│   *         │ ✓ Done · ★ No hints   │    *   │ │ ① … ✓   ② … ✓                               │
│             │ The visitor waves     │        │ ├─────────────────────────────────────────────┤
│        ·    │ back!                 │  ·     │ │ 1  // Mila says the words inside the quotes │
│             │ Mila said “Hello!”.   │        │ │ 2  say("Hello!")              (read-only)   │
│             │ You wrote your first  │        │ ├─────────────────────────────────────────────┤
│             │ line of code. Words in│        │ │ ✓ Mila says your words                      │ mint
│             │ quotes are a string.  │        │ │ ✓ The visitor waves back                    │ mint
│             │    [ Continue ↵ ]     │        │ │                                             │
│             └───────────────────────┘        │ │                                             │
│   ┌──────────┐            ┌──────┐           │ │                                             │
│   │ Hello!   │            │  ☺   │           │ │                                             │
│   └────┬─────┘            └──┬───┘           │ │                                             │
│        ●  \o/               \●/              │ │                                             │
│       Mila                 Visitor           │ │   ← focus box stays clear of the card       │
```

### Narrow 390×844, lesson 1 at start

```
┌──────────────────────────────────────┐
│ ◆ │ TypeScript from zero ▾ │ [▶ Run] │ 52
│ Calls and strings ●○○○            ⚙  │ 24
├──────────────────────────────────────┤
│            ┌───────┐                 │
│     ●      │ • • • │                 │
│    /█\     └──┬────┘                 │ 38vh
│    / \  ┌┐    ●                      │ ≈ 320
│   Mila  ││   /█\  Visitor            │
│         gate                         │
├──────────────────────────────────────┤
│ Make Mila say hello to the        ?  │
│ visitor.                             │
│ ① Type a greeting between the quotes │
│   on line 2.                         │
│ ② Press ▶ Run.                       │
│ New: text in quotes is a string. ›   │
├──────────────────────────────────────┤
│ 1 // Mila says the words inside the  │
│   quotes.                            │
│ 2 say("▌Hello!")                     │
├──────────────────────────────────────┤
│ ○ Mila says your words               │
│ ○ The visitor waves back             │
├──────────────────────────────────────┤
│ Saved on this device                 │
└──────────────────────────────────────┘
```

On narrow screens the celebration is a card over the game area. Its focus rule stays the same. If the game area is too short to avoid the focus, the card docks over the step card instead, and the scene stays clear.

### Lesson 3 step card with the guess

```
│ Announce boarding, then departure.                      ? │
│ ① Guess: which message will the board show first?         │
│    [ All aboard ]  [ Your departure message ]             │
│ ② On line 3, write say with a departure message.          │
│ ③ Press ▶ Run.                                            │
│ New: code runs from the top line down.           More ›   │
```

## Friction

1. **Abnormally long:** the screenshot pass took 7.5 minutes for 14 frames across 8 page loads, about 50 s per load against `pnpm dev`. Most of it was cold module loading. The dev log reported new dependencies and reloaded the page, and asks to add `@jitl/quickjs-singlefile-browser-release-sync`, `@lucide/vue`, `quickjs-emscripten`, `typescript` and the Monaco entries to `optimizeDeps.include`. Installing Node 24 and the dependencies took about 2 minutes. The repo checks took under a minute.
2. **Hacks:** `pnpm shots` captures only the `start` frame at 1440×900. It could not produce 1280×800, 390×844, or the after-Run, error and solved states, so a standalone Playwright script in `/tmp` drove the dev server instead. `corepack enable` stopped on an interactive “download pnpm?” prompt inside tmux and needed a manual `Y`.
3. **Broken or misleading tooling:** the cloud snapshot still defaults to Node 22.23 while `AGENTS.md` and `.nvmrc` require Node 24 (the same as in the v6 audit). `/tmp/cursor/async-install/` had no status or log, so no setup ran and `node_modules` was absent. `apps/web/nuxt.config.ts` lacks the `optimizeDeps.include` list that the dev server prints on every cold start.
4. **2× faster next time:** bake Node 24 as the nvm default, `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, `pnpm install` and the Chromium shell into the environment snapshot. Add the `optimizeDeps.include` list. Extend `scripts/shots.mjs` with `--viewport`, `--code` and `--state start|error|solved` (ticket 15), so an audit is one command per frame against `pnpm dev` or production.
