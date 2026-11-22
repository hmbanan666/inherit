import { courseUnit, same, check } from '../course'
import { feeds, updated, shape, annotation, property } from '../syntax'

export default courseUnit("arrays", [
  {
    id: "flag-rack",
    kind: "write",
    goal: "Load three flags onto the parade rack in parade order",
    scene: "parade",
    cue: "Hook pattern · Gold / Blue / Gold",
    reason: "A painted pattern shows gold, blue, gold. Three rack hooks display the list the player sends.",
    introduces: ["rackFlags"],
    theory: {
      title: "Array literals",
      body: [
        "An array holds a sequence of values in order.",
        "Write square brackets around the values and separate neighbours with commas. A repeated value gets its own place.",
        "rackFlags hangs the colours from an array of strings, left to right.",
      ],
      example: `const boats = ["Pip", "Rose"]`,
    },
    starter: `// TODO: Store the parade pattern as a list and hang it on the rack.
`,
    hints: [
      "Read the pattern across the hooks.",
      "Give rackFlags the name of the entire list.",
    ],
    reference: `const flags = ["gold", "blue", "gold"]
rackFlags(flags)`,
    checks: [
      check("A single array feeds the rack", e =>
        feeds(e, 'rackFlags', shape('array'))),
      check("All three flags match the pattern", e =>
        same(e.world.flags, ['gold', 'blue', 'gold'])),
    ],
    solved: {
      reaction: "The parade colours are ready.",
      did: "You sent an ordered array to the rack.",
    },
    effect: ["flags", "gold · blue · gold"],
  },
  {
    id: "duck-index",
    kind: "write",
    goal: "Call the second duck to the feeding step",
    scene: "pond",
    cue: "Feeding step · Second duck takes a turn",
    reason: "The three duck tags line up beside a feeding step. The duck whose name Mila says waddles forward.",
    theory: {
      title: "Reading an index",
      body: [
        "An index is a position in an array. The first position is numbered zero.",
        "Write the index inside square brackets immediately after the array name.",
        "The result is that one value, which can be used like any other string.",
      ],
      example: `const shades = ["gold", "blue"]
paintSign(shades[0])`,
    },
    starter: `// Input card: queue is ["Dot", "Fern", "Pip"].
// TODO: Call the duck in the second queue position.
`,
    hints: [
      "Count positions starting from zero.",
      "Give say the value read from the queue.",
    ],
    reference: `say(queue[1])`,
    fixture: {
      readings: { queue: ["Dot", "Fern", "Pip"] },
    },
    variants: [
      {
        input: "Reordered ducks",
        fixture: {
          readings: { queue: ["Pip", "Dot", "Fern"] },
        },
      },
    ],
    checks: [
      check("The second duck reaches the step", e =>
        feeds(e, 'say', shape('index')) && e.world.bubble === e.before.readings.queue![1]),
      check("A reordered queue calls its new second duck", e =>
        e.world.bubble === e.before.readings.queue![1],
        entry => entry.readings.queue![0] === 'Pip'),
    ],
    solved: {
      reaction: "The second duck has a turn.",
      did: "You read a name by its position in the queue.",
    },
    effect: ["speech", "Fern"],
  },
  {
    id: "queue-length",
    kind: "predict",
    goal: "Show the waiting queue size above the landing",
    scene: "pier",
    cue: "Landing counter · People waiting",
    reason: "People need to know how many are ahead. The counter follows the queue even when the pier is empty.",
    theory: {
      title: "Length",
      body: [
        "An array keeps a count called length.",
        "A dot followed by length reads the count. This is a value, so it needs no parentheses.",
        "An empty array has a length of zero.",
      ],
      example: `const boats = ["Pip", "Rose"]
console.log(boats.length)`,
    },
    prediction: {
      question: "With three names on the queue card, will the board show 2 or 3?",
      choices: ["2", "3"],
      answer: "3",
    },
    starter: `// Input card: waiting is ["Mila", "Jo", "Bo"].
// TODO: Display how many names are waiting.
`,
    hints: [
      "Predict the count before pressing Run.",
      "Use the list's count for the scoreboard.",
    ],
    reference: `showScore(waiting.length)`,
    fixture: {
      readings: { waiting: ["Mila", "Jo", "Bo"] },
    },
    variants: [
      {
        input: "Empty pier",
        fixture: {
          readings: { waiting: [] },
        },
      },
    ],
    checks: [
      check("Board matches the queue", e =>
        feeds(e, 'showScore', property('length')) && e.world.score === e.before.readings.waiting!.length),
      check("Empty pier shows zero", e =>
        e.world.score === 0,
        entry => entry.readings.waiting!.length === 0),
    ],
    solved: {
      reaction: "The landing has a counter.",
      did: "You used the list’s length to count the queue.",
    },
    effect: ["score", "3"],
  },
  {
    id: "extra-flag",
    kind: "fill",
    goal: "Add the late float’s flag at the end of the rack",
    scene: "parade",
    cue: "Late float · One blue pennant",
    reason: "A late float carries a blue pennant. Existing flags keep their places and one new flag appears at the right.",
    theory: {
      title: "Appending with push",
      body: [
        "push is a job belonging to an array. It adds one value at the end.",
        "Call it with a dot, the word push, and the new value in parentheses.",
        "The same array now has another entry. A const can still name this array as its contents change.",
      ],
      example: `const names = ["Bo"]
names.push("Jo")`,
    },
    starter: `const flags = ["gold", "gold"]
// TODO: Add the pennant from the late float.

rackFlags(flags)`,
    hints: [
      "Work on the existing array before the rack is filled.",
      "Append just the late float's colour.",
    ],
    reference: `const flags = ["gold", "gold"]
flags.push("blue")
rackFlags(flags)`,
    fixture: { flags: ["gold", "gold"] },
    checks: [
      check("Original flags stay in order", e =>
        updated(e, 'rackFlags', 'push') && same(e.world.flags.slice(0, 2), ['gold', 'gold'])),
      check("A blue flag hangs on the last hook", e =>
        same(e.world.flags, ['gold', 'gold', 'blue'])),
    ],
    solved: {
      reaction: "The late float is in the parade.",
      did: "You appended a flag after the original pair.",
    },
    effect: ["flags", "gold · gold · blue"],
  },
  {
    id: "typed-tray",
    kind: "write",
    goal: "Load only numeric weights onto the weighing tray",
    scene: "scale",
    cue: "Weighing pockets · 2 / 4 / 1 / 3",
    reason: "Its four pockets are labelled 2, 4, 1 and 3. Loading the weights lowers each pocket in turn.",
    introduces: ["loadWeights"],
    theory: {
      title: "Typed arrays",
      body: [
        "Brackets after a type mean an array whose entries have that type.",
        "number[] accepts numeric entries. string[] accepts words.",
        "loadWeights takes a number array and lays the weights into the tray in order.",
      ],
      example: `const labels: string[] = ["tea", "jam"]`,
    },
    starter: `// TODO: Make a typed list from the pocket labels and load the tray.
`,
    hints: [
      "Read the marks from the left.",
      "Give the whole list to loadWeights.",
    ],
    reference: `const weights: number[] = [2, 4, 1, 3]
loadWeights(weights)`,
    checks: [
      check("The tray list is annotated for numbers", e =>
        feeds(e, 'loadWeights', annotation('number[]'))),
      check("Each pocket holds its marked weight", e =>
        same(e.world.tray, [2, 4, 1, 3])),
    ],
    solved: {
      reaction: "Every pocket has a weight.",
      did: "You loaded a list with a numeric entry type.",
    },
    effect: ["tray", "2 · 4 · 1 · 3"],
  },
])
