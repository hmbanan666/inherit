import { courseUnit, calls, same, check } from '../course'
import { feeds, shape, helperResult, property, insideHelper, interfaceBooking } from '../syntax'

export default courseUnit({
  id: "fair-capstone",
  title: "Objects, interfaces and the fair capstone",
  landmark: "the open village fair",
}, [
  {
    id: "stall-card",
    kind: "write",
    goal: "Give the stall a card with its name and seat count",
    scene: "fair",
    cue: "Stall order · Kites / 3 seats",
    reason: "An empty cardholder has spaces for name and seats. postCard copies both fields onto the stand.",
    introduces: ["postCard"],
    theory: {
      title: "Object literals",
      body: [
        "An object keeps related values under names called properties.",
        "Inside braces, write a property name, a colon and its value. Separate properties with commas.",
        "postCard displays a card with a name field for text and a seats field for a number.",
      ],
      example: `const boat = { name: "Pip", decks: 2 }`,
    },
    starter: `// TODO: Build and post a card for Kites with three seats.
`,
    hints: [
      "Read the field names on the empty cardholder.",
      "Give postCard the object you made.",
    ],
    reference: `const stall = { name: "Kites", seats: 3 }
postCard(stall)`,
    checks: [
      check("One object supplies both fields", e =>
        feeds(e, 'postCard', shape('object'))),
      check("Stand reads Kites with three seats", e =>
        same(e.world.cards, [{ name: 'Kites', seats: 3 }])),
    ],
    effect: ["cards", "Kites · 3 seats"],
  },
  {
    id: "seat-field",
    kind: "fill",
    goal: "Show the seat count from the booking card",
    scene: "fair",
    cue: "Steward’s counter · Seats on the booking",
    reason: "A steward at the gate can see a scoreboard but cannot read the tiny booking card. The board mirrors its seats field.",
    theory: {
      title: "Reading a property",
      body: [
        "A dot after an object's name lets you read one property.",
        "Write the property name to the right of the dot. The result has that property's type.",
        "Use the number you read in a score call.",
      ],
      example: `const boat = { name: "Pip" }
say(boat.name)`,
    },
    starter: `// Input card: booking is { name: "Tea", seats: 4 }.
// TODO: Display the booked seats for the steward.
`,
    hints: [
      "Pick the property that contains a number.",
      "Read it from booking and give it to showScore.",
    ],
    reference: `showScore(booking.seats)`,
    fixture: {
      readings: {
        booking: {
          name: "Tea",
          seats: 4,
        },
      },
    },
    variants: [
      {
        input: "Another booking",
        fixture: {
          readings: {
            booking: {
              name: "Jam",
              seats: 2,
            },
          },
        },
      },
    ],
    checks: [
      check("The board follows the seats field", e =>
        feeds(e, 'showScore', property('seats'))),
      check("A changed booking updates the board", e =>
        e.world.score === e.before.readings.booking!.seats),
    ],
    effect: ["score", "4"],
  },
  {
    id: "guest-shape",
    kind: "write",
    goal: "Describe a guest card and post the first booking",
    scene: "fair",
    cue: "Booking desk · Sol / 2 seats",
    reason: "The clerk needs a reusable form for names and party sizes. The first accepted card hangs beside the ledger.",
    theory: {
      title: "Interfaces",
      body: [
        "An interface gives a name to an object shape. Put its property names and types inside braces, one per line.",
        "The interface describes fields. A separate object supplies actual values.",
        "Use your interface name after a colon to check a booking against the form.",
      ],
      example: `interface Lamp {
  lit: boolean
}`,
    },
    starter: `// TODO: Describe a Guest with a name and seats.

// TODO: Use that form for Sol's booking for two and post the card.
`,
    hints: [
      "Choose a text type for a name and a numeric type for seats.",
      "Annotate the object with your interface name.",
    ],
    reference: `interface Guest {
  name: string
  seats: number
}

const booking: Guest = { name: "Sol", seats: 2 }
postCard(booking)`,
    checks: [
      check("A Guest interface checks the booking", e =>
        feeds(e, 'postCard', interfaceBooking)),
      check("Sol's card shows two seats", e =>
        same(e.world.cards, [{ name: 'Sol', seats: 2 }])),
    ],
    effect: ["cards", "Sol · 2 seats"],
  },
  {
    id: "guest-helper",
    kind: "write",
    goal: "Give the usher a reusable job for calling a guest’s name",
    scene: "fair",
    cue: "Usher’s card · Fern / 2 seats",
    reason: "The usher receives a whole card from the clerk. Only the guest’s name belongs in the speech bubble.",
    theory: {
      title: "Objects as parameters",
      body: [
        "A function parameter can use an interface as its type.",
        "The caller passes one whole object. Inside the function use a dot to pick the field the job needs.",
        "Two cards with the same shape can go through the same job.",
      ],
      example: `interface Lamp {
  lit: boolean
}
function display(lamp: Lamp) {
  setSignal(lamp.lit)
}`,
    },
    starter: `interface Guest {
  name: string
  seats: number
}
const card: Guest = { name: "Fern", seats: 2 }
// TODO: Write an usher function for a guest card, then call it.
`,
    hints: [
      "Give the function a Guest parameter.",
      "Read the name inside the function when you call greet.",
    ],
    reference: `interface Guest {
  name: string
  seats: number
}

const card: Guest = { name: "Fern", seats: 2 }

function usher(guest: Guest) {
  greet(guest.name)
}

usher(card)`,
    checks: [
      check("The helper accepts a Guest", e =>
        insideHelper(e, 'greet', ['Guest'])),
      check("The named visitor walks in", e =>
        same(e.world.neighbours, ['Fern'])),
    ],
    effect: ["neighbours", "Fern"],
  },
  {
    id: "guest-ledger",
    kind: "write",
    goal: "Post every booking from the fair ledger",
    scene: "fair",
    cue: "Booking rail · One card per guest",
    reason: "The ledger arrives as several cards at once. Each booking becomes a visible card on the rail.",
    introduces: ["guests"],
    theory: {
      title: "Arrays of objects",
      body: [
        "An array can hold objects, including objects checked by an interface.",
        "The game supplies the Guest shape you just practised. Write Guest[] for a list of Guest cards. The fair’s guests() function returns the booked cards in arrival order.",
        "In a for…of loop the name for each entry now holds an entire card.",
      ],
      example: `const boats = [{ name: "Pip" }, { name: "Rose" }]
say(boats[0].name)`,
    },
    starter: `// TODO: Read the booking list and post every card in order.
`,
    hints: [
      "Keep the returned list in a const.",
      "Give postCard one entry per turn.",
    ],
    reference: `const bookings = guests()
for (const booking of bookings) {
  postCard(booking)
}`,
    fixture: { ledger: [
      {
        name: "Tea",
        seats: 4,
      },
      {
        name: "Kites",
        seats: 0,
      },
      {
        name: "Music",
        seats: 2,
      },
    ] },
    variants: [
      {
        input: "Empty ledger",
        fixture: { ledger: [] },
      },
    ],
    checks: [
      check("Every booking appears in order", e =>
        calls(e, 'guests').length > 0 && same(e.world.cards, e.before.ledger)),
      check("An empty ledger posts nothing", e =>
        same(e.world.cards, e.before.ledger)),
    ],
    effect: ["cards", "Tea · 4 seats"],
  },
  {
    id: "fair-signs",
    kind: "write",
    goal: "Print one named seat sign for every fair stall",
    scene: "fair",
    cue: "Stall signs · Name followed by seat count",
    reason: "Stallholders need signs in the form Tea 4 for a card with name Tea and seats 4. The sign rail fills in booking order.",
    theory: {
      title: "Build a sign printer",
      body: [
        "Start by choosing the input and output of your sign maker.",
        "One card carries everything the sign needs. Your function can return finished text while a loop handles the queue.",
        "Try a one-card ledger first and read what actually appears on the rail.",
      ],
      example: `const label = \`Lane \${2}\``,
    },
    starter: `// TODO: Write a function that turns a Guest card into a sign.

// TODO: Use it to paint every booking's sign.
`,
    hints: [
      "Choose a Guest parameter and a string result.",
      "Put the name and seat count on either side of one space.",
    ],
    reference: `function sign(card: Guest): string {
  return \`\${card.name} \${card.seats}\`
}

for (const card of guests()) {
  paintSign(sign(card))
}`,
    fixture: { ledger: [
      {
        name: "Tea",
        seats: 4,
      },
    ] },
    variants: [
      {
        input: "Mixed ledger",
        fixture: { ledger: [
          {
            name: "Tea",
            seats: 4,
          },
          {
            name: "Kites",
            seats: 0,
          },
          {
            name: "Music",
            seats: 2,
          },
        ] },
      },
    ],
    checks: [
      check("One helper formats each card", e =>
        feeds(e, 'paintSign', helperResult())),
      check("Signs match both the single and mixed ledgers", e =>
        same(e.world.signs, e.before.ledger.map(card => `${card.name} ${card.seats}`))),
    ],
    effect: ["signs", "Tea 4"],
  },
  {
    id: "fair-tables",
    kind: "write",
    goal: "Set the seat counter from all bookings that need places",
    scene: "fair",
    cue: "Shared seating · Standing guests take no places",
    reason: "Standing guests have zero seats. Seated bookings share a bench and the steward needs the total on the board.",
    theory: {
      title: "Build a seating calculator",
      body: [
        "Decide which value you need to carry from one turn of your loop to the next.",
        "A function can receive the whole list and return a single number.",
        "Think through an empty ledger before you decide where the total starts.",
      ],
      example: `const empty: number[] = []
showScore(empty.length)`,
    },
    starter: `// TODO: Write a function that totals the seats in a Guest list.

// TODO: Read the ledger and display the result for the steward.
`,
    hints: [
      "Use an array of Guest as the parameter type.",
      "Add each card's seats and return after the loop has finished.",
    ],
    reference: `function seats(bookings: Guest[]): number {
  let total = 0
  for (const card of bookings) {
    total = total + card.seats
  }
  return total
}

showScore(seats(guests()))`,
    fixture: { ledger: [
      {
        name: "Tea",
        seats: 4,
      },
      {
        name: "Kites",
        seats: 0,
      },
      {
        name: "Music",
        seats: 2,
      },
    ] },
    variants: [
      {
        input: "Empty ledger",
        fixture: { ledger: [] },
      },
      {
        input: "Single booking",
        fixture: { ledger: [
          {
            name: "Tea",
            seats: 4,
          },
        ] },
      },
    ],
    checks: [
      check("A function returns the ledger total", e =>
        feeds(e, 'showScore', helperResult())),
      check("Mixed and empty ledgers show their exact totals", e =>
        e.world.score === e.before.ledger.reduce((total, card) => total + card.seats, 0)),
    ],
    effect: ["score", "6"],
  },
  {
    id: "fair-opening",
    kind: "write",
    goal: "Open booked stalls and raise the banner for a seated fair",
    scene: "fair",
    cue: "Opening ceremony · Stalls for seated bookings",
    reason: "Each booking with seats needs a named stall. The village raises a banner only when at least one stall opens. The final panorama shows the gathered guests.",
    introduces: ["openStall", "hangBanner"],
    theory: {
      title: "Build the opening ceremony",
      body: [
        "Plan the ceremony in two parts. Decide what one card needs, then decide what the whole fair earned.",
        "Your function can use comparisons, choices and a count to take both decisions from the same ledger.",
        "openStall takes the stall name. hangBanner raises the welcome banner once.",
      ],
      example: `if (basketCount() > 0) {
  ringBell()
}`,
    },
    starter: `// TODO: Write a ceremony function for a Guest list.

// TODO: Open stalls for seated bookings and raise the banner if any open.

// TODO: Run the ceremony on today's ledger.
`,
    hints: [
      "Try a ledger of standing guests before the mixed one.",
      "Track openings as you go, then make the banner decision after the loop.",
    ],
    reference: `function openFair(bookings: Guest[]) {
  let open = 0
  for (const card of bookings) {
    if (card.seats > 0) {
      openStall(card.name)
      open = open + 1
    }
  }
  if (open > 0) {
    hangBanner()
  }
}

openFair(guests())`,
    fixture: { ledger: [
      {
        name: "Tea",
        seats: 4,
      },
      {
        name: "Kites",
        seats: 0,
      },
      {
        name: "Music",
        seats: 2,
      },
    ] },
    variants: [
      {
        input: "Standing guests",
        fixture: { ledger: [
          {
            name: "Dot",
            seats: 0,
          },
        ] },
      },
      {
        input: "Empty fair",
        fixture: { ledger: [] },
      },
    ],
    checks: [
      check("Exactly the seated guests get stalls in order", e =>
        calls(e, 'guests').length > 0 && same(e.world.stalls, e.before.ledger.filter(card => card.seats > 0).map(card => card.name)) && calls(e, 'openStall').every(call => !!call.within)),
      check("The banner rises once for a nonempty seated fair", e =>
        calls(e, 'hangBanner').length === Number(e.before.ledger.some(card => card.seats > 0)) && e.world.banner === e.before.ledger.some(card => card.seats > 0)),
    ],
    effect: ["banner", "Fair open"],
  },
])
