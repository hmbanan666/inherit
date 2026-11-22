import { courseUnit, calls, same, check } from '../course'
import { inBlock, accumulated } from '../syntax'

export default courseUnit("loops", [
  {
    id: "neighbours",
    kind: "write",
    goal: "Greet every neighbour on the path",
    scene: "village",
    cue: "Path arrivals · Follow the visitor card",
    reason: "Neighbours arrive in the order on the guest card. greet invites one named neighbour into view.",
    introduces: ["greet"],
    theory: {
      title: "Visiting each entry with for…of",
      body: [
        "A loop runs its body more than once.",
        "In for (const item of items), the name before of holds one entry at a time from the list after of.",
        "Put the work for that entry inside braces. When the list ends, the loop ends.",
        "greet invites the visitor whose name you give it onto the path.",
      ],
      example: `for (const word of ["Go", "Team"]) {
  say(word)
}`,
    },
    starter: `// Input card: visitors is ["Mila", "Ren", "Jo"].
// TODO: Invite each listed neighbour onto the path.
`,
    hints: [
      "Choose a name for one visitor.",
      "Inside the braces give greet that one name.",
    ],
    reference: `for (const visitor of visitors) {
  greet(visitor)
}`,
    fixture: {
      readings: { visitors: ["Mila", "Ren", "Jo"] },
    },
    variants: [
      {
        input: "One visitor",
        fixture: {
          readings: { visitors: ["Bo"] },
        },
      },
    ],
    checks: [
      check("Guests arrive once in card order", e =>
        inBlock(e, 'greet', 'forOf') && same(e.world.neighbours, e.before.readings.visitors)),
      check("A shorter card invites only its names", e =>
        same(e.world.neighbours, e.before.readings.visitors)),
    ],
    solved: {
      reaction: "The neighbours have arrived.",
      did: "Your loop greeted one visitor per entry.",
    },
    effect: ["neighbours", "Mila · Ren · Jo"],
  },
  {
    id: "path-lamps",
    kind: "write",
    goal: "Light all five lamps in path order",
    scene: "path",
    cue: "Fair path · Gate 1 → Fair 5",
    reason: "Lamps are numbered from one beside the gate to five beside the fair. Each lit pool leads to the next.",
    introduces: ["lightLamp"],
    theory: {
      title: "A counted for loop",
      body: [
        "A counted for loop has three parts inside parentheses, separated by semicolons.",
        "First make a counter with let. In the middle ask whether another turn should run. Last, update the counter for the next turn.",
        "Use the changing counter in the body. lightLamp takes the number printed on a lamp.",
      ],
      example: `for (let count = 2; count > 0; count = count - 1) {
  showScore(count)
}`,
    },
    starter: `// TODO: Walk the numbered lamps from the gate to the fair and light each one.
`,
    hints: [
      "Start at the number nearest the gate.",
      "Include the last lamp, and move forward one number after each turn.",
    ],
    reference: `for (let lamp = 1; lamp <= 5; lamp = lamp + 1) {
  lightLamp(lamp)
}`,
    checks: [
      check("A counter visits lamps 1–5 in order", e =>
        inBlock(e, 'lightLamp', 'for') && same(calls(e, 'lightLamp').map(call => call.args[0]), [1, 2, 3, 4, 5])),
      check("Five separate pools of light appear", e =>
        same(e.world.lamps, [1, 2, 3, 4, 5])),
    ],
    solved: {
      reaction: "There’s light all the way to the fair.",
      did: "Your counter visited each path lamp in order.",
    },
    effect: ["lamps", "1 · 2 · 3 · 4 · 5"],
  },
  {
    id: "robot-walk",
    kind: "write",
    goal: "Walk the robot until it reaches the dock",
    scene: "track",
    cue: "Charging dock · One square per step",
    reason: "A distance card gives steps to the dock. Each step moves the robot one square closer.",
    introduces: ["step"],
    theory: {
      title: "A while loop",
      body: [
        "while repeats a block for as long as its question is true.",
        "Test the distance before stepping. Change the value in the block so the loop can finish.",
        "step moves the robot one square. With zero distance it can stay put.",
      ],
      example: `let tickets = 2
while (tickets > 0) {
  tickets = tickets - 1
}`,
    },
    starter: `// Input card: distance is 4.
let remaining = distance
// TODO: Walk to the dock and keep track of the distance left.
`,
    hints: [
      "Keep stepping only while a positive distance remains.",
      "Reduce the remaining distance on each turn.",
    ],
    reference: `let remaining = distance
while (remaining > 0) {
  step()
  remaining = remaining - 1
}`,
    fixture: {
      readings: { distance: 4 },
    },
    variants: [
      {
        input: "One step",
        fixture: {
          readings: { distance: 1 },
        },
      },
      {
        input: "Already docked",
        fixture: {
          readings: { distance: 0 },
        },
      },
    ],
    checks: [
      check("Distances one and four stop at the dock", e =>
        e.world.steps === e.before.readings.distance && (e.world.steps === 0 || inBlock(e, 'step', 'while'))),
      check("Zero takes no steps", e =>
        e.world.steps === e.before.readings.distance),
    ],
    solved: {
      reaction: "The robot reached its dock.",
      did: "You stepped while a positive distance remained.",
    },
    effect: ["robot", "4 steps"],
  },
  {
    id: "lantern-filter",
    kind: "write",
    goal: "Light only the numbered lamps listed above the flood line",
    scene: "path",
    cue: "Flood line · Lamps 1 and 2 are wet",
    reason: "A tide mark lies between lamp two and lamp three. Only listed lamps on dry ground should glow.",
    theory: {
      title: "A choice inside a loop",
      body: [
        "A loop can contain an if block.",
        "The loop visits each entry. The if tests that particular entry and chooses whether to act.",
        "Keep the action inside both pairs of braces to test each lamp separately.",
      ],
      example: `for (const name of ["Jo", "Ren"]) {
  if (name === "Jo") {
    greet(name)
  }
}`,
    },
    starter: `const lampNumbers = [1, 3, 2, 5]
// TODO: Visit the list and light the dry lamps above number two.
`,
    hints: [
      "Visit even the entries that stay dark.",
      "Check the current number before calling lightLamp.",
    ],
    reference: `const lampNumbers = [1, 3, 2, 5]
for (const lamp of lampNumbers) {
  if (lamp > 2) {
    lightLamp(lamp)
  }
}`,
    checks: [
      check("Listed lamps above two glow", e =>
        inBlock(e, 'lightLamp', 'forOf', 'if') && same(e.world.lamps, [3, 5])),
      check("Wet and unlisted lamps stay dark", e =>
        same(calls(e, 'lightLamp').map(call => call.args[0]), [3, 5])),
    ],
    solved: {
      reaction: "The dry path is lit.",
      did: "Your loop tested each lamp before lighting it.",
    },
    effect: ["lamps", "3 · 5"],
  },
  {
    id: "cargo-total",
    kind: "write",
    goal: "Weigh the entire delivery on one scoreboard",
    scene: "scale",
    cue: "Delivery scales · Add all sacks",
    reason: "Several sacks arrive together. The scale pointer swings to the combined weight and returns to zero for an empty delivery.",
    theory: {
      title: "Accumulating a total",
      body: [
        "An accumulator is a variable that keeps a running result.",
        "Start a sum at zero before the loop. On each turn add the current entry to the previous total.",
        "After the loop the total includes every entry, even when the list was empty and the total stayed zero.",
      ],
      example: `let miles = 3
miles = miles + 2`,
    },
    starter: `// Input card: weights is [2, 5, 1].
// TODO: Build up the delivery weight and display the final total once.
`,
    hints: [
      "Give the total a name outside the loop.",
      "Update it inside, then call showScore after the closing brace.",
    ],
    reference: `let total = 0
for (const weight of weights) {
  total = total + weight
}
showScore(total)`,
    fixture: {
      readings: { weights: [2, 5, 1] },
    },
    variants: [
      {
        input: "Empty delivery",
        fixture: {
          readings: { weights: [] },
        },
      },
      {
        input: "Late delivery",
        fixture: {
          readings: { weights: [4, 3] },
        },
      },
    ],
    checks: [
      check("Every sack contributes once", e =>
        accumulated(e) && calls(e, 'showScore').length === 1),
      check("An empty delivery displays zero", e =>
        e.world.score === e.before.readings.weights!.reduce((sum, weight) => sum + weight, 0)),
    ],
    solved: {
      reaction: "The delivery is weighed.",
      did: "You accumulated one total across a list.",
    },
    effect: ["score", "8"],
  },
])
