import { courseUnit, same, sameHelper, check } from '../course'
import { feeds, binary, constant, updated, ticketKept, literal, shape } from '../syntax'

export default courseUnit({
  id: "variables-and-names",
  title: "Variables and names",
  landmark: "a cottage nameplate",
}, [
  {
    id: "house-sign",
    kind: "write",
    goal: "Put your chosen name on the cottage sign",
    scene: "village",
    cue: "Courier delivery · Cottage name needed",
    reason: "The courier needs a name to match to the door. The player’s chosen name appears on the post.",
    theory: {
      title: "Naming a value with const",
      body: [
        "const gives a value a name. Write the name after const, then = and the value.",
        "Choose a name that describes the value. Join words without spaces, as in boatName.",
        "In a later call use the name by itself to read the value you stored.",
      ],
      example: `const boatName = "Minnow"
say(boatName)`,
    },
    starter: `// TODO: Store a name for the courier and paint it on the sign.
`,
    hints: [
      "Choose both a code name and the words for the sign.",
      "Pass the code name to the sign painter.",
    ],
    reference: `const cottage = "Willow"
paintSign(cottage)`,
    checks: [
      check("A const supplies the sign text", e =>
        feeds(e, 'paintSign', constant)),
      check("The sign carries your chosen name", e =>
        e.world.sign.trim().length > 0),
    ],
    solved: {
      reaction: "The courier found the door.",
      did: "You named a string once and read it at the sign.",
    },
    effect: ["signs", "Willow"],
  },
  {
    id: "flag",
    kind: "fill",
    goal: "Change the welcome flag before the parade starts",
    scene: "village",
    cue: "Parade marshal · Gold swatch",
    reason: "A blue rehearsal flag is on the pole. The parade marshal shows a gold swatch. The flag takes its new colour.",
    introduces: ["hangFlag"],
    theory: {
      title: "Reassigning with let",
      body: [
        "A name made with let can hold a different value later.",
        "To change it, write the same name, = and the new value. Leave let off this second line.",
        "hangFlag raises the colour stored at the instant you call it.",
      ],
      example: `let message = "Wait"
message = "Come in"`,
    },
    starter: `let flagColour = "blue"
// TODO: Match the marshal's parade swatch.

hangFlag(flagColour)`,
    hints: [
      "Look at the swatch beside the flagpole.",
      "Give the existing variable a fresh value before it is used.",
    ],
    reference: `let flagColour = "blue"
flagColour = "gold"
hangFlag(flagColour)`,
    fixture: { flag: "blue" },
    checks: [
      check("The reassigned variable supplies the flag colour", e =>
        updated(e, 'hangFlag')),
      check("A gold flag flies", e =>
        e.world.flag === 'gold'),
    ],
    solved: {
      reaction: "The marshal can start the parade.",
      did: "You reassigned a variable before raising the flag.",
    },
    effect: ["flag", "gold"],
  },
  {
    id: "fixed-ticket",
    kind: "fix",
    goal: "Keep the printed ticket and update the platform board",
    scene: "platform",
    cue: "Printed ticket · West / Diversion · East",
    reason: "Printed tickets say West. A diversion sends passengers East. The ticket stays on display beside the changed sign.",
    theory: {
      title: "Choosing const or let",
      body: [
        "A const keeps its first assignment. Assigning again makes the editor report an error.",
        "Use a separate let when one copy needs to change.",
        "Starting the copy from a const reads its value at that moment.",
      ],
      example: `const original = 4
let remaining = original
remaining = 3`,
    },
    starter: `const ticket = "West"
// TODO: Start the board from the ticket, then apply the East diversion.

// TODO: Paint the board with the revised direction.
`,
    hints: [
      "Which name must keep the printed direction?",
      "Give the board its own changeable copy before repainting.",
    ],
    reference: `const ticket = "West"
let board = ticket
board = "East"
paintSign(board)`,
    checks: [
      check("Ticket remains West", e =>
        ticketKept(e)),
      check("A reassigned copy paints East", e =>
        updated(e, 'paintSign', undefined, 'West') && e.world.sign === 'East'),
    ],
    solved: {
      reaction: "The diversion is posted.",
      did: "Your board changed direction while the printed ticket kept its value.",
    },
    effect: ["signs", "East"],
  },
  {
    id: "banner-words",
    kind: "write",
    goal: "Put the team name and its motto on one banner",
    scene: "scoreboard",
    cue: "Team · Otters / Motto · swim fast",
    reason: "The two strings on the team cards must fit one ribbon. A space separates them on the ribbon.",
    theory: {
      title: "Joining text",
      body: [
        "Between two strings, + joins their text in order.",
        "It adds no spaces. Include a space in a string where you need one.",
        "You can join several pieces in the same expression.",
      ],
      example: `say("North" + " " + "Gate")`,
    },
    starter: `const team = "Otters"
const motto = "swim fast"
// TODO: Join the cards legibly on the banner using paintSign.
`,
    hints: [
      "Keep the names of both pieces in your expression.",
      "Place a space between them.",
    ],
    reference: `const team = "Otters"
const motto = "swim fast"
paintSign(team + " " + motto)`,
    checks: [
      check("Both cards supply the lettering", e =>
        feeds(e, 'paintSign', binary('+'), literal('Otters'), literal('swim fast'))),
      check("Ribbon reads Otters swim fast", e =>
        e.world.sign === 'Otters swim fast'),
    ],
    solved: {
      reaction: "The Otters have their banner.",
      did: "You joined two pieces of text with a space.",
    },
    effect: ["signs", "Otters swim fast"],
  },
  {
    id: "score-caption",
    kind: "write",
    goal: "Label the lane number on the start sign",
    scene: "track",
    cue: "Marshal’s lane card",
    reason: "A marshal holds up a lane number. Its label appears on the sign and follows a changed number.",
    theory: {
      title: "Template strings",
      body: [
        "Backticks mark a template string. It can include values inside its text.",
        "Write a dollar sign and braces around the name or expression to insert.",
        "The inserted number becomes part of the finished string.",
        "The marshal supplies lane as a named input. Read its value just like a const.",
      ],
      example: `const stops = 4
say(\`Stops: \${stops}\`)`,
    },
    starter: `// Input card: lane is 3.
// TODO: Paint a Lane label followed by a space and the lane number.
`,
    hints: [
      "Begin and end the text with backticks.",
      "Put the lane variable inside the insertion braces.",
    ],
    reference: `paintSign(\`Lane \${lane}\`)`,
    fixture: {
      readings: { lane: 3 },
    },
    variants: [
      {
        input: "Lane two",
        fixture: {
          readings: { lane: 2 },
        },
      },
    ],
    checks: [
      check("The sign reads Lane 3", e =>
        feeds(e, 'paintSign', shape('template')) && e.world.sign === `Lane ${e.before.readings.lane}`),
      check("Changing lane to 2 updates the label", e =>
        e.world.sign === `Lane ${e.before.readings.lane}`),
    ],
    solved: {
      reaction: "The runner found the lane.",
      did: "Your template inserted the marshal’s current number.",
    },
    effect: ["signs", "Lane 3"],
  },
  {
    id: "morning",
    kind: "write",
    goal: "Ring the bell and open the shutters together",
    scene: "village",
    cue: "Sleepy household · Bell first, then shutters",
    reason: "The bell wakes the household and the opening shutters show someone heard. One morning routine performs both jobs.",
    introduces: ["openShutters"],
    theory: {
      title: "Writing a named routine",
      body: [
        "You can give a job of your own a name with function.",
        "Put empty parentheses after its name and place its instructions inside braces. That describes the job.",
        "Write its name with parentheses on another line to run it. openShutters swings the windows open.",
      ],
      example: `function cheer() {
  say("Hooray!")
}`,
    },
    starter: `// TODO: Write one morning routine for the bell and shutters.

// TODO: Run your routine.
`,
    hints: [
      "Group the two actions inside the same pair of braces.",
      "Call the name you chose after its definition.",
    ],
    reference: `function wakeUp() {
  ringBell()
  openShutters()
}

wakeUp()`,
    checks: [
      check("One player function runs both actions", e =>
        sameHelper(e, 'ringBell', 'openShutters')),
      check("Bell rings before shutters open", e =>
        same(e.calls.map(call => call.name), ['ringBell', 'openShutters']) && e.world.shutters),
    ],
    solved: {
      reaction: "The shutters swing open.",
      did: "You ran two actions by calling a function you wrote.",
    },
    effect: ["shutters", "Open"],
  },
])
