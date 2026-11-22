import type { LessonStep } from './lesson-flow'

export const starter = `// Uncle's workshop. His arm can take from a place and put into a place.
import { take, put } from "inherit"
// take("mine") tells the arm where to pick up a rock. Try it below.
`
export const firstIngotAfterRetry =
  'Your first Run found the furnace still working, so take came back empty. Running again collected the finished ingot.'

const smeltBlock = `function smelt() {
  take("mine")
  put("furnace")
}
smelt()`

const clockBlock = `export function onTick() {
  smelt()
  ship()
}`

export const lessons: LessonStep[] = [
  {
    id: 'bram-take',
    beat: 1,
    who: 'bram',
    button: 'run',
    starter,
    title: 'A rock for the forge',
    story: 'My mail horse threw a shoe. Does your uncle’s arm still reach the mine?',
    task: 'Uncle’s import line brings the arm controls from his workshop kit, “inherit”.\nIn main.ts, use take on the blank line below the import. Put "mine" inside parentheses, then press Run. Hint can show you the exact line.',
    idea: {
      name: 'Tell the arm where to go',
      explain: 'A call tells the arm what to do, and the name in quotes matches a label on the floor.',
    },
    hints: ['Find the place that supplies rock.', 'Use take with the label on the mine.', 'take("mine")'],
    checks: [{ id: 'hold', text: 'The arm holds a rock from the mine' }],
    solved: {
      reaction: 'It still works! I can see the rock in its grip.',
      did: 'You lifted a rock from the mine.',
      idea: 'The quoted name sent the arm to the right place.',
      reward: 'A rock in hand',
    },
  },
  {
    id: 'bram-feed',
    beat: 1,
    who: 'bram',
    title: 'Wake the furnace',
    story: 'That rock will make a shoe once it gets hot. See the cold hearth?',
    task: `Keep the pickup line. Under it, use put to leave the rock at "furnace".
Press Run and watch the hearth.`,
    idea: {
      name: 'One line after another',
      explain: 'Each Run starts fresh: the arm first puts back what it holds, then runs your lines from the top.',
    },
    hints: ['Pick up first, set down second.', 'Use put with the furnace label.', 'put("furnace")'],
    checks: [{ id: 'bram-feed', text: 'A rock reaches the furnace' }],
    solved: {
      reaction: 'There’s heat in that old hearth again.',
      did: 'You lit the hearth with a rock from the mine.',
      idea: 'The second line used what the first line left in the hand.',
      reward: 'A glowing hearth',
    },
    button: 'run',
  },
  {
    id: 'bram-cart',
    beat: 1,
    who: 'bram',
    title: 'Bring me the first ingot',
    story: 'I’ll hold the cart steady. Is the first ingot ready?',
    task: `Below your two lines, take the ingot from "furnace", then put it in "cart".
Press Run. If the cart check stays empty, press Run again.`,
    idea: { name: 'Nothing ready yet', explain: 'A pickup can come back empty while a machine is working.' },
    hints: [
      'Try the furnace again if the ingot is still taking shape.',
      'Take from the furnace, then put into the cart.',
      `take("furnace")
put("cart")`,
    ],
    checks: [{ id: 'bram-cart', text: "First ingot in Bram's cart" }],
    solved: {
      reaction: 'I can hammer this ingot into a horseshoe.',
      did: 'Bram caught your first ingot.',
      idea: 'The arm carried the ingot from the furnace to the cart.',
      reward: 'Bram’s sample ingot',
    },
    button: 'run',
  },
  {
    id: 'bram-smelt',
    beat: 1,
    who: 'bram',
    title: 'Give the hearth work a name',
    story: 'Uncle called feeding the furnace smelting. Can you show me his trick?',
    task: 'Replace the two gold lines with this block. Keep the two cart lines underneath.',
    callsToMove: [{ name: 'take', place: 'mine' }, { name: 'put', place: 'furnace' }],
    idea: {
      name: 'Function',
      explain: 'The first part names the job, and smelt() below asks the arm to do it.',
    },
    example: smeltBlock + '   // this line starts the job',
    hints: [
      'Keep the same two moves inside the braces.',
      'Put the mine pickup and furnace drop inside smelt, then call smelt.',
      smeltBlock,
    ],
    checks: [{ id: 'bram-smelt', text: 'Calling smelt feeds the furnace' }],
    solved: {
      reaction: 'Smelt! Two moves with one word.',
      did: 'You named the two moves that feed the fire.',
      idea: 'Calling smelt ran both of your lines.',
      reward: 'smelt in your library',
    },
    button: 'run',
  },
  {
    id: 'bram-ship',
    beat: 1,
    who: 'bram',
    title: 'Give loading the cart a name',
    story: 'I can call for a load now. What shall I shout when the ingot is ready?',
    task: `Keep smelt and its call. Group the last two lines, from "furnace" to "cart", in a function named ship.
Call ship() below it and press Run for another sample.`,
    idea: { name: 'Practice', explain: 'Each function keeps its own set of steps.' },
    hints: [
      'Use the pattern you used at the hearth.',
      'The pickup is at the furnace and the drop is at the cart.',
      `function ship() {
  take("furnace")
  put("cart")
}
ship()`,
    ],
    checks: [{ id: 'bram-ship', text: 'Calling ship brings an ingot to the cart' }],
    solved: {
      reaction: 'Another ingot for my forge!',
      did: 'Your ship call loaded an ingot.',
      idea: 'You can now ask for either job by name.',
      reward: 'ship in your library',
    },
    button: 'run',
  },
  {
    id: 'bram-loop',
    beat: 1,
    who: 'bram',
    title: 'Three ingots for the mail horse',
    story: 'Will you press Run all day? I’ve taken the samples. My forge needs a load of three.',
    task: 'The clock looks for the exact name onTick. Move the two highlighted calls into this block at the bottom, then press Deploy once.',
    callsToMove: [{ name: 'smelt' }, { name: 'ship' }],
    example: clockBlock,
    idea: {
      name: 'The factory clock',
      explain: 'The word export lets the clock call onTick every tick, so you never call it yourself.',
    },
    hints: [
      'Let the clock repeat both jobs you already wrote.',
      'Call smelt and ship inside the exported onTick function.',
      clockBlock,
    ],
    checks: [{ id: 'bram-loop', text: "Ingots in Bram's cart: 3 / 3" }],
    solved: {
      reaction: 'Three ingots! I can shoe the mail horse now.',
      did: 'You automated your first job.',
      idea: 'The clock repeats the work you taught the arm.',
      reward: '+64 coins',
    },
    button: 'deploy',
  },
  {
    id: 'harrow-tab',
    beat: 2,
    who: 'harrow',
    title: 'Keep the shed open',
    story: 'Your uncle kept this little book under my counter. The shed is yours whenever the tab is paid.',
    task: `Open Inbox and read “Your uncle’s tab”.
Choose Pay later to keep Bram’s coins for a press.`,
    idea: { name: 'A family tab', explain: 'You can keep building while the balance waits.' },
    hints: ['The press will pay for itself.', 'Open the letter in the Inbox.', 'Pay later'],
    checks: [{ id: 'harrow-tab', text: 'Mrs Harrow has heard from you' }],
    solved: {
      reaction: 'I’ll keep your place in the book.',
      did: 'Mrs Harrow pencilled in your reply.',
      idea: 'Bram offers 12 coins for three more ingots. Your cart can fill his order when Orders opens.',
      reward: 'The press is for sale',
    },
    button: 'deploy',
  },
  {
    id: 'elsie-press',
    beat: 3,
    who: 'elsie',
    title: 'A press for the bread oven',
    story: 'My last loaf fell through the grate. Bram will sell you his press for 28 coins.',
    task: `Add “, buy” after put in Uncle’s import. On the next line, write buy("press") and press Deploy.
This buys the press once for 28 coins. Deploying again won’t spend more coins.`,
    idea: { name: 'When you deploy', explain: 'Lines outside your functions run once before the clock starts.' },
    hints: [
      'Place the order when the program starts.',
      'Add buy to the import and order a press at the top.',
      `import { take, put, buy } from "inherit"
buy("press")`,
    ],
    checks: [{ id: 'elsie-press', text: 'The press stands beside the furnace' }],
    solved: {
      reaction: 'There’s my press! Now for that grate.',
      did: 'You bought the press for Elsie’s grate.',
      idea: 'One purchase set up the floor for many ticks.',
      reward: 'Press installed',
    },
    button: 'deploy',
  },
  {
    id: 'elsie-stamp',
    beat: 3,
    who: 'elsie',
    title: 'Stamp the first plate',
    story: 'That die can flatten an ingot to the width of my grate.',
    task: `Rename ship to stamp and change its drop from "cart" to "press".
Change its name in the clock too.`,
    idea: {
      name: 'Practice',
      explain: 'The same pickup can feed a different machine.',
    },
    hints: [
      'Follow an ingot out of the hearth.',
      'Use the furnace as the source and the press as the destination.',
      `function stamp() {
  take("furnace")
  put("press")
}

stamp()`,
    ],
    checks: [{ id: 'elsie-stamp', text: 'An ingot reaches the press' }],
    solved: {
      reaction: 'Look at that ingot flatten.',
      did: 'You fed an ingot between the dies.',
      idea: 'Your old route now makes a different product.',
      reward: 'A working press',
    },
    button: 'deploy',
  },
  {
    id: 'elsie-load',
    beat: 3,
    who: 'elsie',
    title: 'Try the first plate',
    story: 'There’s a corner of my grate to test. Send that plate down and I’ll see if it fits.',
    task: `Extend stamp with a collection after the ingot delivery.
Bring Elsie her first plate from the press.`,
    idea: { name: 'Practice', explain: 'A finished plate waits at the press until the arm collects it.' },
    hints: [
      'Drop off the ingot before collecting a plate.',
      'Take from press and put into cart at the end of stamp.',
      `take("press")
put("cart")`,
    ],
    checks: [{ id: 'elsie-load', text: 'The first plate arrives at the bakery' }],
    solved: {
      reaction: 'A perfect fit for my oven.',
      did: 'Elsie tried your sample against the oven.',
      idea: 'You collected the finished plate where the die opened.',
      reward: 'A sample plate for Elsie',
    },
    button: 'deploy',
  },
  {
    id: 'elsie-grate',
    beat: 3,
    who: 'elsie',
    title: 'Deliver four plates',
    story: 'The press is thumping. I have four gaps to cover before I put the loaves in.',
    task: `Lift the last two lines from stamp into a shipping function for plates.
Have the clock call it after stamp to fill my order.`,
    idea: { name: 'Practice', explain: 'One clock can run several small jobs in order.' },
    hints: [
      'Collect the finished plates where the die opens.',
      'Write ship for the press and cart, and call it after stamp.',
      `function ship() {
  take("press")
  put("cart")
}

ship()`,
    ],
    checks: [{ id: 'elsie-grate', text: 'Four plates reach Elsie’s bakery' }],
    solved: {
      reaction: 'Fresh bread for the street again!',
      did: 'The loaves sit on a sound grate.',
      idea: 'You changed what ships while keeping the same smelt function.',
      reward: '125 coins',
    },
    button: 'deploy',
  },
  {
    id: 'vein-sample',
    beat: 4,
    who: 'bram',
    title: 'Read the stray rock’s tag',
    story: 'Elsie found a copper streak in her grate. I think the mine has struck a second vein.',
    task: `In smelt, give the pickup result a name and print it before the drop.
Watch the hand and Console for copper.`,
    idea: {
      name: 'Variable',
      explain: 'A variable gives a result a name so you can use it on the next line.',
    },
    hints: [
      'Read the name while the arm holds the sample.',
      'Keep the result of take in rock and print rock inside smelt.',
      `const rock = take("mine")
console.log(rock)`,
    ],
    checks: [{ id: 'vein-sample', text: 'A copper rock is identified at the mine' }],
    solved: {
      reaction: 'There’s the copper that spoiled the iron.',
      did: 'You found copper in the iron supply.',
      idea: 'The name rock held the result of this particular pickup.',
      reward: 'Copper identified',
    },
    button: 'deploy',
  },
  {
    id: 'vein-furnace',
    beat: 4,
    who: 'bram',
    title: 'A hearth just for copper',
    story: 'Two metals in one hearth have stopped the iron run. I have another furnace for 24 coins.',
    task: `Keep the iron furnace where it is.
Order a second furnace named copper beside the press.`,
    idea: {
      name: 'A machine name',
      explain: 'A second name on a purchase gives the new machine its own label.',
    },
    hints: [
      'Give each metal its own destination.',
      'Buy a furnace beside the first one and name it copper.',
      'buy("furnace", "copper")',
    ],
    checks: [{ id: 'vein-furnace', text: 'A second furnace bears the copper label' }],
    solved: {
      reaction: 'Two hearths, one for each metal.',
      did: 'You set a separate hearth on the floor.',
      idea: 'Two machines of the same kind can have different names.',
      reward: 'A dedicated copper hearth',
    },
    button: 'deploy',
  },
  {
    id: 'vein-clear',
    beat: 4,
    who: 'bram',
    title: 'Free the iron hearth',
    story: 'There’s the copper that jammed the iron door. The new hearth can take it.',
    task: `After buying the copper furnace, lift the stray from the iron furnace.
Put it in copper before the clock starts.`,
    idea: { name: 'Practice', explain: 'Setup lines can clear a blocked machine before the clock starts.' },
    hints: [
      'Rescue the loose rock before feeding fresh ore.',
      'After the copper purchase, take from furnace and put into copper.',
      `take("furnace")
put("copper")`,
    ],
    checks: [{ id: 'vein-clear', text: 'The iron hearth is clear and the stray copper is saved' }],
    solved: {
      reaction: 'The iron door swings free again.',
      did: 'You freed the door and saved the copper.',
      idea: 'Your setup moved the stray before the next clock tick.',
      reward: 'A recovered copper rock',
    },
    button: 'deploy',
  },
  {
    id: 'vein-sort',
    beat: 4,
    who: 'bram',
    title: 'Keep copper out of the iron',
    story: 'See those two hearths? One bad delivery is enough to block the iron again.',
    task: `Keep the named pickup in smelt. Replace its print and drop with a choice.
Send copper to its own hearth and ordinary rock to the iron furnace.`,
    idea: {
      name: 'A choice',
      explain: 'An if checks whether two names match, and else takes the other path.',
    },
    hints: [
      'Decide while the rock is still in the hand.',
      'Compare rock to the copper ore tag, then choose copper or furnace.',
      `if (rock === "copper-ore") put("copper")
else put("furnace")`,
    ],
    checks: [
      { id: 'iron', text: 'Iron rock reaches the iron furnace' },
      { id: 'copper', text: 'A fresh copper rock reaches its own hearth' },
    ],
    solved: {
      reaction: 'Copper in one hearth, iron in the other!',
      did: 'Your copper went to a hearth of its own.',
      idea: 'The tag on the rock chose the route.',
      reward: 'Two sorted metal streams',
    },
    button: 'deploy',
  },
  {
    id: 'tomas-cutter',
    beat: 5,
    who: 'tomas',
    title: 'Bring a cutter to Lamp Street',
    story: 'My ladder is ready. I still need a way to draw wire for the lamps.',
    task: `Buy a cutter beside the hearths.
Add this purchase below your other buy lines and find "cutter" on the floor.`,
    idea: { name: 'Practice', explain: 'A purchase at the top of your program prepares the floor.' },
    hints: ['Order the tool once.', 'Use buy with the machine kind cutter.', 'buy("cutter")'],
    checks: [{ id: 'tomas-cutter', text: 'A cutter stands on the shed floor' }],
    solved: {
      reaction: 'That cutter will draw fine wire.',
      did: 'You set out Tomas’s wire cutter.',
      idea: 'You reused the same purchase pattern.',
      reward: 'A wire cutter',
    },
    button: 'deploy',
  },
  {
    id: 'tomas-draw',
    beat: 5,
    who: 'tomas',
    title: 'Draw the lamp wire',
    story: 'A copper ingot through those jaws makes a coil long enough for one lamp.',
    task: `At the end of stamp, add a pickup at "copper" and a drop at "cutter".
Keep plates moving and supply the cutter with copper ingots.`,
    idea: { name: 'Practice', explain: 'After putting an item down, the arm can pick up another in the same tick.' },
    hints: [
      'Start at the copper hearth.',
      'Move a finished copper ingot from copper to cutter.',
      `take("copper")
put("cutter")`,
    ],
    checks: [{ id: 'tomas-draw', text: 'A copper ingot reaches Tomas’s cutter' }],
    solved: {
      reaction: 'I see the coil taking shape.',
      did: 'The cutter drew its first copper feed.',
      idea: 'The arm put down the iron ingot before picking up the copper ingot.',
      reward: 'A coil in the making',
    },
    button: 'deploy',
  },
  {
    id: 'tomas-collect',
    beat: 5,
    who: 'tomas',
    title: 'Collect the first coil',
    story: 'That coil is long enough for a whole lamp. Can you bring it down to my ladder?',
    task: `Keep shipping plates. Extend ship so the cart also collects wire.
Deliver one coil from the cutter.`,
    idea: { name: 'Practice', explain: 'A shipping route can collect more than one finished product.' },
    hints: [
      'Bring the second finished product to the same cart.',
      'Inside ship, take from cutter and put into cart.',
      `take("cutter")
put("cart")`,
    ],
    checks: [{ id: 'tomas-collect', text: 'The first coil reaches Tomas’s ladder' }],
    solved: {
      reaction: 'That will reach the first lamp.',
      did: 'Tomas hung the first length of wire.',
      idea: 'Your cart carried plates and wire one at a time.',
      reward: 'Tomas’s first coil',
    },
    button: 'deploy',
  },
  {
    id: 'tomas-lamps',
    beat: 5,
    who: 'tomas',
    title: 'Light five lamps',
    story:
      'Elsie calls for stamping and a coil comes out too. Can I ask for just the wire? Five coils will light the street.',
    task: `Move the last two lines, from "copper" to "cutter", out of stamp and name it cutWire.
Call it between stamp and ship, then send five coils down the street.`,
    idea: { name: 'Practice', explain: 'The clock can call each named function separately.' },
    hints: [
      'Keep the wire pickup and drop together.',
      'Move the copper and cutter lines into cutWire, then call it.',
      `function cutWire() {
  take("copper")
  put("cutter")
}

cutWire()`,
    ],
    checks: [{ id: 'tomas-lamps', text: 'Five coils reach Lamp Street' }],
    solved: {
      reaction: 'Look down the street. Five lights!',
      did: 'Tomas lit the street from end to end.',
      idea: 'The two jobs can now be called separately.',
      reward: '125 coins',
    },
    button: 'deploy',
  },
  {
    id: 'heat-inspect',
    beat: 6,
    who: 'bram',
    title: 'Read the cold hearth',
    story: 'The iron has gone dark. Is the hearth waiting for fuel, or has something failed?',
    task: `Add look to Uncle’s import. At the start of smelt, read the iron furnace’s status.
Print the status so we can see what stopped it.`,
    idea: {
      name: 'A property',
      explain: 'The status property on a look result tells you what is happening at that place.',
    },
    hints: [
      'Read the furnace before trying to restart it.',
      'Use look on furnace and print its status at the start of smelt.',
      `import { take, put, buy, look } from "inherit"

const status = look("furnace").status
console.log(status)`,
    ],
    checks: [{ id: 'heat-inspect', text: 'The iron hearth reports a broken contact' }],
    solved: {
      reaction: 'A broken contact! That explains the cold hearth.',
      did: 'The furnace reported a broken contact.',
      idea: 'You read one property from its inspection.',
      reward: 'The broken contact located',
    },
    button: 'deploy',
  },
  {
    id: 'heat-restart',
    beat: 6,
    who: 'bram',
    title: 'Restart the cold hearth',
    story: 'The iron has gone dark. There’s a loose contact on that old furnace.',
    task: `Add repair to Uncle’s import. Replace the two inspection lines with a check for a broken furnace.
Restart it when it stops.`,
    idea: {
      name: 'Practice',
      explain: 'A status check lets the arm make a repair only when the furnace needs one.',
    },
    hints: [
      'Listen to the hearth before trying to feed it.',
      'Check furnace with look and use repair when its status is broken.',
      `import { take, put, buy, look, repair } from "inherit"

if (look("furnace").status === "broken") repair("furnace")`,
    ],
    checks: [{ id: 'heat-restart', text: 'The iron furnace fires again' }],
    solved: {
      reaction: 'I can warm my hands here again.',
      did: 'You brought the iron hearth back to life.',
      idea: 'You used the machine’s status to choose a repair.',
      reward: 'Iron flowing again',
    },
    button: 'deploy',
  },
  {
    id: 'heat-rounds',
    beat: 6,
    who: 'bram',
    title: 'Make the rounds',
    story: 'Now the copper contact has gone too. I can’t stand at both hearths.',
    task: `Replace the single repair check with a round of both furnaces.
Use the same check at each stop.`,
    idea: {
      name: 'Loop over a list',
      explain:
        'The loop sets oven to each furnace name in turn. The words as const keep those names exact.',
    },
    hints: [
      'Visit both doors with the same inspection.',
      'List furnace and copper, then inspect and repair the current oven.',
      `for (const oven of ["furnace", "copper"] as const) {
  if (look(oven).status === "broken") repair(oven)
}`,
    ],
    checks: [{ id: 'heat-rounds', text: 'Both hearths are inspected and the copper fire restarts' }],
    solved: {
      reaction: 'There’s a glow in both hearths.',
      did: 'Both hearths came back on your rounds.',
      idea: 'One repair check now serves both furnaces.',
      reward: 'Two working hearths',
    },
    button: 'deploy',
  },
  {
    id: 'heat-crew',
    beat: 6,
    who: 'bram',
    title: 'Give repairs a place on the clock',
    story: 'Before Wen borrows the arm for the mill, put the furnace rounds first on the job sheet.',
    task: `Lift the inspection loop out of smelt and name it fixBroken.
Call it first in the clock, before any rock moves.`,
    idea: { name: 'Practice', explain: 'A named maintenance round can run before the arm starts moving ore.' },
    hints: [
      'Keep the whole round together and leave smelting to smelt.',
      'Move the loop into fixBroken and call it at the start of onTick.',
      `function fixBroken() {
  for (const oven of ["furnace", "copper"] as const) {
    if (look(oven).status === "broken") repair(oven)
  }
}

fixBroken()`,
    ],
    checks: [{ id: 'heat-crew', text: 'The repair round visits both furnace doors' }],
    solved: {
      reaction: 'Good. The arm checks before it feeds the fires.',
      did: 'Both hearths got their own inspection round.',
      idea: 'The clock checks the floor before starting production.',
      reward: 'fixBroken in your library',
    },
    button: 'deploy',
  },
  {
    id: 'wen-move',
    beat: 7,
    who: 'wen',
    title: 'Move between two places',
    story:
      'My mill wheel needs teeth. Your arm keeps picking up and putting down. Can we use those two moves for my mill too?',
    task: `Write one move function with a pickup and a destination.
Replace the first take and put in stamp with a call from "furnace" to "press".`,
    idea: {
      name: 'Parameters',
      explain: 'Parameters name the two places supplied by the caller, and Place means a label on the floor.',
    },
    hints: [
      'Replace repeated moves with one function that takes two labels.',
      'Define move, then replace the first take and put in stamp with one call.',
      `function move(from: Place, to: Place) {
  take(from)
  put(to)
}

move("furnace", "press")`,
    ],
    checks: [{ id: 'wen-move', text: 'The named move carries an ingot to the press' }],
    solved: {
      reaction: 'Those same two moves will serve my mill.',
      did: 'Your move brought an ingot to the press.',
      idea: 'You chose the pickup and drop when you called move.',
      reward: 'move in your library',
    },
    button: 'deploy',
  },
  {
    id: 'wen-cutter',
    beat: 7,
    who: 'wen',
    title: 'Set out the gear cutter',
    story:
      'My wheel has gaps where its teeth should be. Leave the fine wire jaws for Tomas and buy a second cutter.',
    task: `Buy a second cutter named gears.
Find its label beside Tomas’s cutter.`,
    idea: { name: 'Practice', explain: 'A new machine name gives the arm another place to visit.' },
    hints: [
      'Keep the wire cutter in service.',
      'Buy a cutter with the name gears.',
      'buy("cutter", "gears")',
    ],
    checks: [{ id: 'wen-cutter', text: 'A second cutter bears the gears label' }],
    solved: {
      reaction: 'My cutter is ready for its first plate.',
      did: 'You set out a cutter for Wen’s gears.',
      idea: 'Two named cutters can do different jobs.',
      reward: 'A gear cutter',
    },
    button: 'deploy',
  },
  {
    id: 'wen-gears',
    beat: 7,
    who: 'wen',
    title: 'Cut the mill teeth',
    story: 'The wire jaws are too fine. A second cutter can bite gear teeth if you feed it two plates.',
    task: `In ship, replace the pickup at "press" and drop at "cart" with one move from "press" to "gears".
Watch a pair of plates turn into a gear.`,
    idea: {
      name: 'Practice',
      explain: 'Changing the destination of a move changes what the next machine makes.',
    },
    hints: ['Leave Tomas’s cutter in place.', 'Move plates from press to gears.', 'move("press", "gears")'],
    checks: [{ id: 'wen-gears', text: 'Two plates turn into a gear for the mill' }],
    solved: {
      reaction: 'That tooth will fit the mill wheel.',
      did: 'You cut teeth into a pair of plates.',
      idea: 'The new destination gave those plates a different job.',
      reward: 'The first wheel tooth',
    },
    button: 'deploy',
  },
  {
    id: 'wen-wheel',
    beat: 7,
    who: 'wen',
    title: 'Send three gears to the mill',
    story: 'Three gaps left on the wheel. I’ve marked them with chalk.',
    task: `Keep making gears. Extend ship to collect them for Wen.
Watch the mill wheel turn after the third delivery.`,
    idea: {
      name: 'Practice',
      explain: 'The same move can collect a finished part from any labelled machine.',
    },
    hints: [
      'Follow the gear that just came out.',
      'Use move from gears to cart at the end of ship.',
      'move("gears", "cart")',
    ],
    checks: [{ id: 'wen-wheel', text: 'Three gears reach Wen’s water wheel' }],
    solved: {
      reaction: 'Listen! The millstones are turning.',
      did: 'Wen’s mill is turning again.',
      idea: 'You reused move to load the gears.',
      reward: '205 coins',
    },
    button: 'deploy',
  },
  {
    id: 'orders-share',
    beat: 8,
    who: 'elsie',
    title: 'One press, two regulars',
    story: 'Wen wants another three gears and I need four plates. Whose parcel is still missing?',
    task: `In ship, replace the move from "press" to "gears" with a check of the cart’s wanted list.
Send plates to me while I need them, then send the rest to Wen’s cutter.`,
    idea: {
      name: 'Check what the cart needs',
      explain:
        'The wanted list names the outstanding goods, and includes tells you whether a particular item is on it.',
    },
    hints: [
      'Ask the cart before choosing where the plate goes.',
      'Read wanted at cart and choose between cart and gears.',
      `const wanted = look("cart").wanted
if (wanted.includes("plate")) move("press", "cart")
else move("press", "gears")`,
    ],
    checks: [{ id: 'orders-share', text: 'Elsie receives four plates and Wen receives three gears' }],
    solved: {
      reaction: 'Wen got his gears and I got my plates.',
      did: 'Both regulars signed for their parcels.',
      idea: 'Your press followed the cart’s changing list.',
      reward: '48 coins in orders',
    },
    button: 'deploy',
  },
  {
    id: 'mayor-tools',
    beat: 9,
    who: 'odile',
    title: 'Pack the bridge toolbox',
    story: 'The bridge crew will need your functions too. Let’s give them a toolbox they can carry.',
    task: `In Project files, create tools.ts. Move your helper functions there with a copy of Uncle’s import. Export the names the clock uses.
In main.ts import those names from ./tools. Leave the purchases and clock there.`,
    idea: {
      name: 'Modules',
      explain: 'Export shares names from one file and import brings those names into another.',
    },
    hints: [
      'Keep the clock in the shed and put its helpers together.',
      'Copy the workshop import into tools.ts with your helpers, export their names, then import them in main.ts.',
      `import { take, put, buy, look, repair } from "inherit"
export { fixBroken, smelt, stamp, cutWire, ship }

import { fixBroken, smelt, stamp, cutWire, ship } from "./tools"`,
    ],
    checks: [{ id: 'mayor-tools', text: 'A function in tools.ts delivers an item' }],
    solved: {
      reaction: 'We can carry that toolbox down to the bridge.',
      did: 'The clock called your functions from tools.ts.',
      idea: 'Your code can now share names between files.',
      reward: 'A toolbox for the bridge crew',
    },
    button: 'deploy',
  },
  {
    id: 'bridge-jig',
    beat: 9,
    who: 'odile',
    title: 'Set the bridge jig',
    story: 'The stones are in place. Each joint needs a bracket made from a plate and a coil.',
    task: `Buy an assembler in main.ts.
Leave the other purchases and the clock in place.`,
    idea: {
      name: 'Practice',
      explain: 'Your workshop setup can grow while the toolbox stays in its own file.',
    },
    hints: ['Put the new machine with the other orders.', 'Use buy for the assembler.', 'buy("assembler")'],
    checks: [{ id: 'bridge-jig', text: 'The bridge assembler stands on the floor' }],
    solved: {
      reaction: 'The crew has somewhere to fit the pieces.',
      did: 'The bridge crew has its assembly jig.',
      idea: 'Top-level setup still belongs beside the clock.',
      reward: 'An assembly jig',
    },
    button: 'deploy',
  },
  {
    id: 'bridge-fit',
    beat: 9,
    who: 'odile',
    title: 'Fit a plate to a coil',
    story: 'A plate for strength and wire to bind it. The jig has room for both.',
    task: `At the start of ship in tools.ts, read the assembler’s inputs.
Supply a plate and a wire when each is missing, before shipping the extras.`,
    idea: { name: 'Practice', explain: 'The inside list tells you which ingredients are already waiting.' },
    hints: [
      'Check the jig before collecting extra goods for the cart.',
      'Read inside, then supply missing plates from press and wire from cutter.',
      `const inside = look("assembler").inside
if (!inside.includes("plate")) move("press", "assembler")
if (!inside.includes("wire")) move("cutter", "assembler")`,
    ],
    checks: [{ id: 'bridge-fit', text: 'The jig fits a plate and wire into a bracket' }],
    solved: {
      reaction: 'A sound joint. That bracket will hold.',
      did: 'The crew held up its first bracket.',
      idea: 'Your toolbox read both missing ingredients from the jig.',
      reward: 'The first bridge bracket',
    },
    button: 'deploy',
  },
  {
    id: 'bridge-span',
    beat: 9,
    who: 'odile',
    title: 'Fasten the sixth joint',
    story: 'Six joints from this bank to Riverside. I’ll bolt each one as your cart comes in.',
    task: `Add one collection to ship in tools.ts.
Send six finished brackets across to the bridge crew.`,
    idea: {
      name: 'Practice',
      explain: 'One more collection can serve a new request without rebuilding the line.',
    },
    hints: [
      'Collect the part after the jig finishes.',
      'Move from assembler to cart at the end of ship.',
      'move("assembler", "cart")',
    ],
    checks: [{ id: 'bridge-span', text: 'Six brackets hold the bridge to Riverside' }],
    solved: {
      reaction: 'We can walk all the way to Riverside!',
      did: 'The bridge stands and Riverside is open.',
      idea: 'You grew the same program from one rock to a whole supply line.',
      reward: '210 coins',
    },
    button: 'deploy',
  },
  {
    id: 'harrow-deed',
    beat: 10,
    who: 'harrow',
    title: 'Take the deed',
    story: 'I can see the new bridge from my counter. There’s just the last line in my book.',
    task: `Click Debt beside your coins and pay the remaining balance.
Pick up the deed to Uncle’s shed.`,
    idea: { name: 'Practice', explain: 'Coins from fulfilled requests and orders settle the family tab.' },
    hints: ['Use the earnings from the bridge.', 'Choose Pay balance at the bank.', 'Pay balance'],
    checks: [{ id: 'harrow-deed', text: 'The bridge stands and the family tab is paid' }],
    solved: {
      reaction: 'Here are your keys. Welcome home.',
      did: 'The shed is yours.',
      idea: 'The town paid for the work your program delivered.',
      reward: 'The deed to the shed',
    },
    button: 'deploy',
  },
]
