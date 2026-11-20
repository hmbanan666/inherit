import type { Kind, Layout, Level, Station } from './types'

const station = (id: string, kind: Kind, x: number, y: number): Station => ({ id, kind, x, y })
const link = (from: string, to: string) => ({ from, to })
const single: Layout = {
  stations: [station('mine', 'mine', 1, 2), station('furnace-a', 'furnace', 4, 1), station('dock', 'dispatch', 7, 2)],
  links: [link('mine', 'furnace-a'), link('furnace-a', 'dock')],
}
const code = (body: string) => `import type { Factory } from "inherit"

export function onTick(ctx: Factory) {
${body}
}`
const smelt = '  ctx.work("furnace-a")'
export const levels: Level[] = [
  {
    title: 'The shed', customer: 'Hale Hardware', order: 10, product: 'ingot', dockInterval: 1,
    brief: 'Hale needs ten iron ingots. The extractor still runs, but the furnace is waiting for your signal.',
    concept: 'A handler runs your instructions once per tick.',
    layout: single, additions: [],
    starter: code('  // The extractor is already wired up.\n  ctx.dig("mine")\n\n  // TODO: fire up the furnace.\n  // Machine ID: "furnace-a"'),
    hints: ['Follow the ore from the extractor. Where does it stop?', 'Call ctx.work with the furnace ID inside onTick.', smelt.trim()],
  },
  {
    title: 'Second furnace', customer: 'West End Rail', order: 24, product: 'ingot', minRate: 75, maxIdle: 18, dockInterval: 1,
    brief: 'One furnace can’t fill the rail order. Drag a belt from the splitter to furnace-b and give both furnaces a share.',
    concept: 'Round-robin routing shares work between consumers.',
    layout: {
      stations: [station('mine', 'mine', 1, 2), station('splitter', 'splitter', 3, 2), station('furnace-a', 'furnace', 5, 0), station('furnace-b', 'furnace', 5, 3), station('dock', 'dispatch', 7, 2)],
      links: [link('mine', 'splitter'), link('splitter', 'furnace-a'), link('furnace-a', 'dock'), link('furnace-b', 'dock')],
    }, additions: [],
    starter: code('  ctx.dig("mine")\n  // TODO: share ore with the second furnace.\n  ctx.route("splitter", "furnace-a")\n' + smelt + '\n  ctx.work("furnace-b")'),
    hints: ['Connect the right port of splitter to the left port of furnace-b.', 'Use odd and even ticks to choose a different destination.', 'ctx.route("splitter", ctx.tick % 2 ? "furnace-a" : "furnace-b")'],
  },
  {
    title: 'Parts department', customer: 'Miller Tool Co.', order: 10, product: 'part', dockInterval: 1,
    brief: 'Miller needs pressed parts. Place a coal mine on an empty tile, belt it to the press, and feed both ingredients.',
    concept: 'A recipe synchronizes two input queues.',
    layout: {
      stations: [station('mine', 'mine', 1, 0), station('furnace-a', 'furnace', 3, 0), station('press', 'assembler', 5, 2), station('dock', 'dispatch', 7, 2)],
      links: [link('mine', 'furnace-a'), link('furnace-a', 'press'), link('press', 'dock')],
    }, additions: [station('coal-mine', 'coal', 1, 3)],
    starter: code('  ctx.dig("mine")\n' + smelt + '\n\n  // TODO: supply the press with coal.\n  ctx.work("press")'),
    hints: ['The press consumes one ingot and one coal per part.', 'Place the coal mine, then drag its output port to the press input.', 'Add ctx.dig("coal-mine") inside onTick.'],
  },
  {
    title: 'Loading bay', customer: 'County Freight', order: 12, product: 'ingot', dockInterval: 12, lossless: true,
    brief: 'The truck takes one ingot every twelve ticks. Ore spills when the line fills. Ship the order without losing any material.',
    concept: 'Backpressure lets a slow consumer set the pace upstream.',
    layout: single, additions: [],
    starter: code('  // TODO: the truck cannot keep up.\n  ctx.dig("mine")\n' + smelt),
    hints: ['Watch the furnace buffer fill while the truck is away.', 'Ask whether the mine has space on its outbound belt before digging.', 'if (ctx.space("mine")) ctx.dig("mine")'],
  },
]
