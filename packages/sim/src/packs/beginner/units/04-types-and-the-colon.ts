import { courseUnit, check } from '../course'
import { feeds, annotation, inks } from '../syntax'

export default courseUnit({
  id: "types-and-the-colon",
  title: "Types and the colon",
  landmark: "a typesetter’s kiosk",
}, [
  {
    id: "ticket-type",
    kind: "fill",
    goal: "Label the ferry destination as text and print it",
    scene: "pier",
    cue: "Ferry destination · Cove",
    reason: "The typesetter wants a text field for a destination. The destination appears on the kiosk sign.",
    theory: {
      title: "The colon and string annotations",
      body: [
        "A type describes which values fit a spot in your code.",
        "A colon after a variable name introduces its type. string means text in quotes.",
        "The = still supplies the particular value.",
      ],
      example: `const bird: string = "wren"`,
    },
    starter: `// TODO: Give the pier's destination a text annotation and paint its name.
`,
    hints: [
      "The ferry is bound for Cove.",
      "Put the type between the variable name and the equals sign.",
    ],
    reference: `const destination: string = "Cove"
paintSign(destination)`,
    checks: [
      check("The destination has a string annotation", e =>
        feeds(e, 'paintSign', annotation('string'))),
      check("Cove appears on the sign", e =>
        e.world.sign === 'Cove'),
    ],
    effect: ["signs", "Cove"],
  },
  {
    id: "number-tag",
    kind: "write",
    goal: "Give the seed tray a numeric capacity and fill it",
    scene: "garden",
    cue: "Tray capacity · 6 cells",
    reason: "A seed tray is stamped with six cells. Six shoots appear when the declared capacity reaches the planter.",
    theory: {
      title: "Number annotations",
      body: [
        "number is the type for values you can do arithmetic with.",
        "An annotation goes after the name whether the value is text or a number.",
        "Pass the named capacity into the planting job.",
      ],
      example: `const wheels: number = 2`,
    },
    starter: `// TODO: Record the tray's marked capacity with its type and plant that many.
`,
    hints: [
      "Find the cell count on the rim.",
      "Write its digits after the equals sign.",
    ],
    reference: `const cells: number = 6
plant(cells)`,
    checks: [
      check("Capacity is annotated as number", e =>
        feeds(e, 'plant', annotation('number'))),
      check("All six cells sprout", e =>
        e.world.gateFlowers === 6),
    ],
    effect: ["beds", "6 blooms"],
  },
  {
    id: "signal-bit",
    kind: "write",
    goal: "Switch on the green crossing signal",
    scene: "path",
    cue: "Crossing guard · Safe for ducks",
    reason: "A duck family waits for a safe crossing. setSignal lights green for true and red for false.",
    introduces: ["setSignal"],
    theory: {
      title: "Booleans",
      body: [
        "A boolean has exactly two values, true and false.",
        "Write either word without quotes. Its type annotation is boolean.",
        "setSignal takes a boolean and sets the crossing lamp.",
      ],
      example: `const sleepy: boolean = false`,
    },
    starter: `// TODO: Store the crossing permission as a typed value and signal it.
`,
    hints: [
      "The ducks have permission to cross.",
      "Read your annotated permission into the signal call.",
    ],
    reference: `const safe: boolean = true
setSignal(safe)`,
    checks: [
      check("A boolean variable drives the signal", e =>
        feeds(e, 'setSignal', annotation('boolean'))),
      check("The green lens lights", e =>
        e.world.signal === true),
    ],
    effect: ["signal", "Green"],
  },
  {
    id: "type-slip",
    kind: "fix",
    goal: "Repair the rejected score ticket",
    scene: "scoreboard",
    cue: "Rejected ticket · 8 points",
    reason: "A quoted score jams the reader. A numeric replacement prints a valid score of eight.",
    theory: {
      title: "Reading a type error",
      body: [
        "Try the rejected ticket in the editor. A red underline marks the part it cannot accept.",
        "In “string is not assignable to number”, string is what you gave and number is what the slot expects.",
        "Read the types, inspect the value, then run the repaired line.",
      ],
      example: `// A label expects text here.
const gate: string = "4"`,
    },
    starter: `// Rejected ticket: const points: number = "8"
// TODO: Repair the ticket as a typed score and show it on the board.
`,
    hints: [
      "Compare the quotes on the rejected ticket with its annotation.",
      "Keep the annotation and use a value of the expected type.",
    ],
    reference: `const points: number = 8
showScore(points)`,
    checks: [
      check("The repaired score has the expected type", e =>
        feeds(e, 'showScore', annotation('number'))),
      check("Board prints 8", e =>
        e.world.score === 8),
    ],
    effect: ["score", "8"],
  },
  {
    id: "two-inks",
    kind: "fill",
    goal: "Print the inspector’s approved ink on the sign",
    scene: "pier",
    cue: "Approved inks · blue / gold · Blue seal",
    reason: "The ink tin bears a blue seal. The sign displays the ink name when the inspector's selection is recorded.",
    theory: {
      title: "Literal unions",
      body: [
        "A type can list the exact text values it accepts.",
        "Write the quoted alternatives with a vertical bar between them. This is a union.",
        "A variable with that annotation accepts either listed value.",
      ],
      example: `let side: "east" | "west" = "west"`,
    },
    starter: `// TODO: Define an ink choice limited to blue or gold and print the inspector's choice.
`,
    hints: [
      "Use both tin names in the annotation.",
      "Read the sealed tin for this sign's value.",
    ],
    reference: `const ink: "blue" | "gold" = "blue"
paintSign(ink)`,
    checks: [
      check("Ink is limited to the two permitted strings", e =>
        feeds(e, 'paintSign', inks)),
      check("The sign reads blue", e =>
        e.world.sign === 'blue'),
    ],
    effect: ["signs", "blue"],
  },
])
