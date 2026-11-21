# The screen grows with the story

At first launch the v3 workshop showed the floor, the town ribbon, coins, speed buttons, Orders and an Inbox button tucked into a corner, all before the player had written a line. Players did not know where to look, and many never noticed the Inbox at all.

The frame of the workshop is fixed and is not redesigned: the top navigation, the thin footer with the Deploy button, the context menus and the charcoal palette (ADR 0006) stay as they are. Changes happen only inside the frame: texts, request cards, the deploy flow, coins and other counters, and the console.

From now on the screen starts almost empty and gains one section at a time, when the story needs it:

- First launch: only the code editor, the Checks and Console panel (ADR 0012) and Deploy, with the request card above the editor. The card says what each one is for: here you write code, here you deploy it. No floor, no town, no coins, no speed buttons.
- The first time the player's code makes something happen on the floor (the first dig), the Factory section appears and the screen splits into code and floor.
- When Bram's request is done and pays, coins and the debt appear, because money now matters.
- The Town section appears with the first town change (the forge lights up), opened by the celebration's "See it" button.
- The Inbox appears with the first letter after onboarding; Orders appears when the first regular order arrives. Speed controls stay hidden for all of chapter 1, and the day stays internal as ADR 0008 says.

All main sections live in the existing top navigation bar (Code, Factory, Town, Inbox, Orders). A section that just appeared carries a small "new" mark until it is opened once. The Inbox shows an unread count, and a new letter also shows a short notice that opens it, so letters cannot be missed.

The sim decides which sections are unlocked (part of the unlocked surface, next to the verbs), so the UI and the tests agree. The API reference from ADR 0009 follows the same surface and lists only unlocked verbs. Older saves get the sections their progress has earned.

Every request card connects the story to the code in three short lines: who asks and why, what the factory must do, and what that means in code, for example "Bram needs 3 ingots for horseshoes → the furnace must smelt iron ore → `furnace.smelt()`". This extends ADR 0005 (show tools only when the story needs them) from tools to the whole screen.

> Partly superseded by ADR 0014: the shed floor is on screen from the first second, the navigation starts with Shed, and the code-only first launch is gone.
