import type { PlayerAPI } from './player'
import type { ChallengeId } from './fixtures'

interface Brief {
  steps?: string[]
  placeholder?: string
  goal: string
  practice: string
  condition: string
  examples: string[]
  title: string
  body: string[]
  example: string
  todo: string[]
  hints: string[]
  checks: string[]
  api: (keyof PlayerAPI)[]
  effect: [string, string]
}

export const briefs: Record<ChallengeId, Brief> = {
  'dispatch-batch': {
    goal: "Dispatch the waiting batch",
    steps: ["Move parcels from belt to cart until the belt is empty", "Press Try"],
    placeholder: "Write your transfer here",
    practice: "Writing a helper that tells its caller when the belt is empty",
    condition: "Move the whole batch from the belt to the cart in one try. Keep arrival order. Leave the arm empty and stop on the first empty pickup.",
    examples: [
      "A,B,C → cart A,B,C",
      "Empty belt → empty cart after one pickup attempt.",
    ],
    title: "A helper with a result",
    body: [
      "Import take and put from \"inherit\" to control the arm.",
      "A pickup returns the front parcel, or undefined at an empty source.",
      "A successful drop frees the hand for another pickup.",
    ],
    example: "const lifted = take(\"right\")",
    todo: [
      "Keep the parcels in arrival order and stop at the first empty pickup.",
    ],
    hints: [
      "Use the helper's result to decide whether to continue.",
      "Try one pickup per transfer. A successful drop frees the hand.",
    ],
    checks: [
      "All ids reach the cart in order",
      "Arm empty",
      "One pickup attempt on an empty belt",
    ],
    api: ["take", "put"],
    effect: ["cart", "A B C"],
  },
  'heavy-tally': {
    goal: "Count heavy parcels",
    practice: "Counting parcels that meet a weight limit, including those exactly at the limit",
    condition: "Move every parcel from the belt to the cart in order. When the belt is empty, display how many weighed at least 5. The display starts blank.",
    examples: [
      "A/2,B/5,C/8 → cart A,B,C and display 2",
      "Empty belt → display 0.",
    ],
    title: "Reading a weight",
    body: [
      "The weight on a lifted parcel is measured in whole units.",
      "Keep a counter outside the unloading loop.",
      "The scale remembers each reading and shows the latest one.",
    ],
    example: "const atLimit = label.weight >= 10",
    todo: [
      "Count the heavy labels as you unload the belt.",
      "Send every parcel on and print one final count.",
    ],
    hints: [
      "Start your count before taking anything.",
      "A parcel that weighs exactly 5 counts. Send lighter parcels to the cart too.",
    ],
    checks: [
      "Boundary weight counted",
      "All parcels dispatched in order",
      "One final reading, including zero",
    ],
    api: ["take", "put", "display"],
    effect: ["scale", "2"],
  },
  'colour-bins': {
    goal: "Sort parcels by colour",
    practice: "Sorting by colour while keeping each bin in arrival order",
    condition: "Empty the belt. Send red parcels to the left bin and blue parcels to the right bin. Preserve arrival order within each colour.",
    examples: [
      "A/red,B/blue,C/red → left A,C and right B",
      "Two blues → empty left and both blues on the right.",
    ],
    title: "Two colour queues",
    body: [
      "A label carries the colour word printed on the parcel.",
      "Check the colour while the hand is holding it.",
      "Dropping a parcel adds it behind the others already in that bin.",
    ],
    example: "const isBlue = label.colour === \"blue\"",
    todo: [
      "Read each parcel's colour.",
      "Drop it in the bin marked for that colour.",
    ],
    hints: [
      "One helper can choose a place from a colour.",
      "Decide from the parcel you just lifted before making the drop.",
    ],
    checks: [
      "Left holds reds in order",
      "Right holds blues in order",
      "Belt and hand empty, including monochrome input",
    ],
    api: ["take", "put"],
    effect: ["left", "A C"],
  },
  'route-table': {
    goal: "Route by shipping label",
    practice: "Using a typed lookup table when appearance is misleading",
    condition: "Route every parcel from the belt using a table. Read the `to` field on its label. Send north to the left bin, south to the right bin and dock to the cart. Keep arrivals in order at each destination.",
    examples: [
      "Blue A/north and red B/south → left A, right B",
      "A/dock,B/dock → cart A,B.",
    ],
    title: "A table for routes",
    body: [
      "A Record maps each allowed key to a value.",
      "Parcel[\"to\"] names the type of a shipping label.",
      "Record<Parcel[\"to\"], Place> checks that all routes have an entry.",
    ],
    example: "const shifts: Record<\"day\" | \"night\", number> = { day: 8, night: 4 }",
    todo: [
      "Build a typed route table for the shipping labels.",
      "Use the label on each lifted parcel to dispatch it.",
    ],
    hints: [
      "Write down all the allowed destination words.",
      "Look up the current destination and pass the resulting place to the arm.",
    ],
    checks: [
      "Table covers every destination",
      "Crossed colours follow labels",
      "Each route keeps arrival order",
    ],
    api: ["take", "put"],
    effect: ["left", "D"],
  },
  'peak-weight': {
    goal: "Find the heaviest parcel",
    practice: "Tracking a maximum while handling an empty input",
    condition: "Move the batch from the belt to the cart. Display the heaviest weight once. Display zero for an empty belt. Weights range from 1 to 99.",
    examples: [
      "A/8,B/3,C/8 → 8, cart A,B,C",
      "Empty → 0, cart empty.",
    ],
    title: "Keeping a maximum",
    body: [
      "A running maximum remembers the greatest weight seen so far.",
      "A lighter parcel leaves that number unchanged.",
      "The blank scale needs a reading even when the batch is empty.",
    ],
    example: "Math.max(4, 2) // 4",
    todo: [
      "Keep the greatest weight seen during dispatch.",
      "Print the result when the batch ends.",
    ],
    hints: [
      "Give an empty batch a defined starting maximum.",
      "Update the maximum only when the new weight is greater.",
    ],
    checks: [
      "Descending inputs keep the first maximum",
      "Ties dispatch both ids",
      "Empty belt displays zero",
      "One reading after dispatch",
    ],
    api: ["take", "put", "display"],
    effect: ["scale", "8"],
  },
  'fragile-head': {
    goal: "Inspect before lifting",
    practice: "Checking whether a parcel is there before trying to lift it",
    condition: "Read the label at the front of the belt. Dispatch parcels weighing 3 or less until you reach a heavier parcel or the belt is empty. Leave the heavier parcel and everything behind it on the belt. Every pickup must succeed.",
    examples: [
      "A/1,B/3,C/4,D/2 → cart A,B and belt C,D",
      "Empty belt → no arm movement.",
    ],
    title: "Look before you lift",
    body: [
      "Inspection reads a label without gripping the parcel.",
      "The front is undefined when the station is empty.",
      "After a pickup, inspect again to see the new front.",
    ],
    example: "const waiting = look(\"right\").front",
    todo: [
      "Inspect the next parcel before touching the belt.",
      "Send light parcels to the cart and stop before the first heavy one.",
    ],
    hints: [
      "Read front again after each delivery.",
      "Test for absence before reading the weight.",
    ],
    checks: [
      "Leading light parcels reach cart",
      "First heavy parcel and those behind it stay on belt",
      "Empty input has no pickup attempts",
    ],
    api: ["look", "take", "put"],
    effect: ["cart", "A B"],
  },
  'merge-bins': {
    goal: "Merge two sorted bins",
    practice: "Choosing between two queues when their front parcels tie or one queue is empty",
    condition: "Both bins start sorted by increasing weight. Merge them into the cart in weight order. When two parcels weigh the same, take from the left bin first. Pick up each parcel once.",
    examples: [
      "Left A/2,C/6 and right B/2,D/4 → A,B,D,C",
      "Empty left and right E/1 → E.",
    ],
    title: "Comparing queue heads",
    body: [
      "Read both bin fronts before choosing which parcel to lift.",
      "The queues are already sorted, so a lighter parcel cannot hide behind a heavier one.",
      "When one queue empties, parcels may still be waiting in the other.",
    ],
    example: "const nextWeight = look(\"right\").front?.weight",
    todo: [
      "Read the front label of each bin.",
      "Choose which bin to unload next, even if one bin is empty.",
    ],
    hints: [
      "Stop when both bins are empty.",
      "For a tie, choose the left bin. If one bin is empty, use the other.",
    ],
    checks: [
      "Cart sorted by weight",
      "Equal heads favour left",
      "Empty sides drain cleanly",
      "One pickup per parcel",
    ],
    api: ["look", "take", "put"],
    effect: ["cart", "A B D C"],
  },
  'bin-dispatch': {
    goal: "Dispatch from the right bin",
    practice: "Designing a reusable move helper for a two-stage route",
    condition: "The cart takes deliveries from the right bin. Empty that bin into the cart first. Then move each incoming parcel from the belt to the right bin and from there to the cart.",
    examples: [
      "P in the right bin, A and B on the belt → cart P,A,B. Both A and B pass through the right bin.",
      "Empty right bin and C on the belt → C goes to the right bin, then to the cart.",
    ],
    title: "Two trips, one helper",
    body: [
      "An arrow on the floor represents one trip.",
      "A parcel already in the right bin has completed its first trip.",
      "A transfer helper can accept both ends of a trip as parameters.",
    ],
    example: "function isWaiting(source: Place) { return look(source).count > 0 }",
    todo: [
      "Write a transfer helper with named source and destination.",
      "Dispatch the waiting batch first. Route each new parcel through the right bin.",
    ],
    hints: [
      "Read the arrows at the two pickup points.",
      "Draw the two trips for one incoming parcel before writing the loop.",
    ],
    checks: [
      "Parcels waiting in the right bin leave first",
      "Each incoming parcel visits the right bin",
      "Only the right bin supplies the cart",
      "Arm and queues end empty",
    ],
    api: ["look", "take", "put"],
    effect: ["cart", "P A B"],
  },
  'first-clock': {
    goal: "Dispatch on the clock",
    practice: "Separating setup, repeated work and idle ticks",
    condition: "Deploy a controller. Watch the belt for six ticks. If a parcel is waiting, move one to the cart. Leave the arm still during setup and on empty ticks.",
    examples: [
      "Ticks 1:A, 3:B,C → cart counts 1,1,2,3,3,3",
      "First arrival on tick 6 → five quiet ticks then one delivery.",
    ],
    title: "Who calls my function?",
    body: [
      "Try reads your file once, from the first line to the last.",
      "Deploy reads it once to set things up. Then the floor clock calls onTick once each tick.",
      "Writing export lets the clock find your function. Lines inside its braces run again on each call.",
      "Watch onTick #1 become #2. Stop loop ends those calls.",
    ],
    example: "export function onTick() {\n  console.log(\"Another tick\")\n}",
    todo: [
      "Write the function the floor clock calls.",
      "On each tick, check the belt and dispatch at most one parcel.",
    ],
    hints: [
      "Top-level work happens only at setup.",
      "Put one guarded transfer in the exported clock function.",
    ],
    checks: [
      "No setup transfers",
      "Each arrival dispatched on its first available tick",
      "Empty ticks leave the arm still",
      "Six ticks conserve every id",
    ],
    api: ["look", "take", "put"],
    effect: ["cart", "A B C"],
  },
  'clear-outlet': {
    goal: "Clear a blocked outlet",
    practice: "Giving jam recovery its own turn in a controller",
    condition: "Empty the left bin into the cart in four ticks. If the bin is jammed, spend the tick clearing it. Otherwise, ship one waiting parcel. The bin starts with at most two parcels and may jam on up to two ticks.",
    examples: [
      "A,B and obstruction before tick 2 → ship A, clear, ship B, idle",
      "No jam and no parcels → four quiet ticks.",
    ],
    title: "A turn for recovery",
    body: [
      "A jammed bin still reports the front parcel and count.",
      "Clearing the blockage leaves that parcel in the bin.",
      "Inspect the outlet again when the clock gives you another turn.",
    ],
    example: "const blocked = look(\"left\").jammed",
    todo: [
      "Inspect the outlet every tick.",
      "Handle a jam or ship a waiting parcel according to that reading.",
    ],
    hints: [
      "Give jam recovery its own branch.",
      "Return after clearing so the parcel waits for the next tick.",
    ],
    checks: [
      "Only real jams cleared",
      "No transfer on recovery ticks",
      "Parcel order survives",
      "Healthy empty ticks stay quiet",
    ],
    api: ["look", "take", "put", "clearJam"],
    effect: ["cart", "A B"],
  },
  'alternate-bins': {
    goal: "Give both bins a turn",
    practice: "Maintaining fair service with state between ticks",
    condition: "Over six ticks, send one parcel to the cart whenever either bin has one. Start with the left bin. After each delivery, give the other bin the next turn. If the preferred bin is empty, use the other one. An empty tick keeps the preference.",
    examples: [
      "Left A,C and right B,D → cart A,B,C,D",
      "Only right B at tick 1, empty tick 2, both sides receive at tick 3 → serve the new left head first.",
    ],
    title: "Remembering a turn",
    body: [
      "A variable declared outside onTick survives the next tick.",
      "A variable inside the function starts fresh on each call.",
      "Remember which bin should have priority after a successful delivery.",
    ],
    example: "let deliveries = 0\nexport function onTick() { console.log(deliveries) }",
    todo: [
      "Remember which bin gets the next turn.",
      "Choose a bin with a parcel and update the preference after delivery.",
    ],
    hints: [
      "Change preference after a delivery.",
      "Give the next turn to the bin that did not supply this parcel.",
    ],
    checks: [
      "Two busy bins alternate",
      "A single busy bin drains",
      "Empty ticks preserve preference",
      "At most one delivery per tick",
    ],
    api: ["look", "take", "put"],
    effect: ["cart", "A B C D"],
  },
  'relay-controller': {
    goal: "Run a two-stage relay",
    practice: "Designing a small state machine that survives gaps in supply",
    condition: "Move each parcel from the belt to the right bin, then to the cart. Make at most one transfer per tick. Empty the right bin before adding another parcel. Finish by tick 8. All parcels arrive by tick 3. In a batch of four, the first parcel arrives on tick 1.",
    examples: [
      "A and B on the belt at tick 1 → A to right bin, A to cart, B to right bin, B to cart",
      "Only C on tick 3 → two idle ticks, then C to right bin and C to cart.",
    ],
    title: "One trip per tick",
    body: [
      "The relay has two possible trips, with the right bin between them.",
      "The waiting parcel tells you which trip needs service.",
      "A tick without arrivals can leave the controller waiting in the same phase.",
    ],
    example: "const waitingForPickup = look(\"right\").count > 0",
    todo: [
      "Represent which station needs service next.",
      "Advance the relay one successful move at a time and handle gaps.",
    ],
    hints: [
      "The right bin starts empty. Which trip brings a parcel to it?",
      "Switch phase only after the transfer finishes.",
    ],
    checks: [
      "One transfer maximum each tick",
      "At most one parcel waits in the right bin",
      "Every parcel visits the right bin before the cart",
      "Gaps and burst arrivals preserve order",
    ],
    api: ["look", "take", "put"],
    effect: ["cart", "A B"],
  },
}
