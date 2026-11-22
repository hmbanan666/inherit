import { courseUnit, same, check } from '../course'
import { feeds, binary, numeral } from '../syntax'

export default courseUnit({
  id: "numbers-and-output",
  title: "Numbers and output",
  landmark: "a planted gate bed",
}, [
  {
    id: "flowers",
    kind: "write",
    goal: "Plant three flowers by the gate",
    scene: "garden",
    cue: "Gate bed · 3 planting holes",
    reason: "Three marked holes frame the bare gate. Flowers rise in the filled holes.",
    introduces: ["plant"],
    theory: {
      title: "Number values",
      body: [
        "A number tells the game how many.",
        "Write digits directly in your code. Quoting digits would give the game text.",
        "plant takes a number and grows that many flowers in this bed.",
      ],
      example: `plant(2)`,
    },
    starter: `// TODO: Fill the marked planting holes.
`,
    hints: [
      "Count the marks before you write.",
      "Give the planting function a number.",
    ],
    reference: `plant(3)`,
    checks: [
      check("All three holes bloom", e =>
        e.world.gateFlowers === 3),
    ],
    solved: {
      reaction: "The planting holes are full.",
      did: "You gave the planter a number.",
    },
    effect: ["beds", "3 blooms"],
  },
  {
    id: "apple-basket",
    kind: "fill",
    goal: "Gather both trees’ apples into one basket",
    scene: "orchard",
    cue: "Tree tags · 2 apples / 3 apples",
    reason: "Two trees carry two and three apples. The empty basket fills with their combined harvest.",
    introduces: ["fillBasket"],
    theory: {
      title: "Addition",
      body: [
        "An expression is a piece of code that gives a value.",
        "Between numbers, + adds their amounts. The sum can go inside a call.",
        "fillBasket puts that many apples in the basket.",
      ],
      example: `plant(1 + 3)`,
    },
    starter: `// TODO: Combine the harvests shown on the two tree labels.
`,
    hints: [
      "Read a separate number from each label.",
      "Send their sum to the basket.",
    ],
    reference: `fillBasket(2 + 3)`,
    checks: [
      check("Both tree counts contribute to the sum", e =>
        feeds(e, 'fillBasket', binary('+'), numeral(2), numeral(3))),
      check("The basket shows five apples", e =>
        e.world.basket === 5),
    ],
    solved: {
      reaction: "Both trees are picked.",
      did: "Your addition gathered two harvests in one basket.",
    },
    effect: ["basket", "5 apples"],
  },
  {
    id: "score-maths",
    kind: "write",
    goal: "Score the full rows and deduct the cracked tile",
    scene: "scoreboard",
    cue: "Tile grid · 3 rows of 4 / 1 cracked",
    reason: "Three rows of four tiles are lit. One cracked tile is crossed out. The board flips to the surviving count.",
    introduces: ["showScore"],
    theory: {
      title: "Arithmetic with groups",
      body: [
        "The * sign multiplies numbers and - takes an amount away.",
        "TypeScript does multiplication before subtraction. Parentheses group an expression when you want it worked out first.",
        "showScore displays a number on the board.",
      ],
      example: `showScore(2 * 5 - 3)`,
    },
    starter: `// TODO: Score the tiles that can still be played.
`,
    hints: [
      "Each row has the same number of tiles.",
      "Find the whole grid's score before deducting the damage.",
    ],
    reference: `showScore(3 * 4 - 1)`,
    checks: [
      check("Row size and damage enter the calculation", e =>
        feeds(e, 'showScore', binary('*'), binary('-'))),
      check("Board shows eleven", e =>
        e.world.score === 11),
    ],
    solved: {
      reaction: "The cracked tile is out.",
      did: "Your calculation scored the playable tiles.",
    },
    effect: ["score", "11"],
  },
  {
    id: "weigh-ticket",
    kind: "write",
    goal: "Print a weighing slip for both picnic baskets",
    scene: "scale",
    cue: "Picnic basket tags · 4 kg / 6 kg",
    reason: "The picnic carrier needs a written total for baskets marked 4 and 6. The scale printer mirrors numeric Console output on a paper slip.",
    theory: {
      title: "Console output",
      body: [
        "console.log writes a value to the Console so someone can inspect it.",
        "The dot selects the log job belonging to console. Put the value to record in parentheses.",
        "On this scale each logged number also prints on the slip.",
      ],
      example: `console.log(7 - 2)`,
    },
    starter: `// TODO: Print the combined weight for the picnic carrier.
`,
    hints: [
      "Read both basket tags.",
      "Give the logging call one calculation.",
    ],
    reference: `console.log(4 + 6)`,
    checks: [
      check("Console shows the total once", e =>
        same(e.console, ['10'])),
      check("The paper slip reads 10", e =>
        e.world.slip === '10'),
    ],
    solved: {
      reaction: "The carrier has a slip.",
      did: "You printed the combined weight in the Console.",
    },
    effect: ["slip", "10"],
  },
])
