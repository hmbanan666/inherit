import { courseUnit, calls, check } from '../course'
import { feeds, constant, reading, helperResult } from '../syntax'

export default courseUnit({
  id: "return-values",
  title: "Return values",
  landmark: "an orchard counting table",
}, [
  {
    id: "basket-reading",
    kind: "write",
    goal: "Copy the basket’s live count to the scoreboard",
    scene: "orchard",
    cue: "Harvest counter · Apples in the basket",
    reason: "The counter faces away from the audience. The scoreboard repeats the basket count, including after a new harvest.",
    introduces: ["basketCount"],
    theory: {
      title: "Capturing a result",
      body: [
        "Some functions give a value back to the caller. This value is the result.",
        "basketCount reads the number of apples in the basket. Empty parentheses ask it to take a reading now.",
        "Put a call after = to keep its result in a const, then use that name on the next line.",
      ],
      example: `const reading = basketCount()
console.log(reading)`,
    },
    starter: `// TODO: Take one reading for the audience and display the saved count.
`,
    hints: [
      "Read from the basket before updating the board.",
      "Give showScore the name holding the result.",
    ],
    reference: `const harvest = basketCount()
showScore(harvest)`,
    fixture: { basket: 4 },
    variants: [
      {
        input: "Second harvest",
        fixture: { basket: 7 },
      },
    ],
    checks: [
      check("One reading supplies the board", e =>
        feeds(e, 'showScore', reading('basketCount')) && calls(e, 'basketCount').length === 1),
      check("Counts 4 and 7 both display correctly", e =>
        e.world.score === e.before.basket),
    ],
    effect: ["score", "4"],
  },
  {
    id: "rain-reading",
    kind: "predict",
    goal: "Show the weather sensor’s reading on the rain lamp",
    scene: "garden",
    cue: "Weather sensor · Report the sky",
    reason: "A gardener under the awning cannot see the sky. The sensor's lamp shows whether rain is falling.",
    introduces: ["isRaining"],
    theory: {
      title: "Boolean results",
      body: [
        "A function can give back a boolean just as it can give back a number.",
        "isRaining reads the sky and returns true in rain and false under clear skies.",
        "A saved boolean can go straight into a job that takes a boolean.",
      ],
      example: `const damp = isRaining()
console.log(damp)`,
    },
    prediction: {
      question: "With rain falling, will the sensor send true or false?",
      choices: ["true", "false"],
      answer: "true",
    },
    starter: `// TODO: Read the weather sensor into a name and drive the rain lamp.
`,
    hints: [
      "Predict the reading from the clouds in the scene.",
      "Use setSignal to display the saved reading.",
    ],
    reference: `const raining = isRaining()
setSignal(raining)`,
    fixture: { raining: true },
    variants: [
      {
        input: "Clear sky",
        fixture: { raining: false },
      },
    ],
    checks: [
      check("Rain lights the lamp", e =>
        feeds(e, 'setSignal', reading('isRaining'))),
      check("Clear sky turns it off", e =>
        e.world.signal === e.before.raining),
    ],
    effect: ["signal", "Green"],
  },
  {
    id: "spare-seat",
    kind: "write",
    goal: "Show how many seats remain after one reservation",
    scene: "picnic",
    cue: "Table card · 1 seat reserved",
    reason: "One place at a table is reserved. A chalkboard displays the available places from the table card.",
    theory: {
      title: "Returning from your own function",
      body: [
        "Inside your own function, return sends one value back and ends the call.",
        "The caller chooses what to do with that value.",
        "A function can read a named value declared outside its braces.",
      ],
      example: `function pair() {
  return 1 + 1
}`,
    },
    starter: `// Input card: capacity is 5.
// TODO: Write a function returning the seats left after the reservation.

// TODO: Store its result and show the number.
`,
    hints: [
      "Subtract the reserved place inside the function.",
      "Call your function and pass the saved answer to showScore.",
    ],
    reference: `function availableSeats() {
  return capacity - 1
}

const seats = availableSeats()
showScore(seats)`,
    fixture: {
      readings: { capacity: 5 },
    },
    variants: [
      {
        input: "Eight seats",
        fixture: {
          readings: { capacity: 8 },
        },
      },
    ],
    checks: [
      check("A returned result supplies the chalkboard", e =>
        feeds(e, 'showScore', constant, helperResult())),
      check("Tables of 5 and 8 show 4 and 7", e =>
        e.world.score === e.before.readings.capacity! - 1),
    ],
    effect: ["score", "4"],
  },
])
