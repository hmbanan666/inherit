// Local stand-in for the chapter data owned by the sim.
import type { LessonStep } from './types'
export const starter = '// Uncle’s workshop. His arm can take from a place and put into a place.\nimport { take, put } from "inherit"\n\n'
const take = 'take("mine")'
const feed = take + '\nput("furnace")'
const ship = 'take("furnace")\nput("cart")'
const smeltFn = 'function smelt() {\n  take("mine")\n  put("furnace")\n}'
const shipFn = 'function ship() {\n  take("furnace")\n  put("cart")\n}'
export const helpers = smeltFn + '\n\n' + shipFn
export const beforeStep = ['', take, feed, feed + '\n' + ship, smeltFn + '\nsmelt()\n' + ship, helpers + '\n\nsmelt()\nship()']
const records: Omit<LessonStep, 'beat' | 'who' | 'button' | 'checks'>[] = [
  {
    id: 'bram-take', title: 'Pick up a rock', starter,
    story: 'The mail horse needs new shoes. Your uncle made the iron here. Does his old arm still work?',
    task: 'Lift a rock from the mine. Write one line below Uncle’s import, then press Run to watch the arm.',
    idea: { name: 'Calling the arm', explain: 'Uncle’s import brings in take and put from the workshop, "inherit". Give take a place name in quotes.' },
    hints: ['Ask the arm to pick something up.', 'Use take and the place labelled "mine".', take],
    solved: { did: 'The arm lifted a rock from the mine.', idea: 'You called take with the name of a place.' },
  }, {
    id: 'bram-put', title: 'Feed the furnace',
    story: 'There’s our first rock. The furnace can melt it down for a horseshoe.',
    task: 'Keep your first line. Add a second that puts the rock in the furnace, then Run both.',
    idea: { name: 'Sequence', explain: 'The arm follows your lines from top to bottom. Put uses whatever its hand holds.' },
    hints: ['Pick the rock up before setting it down.', 'Use put and the place labelled "furnace".', 'put("furnace")'],
    solved: { did: 'A rock reached the furnace.', idea: 'Two calls in order carried it from one place to another.' },
  }, {
    id: 'bram-cart', title: 'Bring the first ingot',
    story: 'See that glow? When the iron is ready, bring the ingot to my cart.',
    task: 'After feeding the furnace, lift the finished ingot and leave it in the cart.',
    idea: { name: 'Waiting for iron', explain: 'An empty furnace has nothing to give. If the arm comes back empty, Run again.' },
    hints: ['Give the iron a chance to melt.', 'Take from "furnace", then put into "cart".', ship],
    solved: { did: 'The first ingot reached Bram’s cart.', idea: 'You collected the iron after the furnace had something ready.' },
  }, {
    id: 'bram-smelt', title: 'Give smelting a name',
    story: 'Your uncle called that first pair of moves smelting. Can you give the arm one word for the pair?',
    task: 'Wrap your first two lines in a function called smelt. Call it before carrying the ingot to the cart.',
    idea: { name: 'A function', explain: 'A function names steps you wrote. Its steps run when you call its name with parentheses.' },
    hints: ['Put the steps inside curly braces.', 'smelt takes from "mine" and puts into "furnace".', smeltFn + '\nsmelt()'],
    solved: { did: 'The arm fed the furnace when you called smelt().', idea: 'You gave two steps one name.' },
  }, {
    id: 'bram-ship', title: 'Name the cart run',
    story: 'That’s the furnace sorted. I could use a name for the trip to the cart, too.',
    task: 'Give the trip from furnace to cart the name ship. Try both of your functions.',
    hints: ['Reuse the way you named the first job.', 'ship carries the finished ingot from "furnace" to "cart".', shipFn + '\nship()'],
    solved: { did: 'Your ship() carried an ingot to the cart.', idea: 'You can now ask for either job by name.' },
  }, {
    id: 'bram-loop', title: 'Let the clock take over',
    story: 'Will you press Run all day? Your uncle let the shed clock do that part.',
    task: 'Move the calls to smelt() and ship() inside onTick(). Press Deploy to let the clock fill my cart.',
    idea: { name: 'The factory clock', explain: 'The clock calls onTick() every tick. The word export lets the clock see it.' },
    hints: ['Keep the two functions you wrote.', 'Put both calls inside the function the clock can see.', 'export function onTick() {\n  smelt()\n  ship()\n}'],
    solved: { did: 'You automated your first job.', idea: 'Your functions filled the cart while the clock ran.', reward: '+64 coins · Bram can shoe the mail horse.' },
  },
]
const checks = ['The arm holds a rock from the mine', 'A rock reaches the furnace', 'First ingot in Bram’s cart', 'Your smelt() feeds the furnace', 'Your ship() brings an ingot to the cart', 'Ingots in Bram’s cart']
export const bram: LessonStep[] = records.map((step, i) => ({
  ...step, who: 'bram', beat: 1, button: i === 5 ? 'deploy' : 'run', checks: [{ id: step.id, text: checks[i]! }],
}))
