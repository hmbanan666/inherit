import { courseUnit, calls, check } from '../course'

export default courseUnit("calls-and-strings", [
  {
    id: "hello",
    kind: "fill",
    steps: ["Type a greeting between the quotes on line 2", "Press Run"],
    slot: { line: 2, column: 6, placeholder: "type a greeting" },
    readyPattern: /\bsay\s*\(\s*(?:"\s*[^"\s][^"\n]*"|'\s*[^'\s][^'\n]*')\s*\)/,
    focus: "mila-greeting",
    goal: "Give Mila a greeting at the gate",
    scene: "village",
    cue: "Visitor at the gate",
    reason: "A visitor is waiting. Mila waves and her bubble displays the greeting.",
    introduces: ["say"],
    theory: {
      title: "A call and a string",
      body: [
        "Lines beginning with // are notes for you. Mila follows the instruction on the next line.",
        "A function is a job with a name. To call it, write its name followed by parentheses.",
        "Words between matching double quotes make one text value, called a string. Give say some words inside its parentheses.",
      ],
      example: `say("The lantern is lit.")`,
    },
    starter: `// Mila says the words between the quotes.
say("")`,
    hints: [
      "Click between the quotes on line 2 and type any greeting.",
      "Try say(\"Hello!\").",
    ],
    reference: `say("Welcome to the village!")`,
    checks: [
      check("You gave Mila a greeting", e =>
        calls(e, 'say').some(call => typeof call.args[0] === 'string' && call.args[0].trim().length > 0), undefined, () => "Give Mila some words between the quotes."),
      check("Mila says it and waves", e =>
        e.world.bubble.length > 0 && e.world.bubble === calls(e, 'say').at(-1)?.args[0], undefined, () => "Mila is still waiting for her greeting."),
    ],
    solved: {
      reaction: "Mila waves back.",
      did: "The words you put in quotes are a string.",
    },
    effect: ["speech", "Welcome to the village!"],
  },
  {
    id: "sign-spaces",
    kind: "write",
    steps: ['Copy the ticket name in quotes on line 2', 'Press Run'],
    slot: { line: 2, column: 11, placeholder: '"name from the ticket"' },
    readyPattern: /\bpaintSign\s*\(\s*(?:"\s*[^"\s][^"\n]*"|'\s*[^'\s][^'\n]*')\s*\)/,
    focus: "pier-sign",
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
    starter: `// Put the boat ticket name in quotes.
paintSign()`,
    hints: [
      "Read both words on the ticket.",
      "Make the space part of the text you send to the sign.",
    ],
    reference: `paintSign("Moon Ferry")`,
    checks: [
      check("The sign matches the ticket", e =>
        e.world.sign === 'Moon Ferry', undefined, ({ world }) => {
          if (!world.sign) return 'The pier sign is still blank.'
          const difference = world.sign.toLowerCase() === 'moon ferry' ? 'match the capital M and F'
            : world.sign === 'MoonFerry' ? 'add the space between the words' : 'copy “Moon Ferry” from the ticket'
          return 'The sign says “' + world.sign + '” — ' + difference + '.'
        }),
    ],
    solved: {
      reaction: "The ferry has its name.",
      did: "Your sign kept the spaces and capitals from the ticket.",
    },
    effect: ["signs", "Moon Ferry"],
  },
  {
    id: "call-order",
    kind: "predict",
    steps: ["Guess which message comes first", "Add a departure call on line 3", "Press Run"],
    slot: { line: 3, column: 1, placeholder: 'say("…")' },
    readyPattern: /\bsay\s*\([^)]*\)[\s\S]*\bsay\s*\(\s*(?:"\s*[^"\s][^"\n]*"|'\s*[^'\s][^'\n]*')\s*\)/,
    focus: "departures",
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
      question: "Which message will the board show first?",
      choices: ["Boarding", "Departure"],
      answer: "Boarding",
    },
    starter: `say("All aboard")
// Add the departure message on the next line.
`,
    hints: [
      "Predict which message appears first if you add a call here.",
      "Keep the boarding call above your departure announcement.",
    ],
    reference: `say("All aboard")
say("We're departing!")`,
    checks: [
      check("“All aboard” shows first", e =>
        e.world.announcements[0] === 'All aboard', undefined, ({ world }) =>
          world.announcements.length ? '“' + world.announcements[0] + '” came first because its line ran first.' : 'The board is still empty.'),
      check("Your departure message shows second", e =>
        e.world.announcements.length === 2 && e.world.announcements[1].trim() !== 'All aboard', undefined, ({ world }) =>
          world.announcements.length === 2 ? 'Give the second message its own departure words.' : 'The board shows ' + world.announcements.length + ' messages and needs two.'),
    ],
    solved: {
      reaction: "The train can leave.",
      did: "The board shows your messages in order because lines run from top to bottom.",
    },
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
    solved: {
      reaction: "Someone’s at the gate!",
      did: "You matched the spelling of the bell’s function.",
    },
    effect: ["bell", "1 ring"],
  },
])
