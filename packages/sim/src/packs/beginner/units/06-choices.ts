import { courseUnit, calls, check } from '../course'
import { feeds, binary, shape, inBlock } from '../syntax'

export default courseUnit("choices", [
  {
    id: "picnic-threshold",
    kind: "write",
    goal: "Light the picnic signal when three apples can be shared",
    scene: "picnic",
    cue: "Picnic setting · 3 plates",
    reason: "Three plates wait beside the basket. The signal lights only when there is enough fruit for everyone.",
    theory: {
      title: "Comparisons",
      body: [
        "Comparisons ask questions about values. They give a boolean back.",
        "Use > for greater than, < for less than, and >= or <= to include equality. Use === to ask if two values match.",
        "You can save a comparison and give its answer to setSignal.",
      ],
      example: `const crowded = 8 > 6`,
    },
    starter: `const apples = basketCount()
// TODO: Signal whether there is at least one apple per plate.
`,
    hints: [
      "Include the basket with exactly three apples.",
      "Compare the reading to the number of plates.",
    ],
    reference: `const apples = basketCount()
setSignal(apples >= 3)`,
    fixture: { basket: 3 },
    variants: [
      {
        input: "Two apples",
        fixture: { basket: 2 },
      },
      {
        input: "Four apples",
        fixture: { basket: 4 },
      },
    ],
    checks: [
      check("The signal is off at two", e =>
        calls(e, 'basketCount').length > 0 && e.world.signal === (e.before.basket >= 3)),
      check("It lights at three and four", e =>
        e.world.signal === (e.before.basket >= 3)),
    ],
    solved: {
      reaction: "Everyone can see when to share.",
      did: "Your comparison included a basket with exactly enough apples.",
    },
    effect: ["signal", "Green"],
  },
  {
    id: "weather-watch",
    kind: "write",
    goal: "Open the canopy when rain reaches the path",
    scene: "path",
    cue: "Canopy keeper · Shelter the walkers",
    reason: "The folded canopy shelters walkers when the sky turns grey. In sunshine its ropes stay still.",
    introduces: ["openCanopy"],
    theory: {
      title: "An if block",
      body: [
        "if uses a boolean to decide whether to run some lines.",
        "Put the question in parentheses and the actions inside braces.",
        "openCanopy pulls the shelter across the path.",
      ],
      example: `if (2 < 3) {
  ringBell()
}`,
    },
    starter: `const raining = isRaining()
// TODO: Pull out the shelter when the path needs it.
`,
    hints: [
      "Ask the if to read the weather value.",
      "Keep the canopy action inside the braces.",
    ],
    reference: `const raining = isRaining()
if (raining) {
  openCanopy()
}`,
    fixture: { raining: true },
    variants: [
      {
        input: "Clear sky",
        fixture: { raining: false },
      },
    ],
    checks: [
      check("Rain opens the shelter", e =>
        !e.before.raining || inBlock(e, 'openCanopy', 'if')),
      check("Clear sky leaves the ropes still", e =>
        e.world.canopy === e.before.raining && calls(e, 'openCanopy').length === Number(e.before.raining)),
    ],
    solved: {
      reaction: "The walkers stay dry.",
      did: "Your condition opened the shelter when it rained.",
    },
    effect: ["canopy", "Open"],
  },
  {
    id: "weather",
    kind: "fill",
    goal: "Match the shelter to the weather in either direction",
    scene: "path",
    cue: "Canopy ropes · Pull to shelter or fold",
    reason: "The keeper may arrive to find the canopy in either position. The ropes extend in rain and fold back in sun.",
    introduces: ["foldCanopy"],
    theory: {
      title: "Choosing with else",
      body: [
        "An else gives an if another path when its question is false.",
        "Write else after the closing brace and put the other action in a new pair of braces.",
        "foldCanopy draws the cover back.",
      ],
      example: `if (1 > 2) {
  say("High")
} else {
  say("Low")
}`,
    },
    starter: `if (isRaining()) {
  openCanopy()
}
// TODO: Retract the canopy in the other weather.
`,
    hints: [
      "Attach the other path to the existing choice.",
      "Use the job that folds the cover.",
    ],
    reference: `if (isRaining()) {
  openCanopy()
} else {
  foldCanopy()
}`,
    fixture: {
      raining: false,
      canopy: true,
    },
    variants: [
      {
        input: "Rain on the path",
        fixture: {
          raining: true,
          canopy: false,
        },
      },
    ],
    checks: [
      check("Rain keeps walkers covered", e =>
        e.before.raining ? inBlock(e, 'openCanopy', 'if') && e.world.canopy : true),
      check("Sunshine folds an open canopy", e =>
        e.before.raining || (inBlock(e, 'foldCanopy', 'if') && !e.world.canopy)),
    ],
    solved: {
      reaction: "The keeper can leave the ropes with you.",
      did: "You supplied an action for either weather.",
    },
    effect: ["canopy", "Folded"],
  },
  {
    id: "podium",
    kind: "write",
    goal: "Label each podium lane with its medal",
    scene: "scoreboard",
    cue: "Medals · 1 gold / 2 silver / 3 bronze",
    reason: "Runners in positions 1, 2 and 3 look for gold, silver and bronze labels. The board flips to the medal for the lane.",
    theory: {
      title: "A third outcome",
      body: [
        "else if asks another question after the first answer was false.",
        "Only the first matching branch runs. A final else catches the remaining case.",
        "Test the most specific cases before that last branch.",
      ],
      example: `const level: number = 2
if (level < 1) {
  say("Below")
} else if (level === 1) {
  say("Level")
} else {
  say("Above")
}`,
    },
    starter: `// Input card: position is 2.
// TODO: Paint the medal for this finishing position.
`,
    hints: [
      "Test first and second place separately.",
      "Use the remaining path for third.",
    ],
    reference: `if (position === 1) {
  paintSign("gold")
} else if (position === 2) {
  paintSign("silver")
} else {
  paintSign("bronze")
}`,
    fixture: {
      readings: { position: 2 },
    },
    variants: [
      {
        input: "First place",
        fixture: {
          readings: { position: 1 },
        },
      },
      {
        input: "Third place",
        fixture: {
          readings: { position: 3 },
        },
      },
    ],
    checks: [
      check("The middle branch awards silver", e =>
        inBlock(e, 'paintSign', 'elseIf')),
      check("First and third show gold and bronze", e =>
        e.world.sign === ['gold', 'silver', 'bronze'][e.before.readings.position! - 1]),
    ],
    solved: {
      reaction: "The medals are in place.",
      did: "You chose among three outcomes with an else if.",
    },
    effect: ["signs", "silver"],
  },
  {
    id: "two-keys",
    kind: "write",
    goal: "Open the start signal only when both judges are ready",
    scene: "track",
    cue: "Start line · Both judges must be ready",
    reason: "Two flags indicate readiness. The robot sees a green start light only when both flags are up.",
    theory: {
      title: "Both conditions with &&",
      body: [
        "The && operator joins two boolean questions.",
        "Its answer is true when both sides are true.",
        "One lowered flag is enough to hold the start.",
      ],
      example: `const bothLit = true && false`,
    },
    starter: `// Input card: leftReady is true.
// Input card: rightReady is false.
// TODO: Drive the start signal from both judge flags.
`,
    hints: [
      "Try the case where just one judge is ready.",
      "Combine the two names into one boolean for setSignal.",
    ],
    reference: `setSignal(leftReady && rightReady)`,
    fixture: {
      readings: {
        leftReady: true,
        rightReady: false,
      },
    },
    variants: [
      {
        input: "leftReady true, rightReady true",
        fixture: {
          readings: {
            leftReady: true,
            rightReady: true,
          },
        },
      },
      {
        input: "leftReady false, rightReady true",
        fixture: {
          readings: {
            leftReady: false,
            rightReady: true,
          },
        },
      },
      {
        input: "leftReady false, rightReady false",
        fixture: {
          readings: {
            leftReady: false,
            rightReady: false,
          },
        },
      },
    ],
    checks: [
      check("Both ready starts the race", e =>
        feeds(e, 'setSignal', binary('&&'))),
      check("Every other pair holds the start", e =>
        e.world.signal === (e.before.readings.leftReady && e.before.readings.rightReady)),
    ],
    solved: {
      reaction: "Both judges have a say.",
      did: "Your start signal waited for both flags.",
    },
    effect: ["signal", "Off"],
  },
  {
    id: "either-bell",
    kind: "write",
    goal: "Light the pond alarm when either gate opens",
    scene: "pond",
    cue: "Warning · Either open gate trips the alarm",
    reason: "Two gates keep ducklings away from the road. Opening either gate makes the warning lens glow.",
    theory: {
      title: "Either condition with ||",
      body: [
        "The || operator reads as “or”.",
        "It gives true when at least one side is true, including when both are true.",
        "When both sides are false the result is false.",
      ],
      example: `const weekend = false || true`,
    },
    starter: `// Input card: nearOpen is false.
// Input card: farOpen is true.
// TODO: Use the gate readings to drive the warning lens.
`,
    hints: [
      "A single open gate already needs a warning.",
      "Pass the combined readings to setSignal.",
    ],
    reference: `setSignal(nearOpen || farOpen)`,
    fixture: {
      readings: {
        nearOpen: false,
        farOpen: true,
      },
    },
    variants: [
      {
        input: "nearOpen true, farOpen true",
        fixture: {
          readings: {
            nearOpen: true,
            farOpen: true,
          },
        },
      },
      {
        input: "nearOpen true, farOpen false",
        fixture: {
          readings: {
            nearOpen: true,
            farOpen: false,
          },
        },
      },
      {
        input: "nearOpen false, farOpen false",
        fixture: {
          readings: {
            nearOpen: false,
            farOpen: false,
          },
        },
      },
    ],
    checks: [
      check("Either or both gates light the lens", e =>
        feeds(e, 'setSignal', binary('||'))),
      check("Two closed gates clear it", e =>
        e.world.signal === (e.before.readings.nearOpen || e.before.readings.farOpen)),
    ],
    solved: {
      reaction: "The pond gates have an alarm.",
      did: "Either open gate could light your warning.",
    },
    effect: ["signal", "Green"],
  },
  {
    id: "quiet-light",
    kind: "write",
    goal: "Show the quiet light while the bell is silent",
    scene: "village",
    cue: "Nursery · Quiet between bell rings",
    reason: "A sleeping child needs a quiet indicator. The lens is green between rings and dark during a ring.",
    theory: {
      title: "Negation",
      body: [
        "A leading ! flips a boolean.",
        "It changes true to false and false to true.",
        "You can put it directly in front of a variable name.",
      ],
      example: `const ready = !false`,
    },
    starter: `// Input card: ringing is true.
// TODO: Signal when the room is quiet.
`,
    hints: [
      "The lens and the ringing have opposite values.",
      "Flip the reading before you send it to the lens.",
    ],
    reference: `setSignal(!ringing)`,
    fixture: {
      readings: { ringing: true },
    },
    variants: [
      {
        input: "Silent bell",
        fixture: {
          readings: { ringing: false },
        },
      },
    ],
    checks: [
      check("Silent lights green", e =>
        feeds(e, 'setSignal', shape('negation'))),
      check("Ringing blanks the lens", e =>
        e.world.signal === !e.before.readings.ringing),
    ],
    solved: {
      reaction: "The nursery has a quiet light.",
      did: "You flipped the bell reading to signal silence.",
    },
    effect: ["signal", "Off"],
  },
])
