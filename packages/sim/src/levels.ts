import type { Kind, Layout, Level, Station } from './types'

const station = (id: string, kind: Kind, x: number, y: number): Station => ({ id, kind, x, y })
const link = (from: string, to: string) => ({ from, to })
const single: Layout = {
  stations: [
    station('mine', 'mine', 1, 2),
    station('furnace-a', 'furnace', 4, 1),
    station('dock', 'dispatch', 7, 2),
  ],
  links: [link('mine', 'furnace-a'), link('furnace-a', 'dock')],
}
const code = (body: string) => `import type { Factory } from "inherit"

export function onTick(ctx: Factory) {
${body}
}`
const smelt = '  ctx.work("furnace-a")'
export const levels: Level[] = [
  {
    title: 'The shed',
    note: '“The mine still knows its job. That old furnace needs telling, every single tick.”',
    customer: 'Hale Hardware',
    order: 10,
    product: 'ingot',
    dockInterval: 1,
    brief:
      'Ten iron ingots are due at Hale Hardware. Click the furnace to see what’s waiting inside, then give it a job and press Run.',
    concept: 'An event handler answers each tick, like a web server handling each request.',
    layout: single,
    additions: [],
    starter: code(
      '  // The extractor is already wired up.\n  ctx.dig("mine")\n\n  // TODO: fire up the furnace.\n  // Machine ID: "furnace-a"',
    ),
    hints: [
      'Click furnace-a. “Awaiting work” means ore has arrived and the furnace is waiting for instructions.',
      'Inside onTick, call ctx.work with the furnace ID. Press Run to try your change.',
      smelt.trim(),
    ],
  },
  {
    title: 'Second furnace',
    note: '“Watch the ore bins. The new burner can finish a whole ingot while the old one is still warming up.”',
    customer: 'West End Rail',
    order: 48,
    product: 'ingot',
    minRate: 185,
    maxIdle: 50,
    dockInterval: 1,
    brief:
      'Wire the splitter to furnace-b. It smelts in one tick to furnace-a’s four. Keep both busy and load at least 185 ingots per minute.',
    concept:
      'Load balancing sends work to the shorter queue, like a dispatcher choosing a worker for the next job.',
    layout: {
      stations: [
        station('mine', 'mine', 1, 2),
        station('splitter', 'splitter', 3, 2),
        station('furnace-a', 'furnace', 5, 0),
        { ...station('furnace-b', 'furnace', 5, 3), smeltTicks: 1 },
        station('dock', 'dispatch', 7, 2),
      ],
      links: [
        link('mine', 'splitter'),
        link('splitter', 'furnace-a'),
        link('furnace-a', 'dock'),
        link('furnace-b', 'dock'),
      ],
    },
    additions: [],
    starter: code(
      '  ctx.dig("mine")\n  // TODO: share ore with the second furnace.\n  ctx.route("splitter", "furnace-a")\n' +
        smelt +
        '\n  ctx.work("furnace-b")',
    ),
    hints: [
      'Connect the right port of splitter to the left port of furnace-b.',
      'Try taking turns. If ore backs up at furnace-a, compare the two input bins with ctx.stock. Give a tie to furnace-a to keep it lit.',
      'ctx.route("splitter", ctx.stock("furnace-a") <= ctx.stock("furnace-b") ? "furnace-a" : "furnace-b")',
    ],
  },
  {
    title: 'Parts department',
    note: '“The press wants one of each. You can’t stamp a part out of iron alone.”',
    buildTiles: [
      [1, 2],
      [2, 2],
      [3, 2],
      [1, 3],
      [2, 3],
      [3, 3],
    ],
    customer: 'Miller Tool Co.',
    order: 10,
    product: 'part',
    dockInterval: 1,
    brief:
      'Miller needs pressed parts. Place a coal mine on a marked tile, belt it to the press, and feed both ingredients.',
    concept: 'A join pairs inputs from two queues, like matching a payment with its order before dispatch.',
    layout: {
      stations: [
        station('mine', 'mine', 1, 0),
        station('furnace-a', 'furnace', 3, 0),
        station('press', 'assembler', 5, 2),
        station('dock', 'dispatch', 7, 2),
      ],
      links: [link('mine', 'furnace-a'), link('furnace-a', 'press'), link('press', 'dock')],
    },
    additions: [station('coal-mine', 'coal', 1, 3)],
    starter: code(
      '  ctx.dig("mine")\n' + smelt + '\n\n  // TODO: supply the press with coal.\n  ctx.work("press")',
    ),
    hints: [
      'Click the press. Even with ingots in its bin, it waits for one coal before it can stamp a part.',
      'Place the coal mine, then drag its output port to the press input.',
      'Add ctx.dig("coal-mine") inside onTick and keep ctx.work("press") running.',
    ],
  },
  {
    title: 'Loading bay',
    note: '“When the loading bay fills up, leave the next chunk in the ground.”',
    customer: 'County Freight',
    order: 7,
    product: 'ingot',
    dockInterval: 12,
    lossless: true,
    brief:
      'The truck takes one ingot every twelve ticks. Ore spills when the line fills. Load seven ingots without a spill.',
    concept:
      'Backpressure slows the producer when the consumer fills up, like a Node stream returning false from write().',
    layout: single,
    additions: [],
    starter: code('  // TODO: the truck cannot keep up.\n  ctx.dig("mine")\n' + smelt),
    hints: [
      'Watch the dock between pickups. Once the ore belt backs up to the mine, the next dig spills.',
      'ctx.space("mine") tells you whether the belt can take one more ore this tick. Skip the dig when it’s full.',
      'if (ctx.space("mine")) ctx.dig("mine")',
    ],
  },
  {
    title: 'First real order',
    note: '“Put a chalk mark by the coal hatch for every sack you take. An empty bin can’t tell you how many went through yesterday.”',
    customer: 'Canal Lock Works',
    order: 12,
    product: 'part',
    dockInterval: 8,
    deadline: 128,
    coalBudget: 12,
    lossless: true,
    brief:
      'The lock crew needs 12 gate parts by tick 128. Each furnace takes ten ticks. The truck collects one part every eight ticks. You may draw twelve sacks of coal. Every load must reach a belt.',
    concept:
      'State carries a value between events, like a service tracking how much of a quota it has spent.',
    layout: {
      stations: [
        station('mine', 'mine', 0, 1),
        station('splitter', 'splitter', 2, 1),
        { ...station('furnace-a', 'furnace', 4, 0), smeltTicks: 10 },
        { ...station('furnace-b', 'furnace', 4, 2), smeltTicks: 10 },
        station('coal-mine', 'coal', 5, 3),
        station('press', 'assembler', 6, 1),
        station('dock', 'dispatch', 8, 1),
      ],
      links: [
        link('mine', 'splitter'),
        link('splitter', 'furnace-a'),
        link('splitter', 'furnace-b'),
        link('furnace-a', 'press'),
        link('furnace-b', 'press'),
        link('coal-mine', 'press'),
        link('press', 'dock'),
      ],
    },
    additions: [],
    starter: code(`  if (ctx.space("mine")) ctx.dig("mine")
  const a = ctx.stock("furnace-a")
  const b = ctx.stock("furnace-b")
  ctx.route("splitter", a <= b ? "furnace-a" : "furnace-b")
  ctx.work("furnace-a")
  ctx.work("furnace-b")

  // TODO: remember how many coal sacks you have drawn.
  // TODO: close the hatch after sack twelve.
  if (ctx.space("coal-mine")) ctx.dig("coal-mine")
  ctx.work("press")`),
    hints: [
      'Watch the coal tally when the press empties its bin. The crew pays for every sack you draw, including the ones still on the belt.',
      'Put let sacks = 0 above onTick so the next tick remembers the last tally. Count a sack only when ctx.dig returns true.',
      'Keep let sacks = 0 above onTick. Replace the coal line with if (sacks < 12 && ctx.space("coal-mine") && ctx.dig("coal-mine")) sacks++',
    ],
  },
]
