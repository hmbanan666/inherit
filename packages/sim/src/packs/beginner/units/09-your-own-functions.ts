import { courseUnit, calls, same, sameHelper, check } from '../course'
import { feeds, helperResult, insideHelper } from '../syntax'

export default courseUnit({
  id: "your-own-functions",
  title: "Your own functions",
  landmark: "a ribbon-making stall",
}, [
  {
    id: "flower-row",
    kind: "write",
    goal: "Plant each window box from its size card",
    scene: "garden",
    cue: "Window boxes · 2 cells / 4 cells",
    reason: "Two boxes have different widths. In this garden each plant call fills the next box, so the same job must handle two sizes.",
    theory: {
      title: "Parameters and arguments",
      body: [
        "A parameter names information a caller gives your function. Write it between the parentheses in the definition.",
        "In TypeScript put a colon and the expected type after that name. Use the parameter inside the body.",
        "An argument is the actual value in a call. Two calls can give the same parameter different values.",
      ],
      example: `function announce(word: string) {
  say(word)
}`,
    },
    starter: `// TODO: Write a planting job that takes a box's width.

// TODO: Use it for the two-cell box and then the four-cell box.
`,
    hints: [
      "Choose a number parameter for one width.",
      "Call your own function for each signed box.",
    ],
    reference: `function fillBox(width: number) {
  plant(width)
}

fillBox(2)
fillBox(4)`,
    checks: [
      check("Both calls use one planting function", e =>
        sameHelper(e, 'plant', 'plant') && insideHelper(e, 'plant', ['number'])),
      check("Boxes bloom with two and four flowers", e =>
        same(e.world.beds, [2, 4])),
    ],
    effect: ["beds", "2 blooms · 4 blooms"],
  },
  {
    id: "ribbon-pairs",
    kind: "write",
    goal: "Hang the right number of ribbons for each window plan",
    scene: "fair",
    cue: "Window plans · 3 × 2 / 2 × 4",
    reason: "There are plans for three windows with two ribbons each and two windows with four each. The rails display six and eight ribbons.",
    introduces: ["hangRibbons"],
    theory: {
      title: "Two typed parameters",
      body: [
        "A function can ask for two pieces of information. Give each parameter its own name and type, separated by a comma.",
        "When you call it, arguments fill those places from left to right.",
        "hangRibbons hangs a count on the next rail. Work out that count from the two numbers.",
      ],
      example: `function welcome(first: string, last: string) {
  say(first + " " + last)
}`,
    },
    starter: `// TODO: Write one function that dresses a rail from its window and ribbon counts.

// TODO: Run both window plans.
`,
    hints: [
      "Name one parameter for each number on a plan.",
      "Multiply the parameters inside the job you reuse.",
    ],
    reference: `function dressRail(windows: number, ribbons: number) {
  hangRibbons(windows * ribbons)
}

dressRail(3, 2)
dressRail(2, 4)`,
    checks: [
      check("Both rails use one two-parameter job", e =>
        sameHelper(e, 'hangRibbons', 'hangRibbons') && insideHelper(e, 'hangRibbons', ['number', 'number'])),
      check("The rails show six and eight", e =>
        same(e.world.rails, [6, 8])),
    ],
    effect: ["rails", "6 · 8"],
  },
  {
    id: "signed-result",
    kind: "write",
    goal: "Return the number of pegs needed for a double rack",
    scene: "fair",
    cue: "Peg order · 2 pegs per hook",
    reason: "A rack-maker cuts two pegs per hook. The requested hook count changes and the board shows how many pegs to cut.",
    theory: {
      title: "Return type annotations",
      body: [
        "A colon after the closing parenthesis declares what a function returns.",
        "A function marked number must send a number back on every path that reaches its end.",
        "The caller can keep that returned number and display it.",
      ],
      example: `function label(): string {
  return "North"
}`,
    },
    starter: `// Input card: hooks is 4.
// TODO: Write a function with a numeric input and declared numeric result.

// TODO: Show the returned peg count.
`,
    hints: [
      "The parameter annotation belongs inside the parentheses.",
      "Put the result annotation outside and return the doubled count.",
    ],
    reference: `function pegs(hooksNeeded: number): number {
  return hooksNeeded * 2
}

const count = pegs(hooks)
showScore(count)`,
    fixture: {
      readings: { hooks: 4 },
    },
    variants: [
      {
        input: "Seven hooks",
        fixture: {
          readings: { hooks: 7 },
        },
      },
    ],
    checks: [
      check("A declared numeric result feeds the board", e =>
        feeds(e, 'showScore', helperResult('number'))),
      check("Four and seven hooks need eight and fourteen pegs", e =>
        e.world.score === 2 * e.before.readings.hooks!),
    ],
    effect: ["score", "8"],
  },
  {
    id: "arrow-tag",
    kind: "write",
    goal: "Make reusable name tags for the red team",
    scene: "scoreboard",
    cue: "Tag order · Red team / Bea and Pip",
    reason: "Two runners need tags prefixed Red and a space. The sign records each finished tag.",
    theory: {
      title: "Arrow functions",
      body: [
        "A function can be stored in a const. Write its parameters in parentheses, then => and its body.",
        "With a single expression after the arrow, the function returns that expression’s value.",
        "Call the name holding the function just as you call a named function.",
      ],
      example: `const double = (n: number) => n * 2`,
    },
    starter: `const runners = ["Bea", "Pip"]
// TODO: Write a tag-making arrow function.

// TODO: Print a tag for each runner using paintSign.
`,
    hints: [
      "Give your function one text parameter.",
      "Use the value it returns for every runner on the list.",
    ],
    reference: `const runners = ["Bea", "Pip"]
const tag = (name: string) => "Red " + name

for (const runner of runners) {
  paintSign(tag(runner))
}`,
    checks: [
      check("A reusable arrow makes the tags", e =>
        feeds(e, 'paintSign', helperResult(undefined, true))),
      check("Signs show Red Bea and Red Pip", e =>
        same(e.world.signs, ['Red Bea', 'Red Pip'])),
    ],
    effect: ["signs", "Red Bea · Red Pip"],
  },
  {
    id: "two-jobs",
    kind: "write",
    goal: "Build a gate announcer that uses your tag maker",
    scene: "village",
    cue: "Gate arrivals · Uma / Sol",
    reason: "The greeter needs a reusable way to create a Guest label and speak it. Both arrivals get a personalised announcement.",
    theory: {
      title: "Calling one helper from another",
      body: [
        "One player function can call another.",
        "Let the first function build a value. Inside the second, save that result and use it in an action.",
        "The outer call describes a whole job while each definition stays small.",
      ],
      example: `function bell() {
  ringBell()
}
function wake() {
  bell()
}`,
    },
    starter: `// TODO: Write a helper that returns Guest followed by a space and a name.

// TODO: Write a greeter that uses the helper, then announce Uma and Sol.
`,
    hints: [
      "Give each job its own name.",
      "The announcement job can ask the label job for the words to say.",
    ],
    reference: `function label(name: string) {
  return "Guest " + name
}

function announce(name: string) {
  const tag = label(name)
  say(tag)
}

announce("Uma")
announce("Sol")`,
    checks: [
      check("The greeter calls the label helper", e =>
        calls(e, 'say').every(call => !!call.within) && feeds(e, 'say', helperResult())),
      check("Both guests hear their own label", e =>
        same(e.world.announcements, ['Guest Uma', 'Guest Sol'])),
    ],
    effect: ["speech", "Guest Sol"],
  },
])
