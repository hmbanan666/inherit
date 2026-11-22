import { courseUnit, calls, check } from '../course'

export default courseUnit({
  id: "calls-and-strings",
  title: "Calls and strings",
  landmark: "a painted welcome arch",
}, [
  {
    id: "hello",
    kind: "write",
    goal: "Give Mila a greeting at the gate",
    scene: "village",
    cue: "Visitor at the gate",
    reason: "A visitor is waiting. Mila waves and her bubble displays the greeting.",
    introduces: ["say"],
    theory: {
      title: "A call and a string",
      body: [
        "Code gives the game instructions. Lines beginning with // are comments for you. Write your instruction below the TODO comment.",
        "A function is a job with a name. To call it, write its name followed by parentheses.",
        "Words between matching double quotes make one text value, called a string. Give say some words inside its parentheses.",
      ],
      example: `say("The lantern is lit.")`,
    },
    starter: `// TODO: Give the visitor a greeting in Mila's voice.
`,
    hints: [
      "Which job lets Mila speak?",
      "Put greeting words of your choice between quotes inside the call.",
    ],
    reference: `say("Welcome to the village!")`,
    checks: [
      check("The player calls say with nonblank words", e =>
        calls(e, 'say').some(call => typeof call.args[0] === 'string' && call.args[0].trim().length > 0)),
      check("Mila displays those words and waves", e =>
        e.world.bubble.length > 0 && e.world.bubble === calls(e, 'say').at(-1)?.args[0]),
    ],
    effect: ["speech", "Welcome to the village!"],
  },
  {
    id: "sign-spaces",
    kind: "fill",
    goal: "Print the two-word ferry name on the pier sign",
    scene: "pier",
    cue: "Boat ticket · Moon Ferry",
    reason: "The ticket reads Moon Ferry. Matching the lettering helps passengers board.",
    introduces: ["paintSign"],
    theory: {
      title: "Characters inside quotes",
      body: [
        "A string keeps the spaces between its quotes.",
        "Uppercase and lowercase letters keep their shapes too.",
        "paintSign prints the string you give it on the wooden board.",
      ],
      example: `paintSign("East Gate")`,
    },
    starter: `// TODO: Letter the sign to match the boat ticket.
`,
    hints: [
      "Read both words on the ticket.",
      "Make the space part of the text you send to the sign.",
    ],
    reference: `paintSign("Moon Ferry")`,
    checks: [
      check("The sign matches the ticket", e =>
        e.world.sign === 'Moon Ferry'),
    ],
    effect: ["signs", "Moon Ferry"],
  },
  {
    id: "call-order",
    kind: "predict",
    goal: "Show the two station calls in departure order",
    scene: "platform",
    cue: "Departure board · Boarding → Departure",
    reason: "The flipboard records each announcement in a separate bubble. The train leaves only after boarding.",
    theory: {
      title: "Sequence",
      body: [
        "The game reads ordinary lines from top to bottom.",
        "Each call finishes its job before the next one starts.",
        "Two calls to say make two entries on this station's board.",
      ],
      example: `say("Morning")
say("Afternoon")`,
    },
    prediction: {
      question: "After you add the departure call below the boarding call, which message appears first? Choose boarding or departure.",
      choices: ["Boarding", "Departure"],
      answer: "Boarding",
    },
    starter: `say("All aboard")
// TODO: Announce departure after boarding.
`,
    hints: [
      "Predict which message appears first if you add a call here.",
      "Keep the boarding call above your departure announcement.",
    ],
    reference: `say("All aboard")
say("We're departing!")`,
    checks: [
      check("Boarding appears first", e =>
        e.world.announcements[0] === 'All aboard'),
      check("Departure appears second", e =>
        e.world.announcements.length === 2 && /depart|leav|set off|off we go|pulling out/i.test(e.world.announcements[1])),
    ],
    effect: ["speech", "We're departing!"],
  },
  {
    id: "bell-lettering",
    kind: "fix",
    goal: "Ring the gate bell using the name on its label",
    scene: "village",
    cue: "Brass label · ringBell",
    reason: "A visitor waits beside a silent bell. A correct call swings the bell.",
    introduces: ["ringBell"],
    theory: {
      title: "Spelling function names",
      body: [
        "A function name must match the spelling the game knows.",
        "Capital letters count. An unknown name gets an underline in the editor.",
        "ringBell rings the bell. When a job needs no information its parentheses are empty.",
      ],
      example: `say("Is anyone home?")`,
    },
    starter: `// The old instruction read ringbell().
// TODO: Call the job printed on the bell label.
`,
    hints: [
      "Compare the old instruction with the bell's brass label.",
      "Check the letter at the start of the second word.",
    ],
    reference: `ringBell()`,
    checks: [
      check("The bell swings once", e =>
        e.world.bell === 1),
    ],
    effect: ["bell", "1 ring"],
  },
])
