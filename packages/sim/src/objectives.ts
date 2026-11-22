import type { MachineKind, MaterialId, RecipeId } from './packs/workshop/campaign-api'
import { activeCard } from './objective-highlights'
import type { Campaign, ObjectiveRun } from './packs/workshop/model'
import { questStatus, QUESTS, restartQuest } from './quests'

export interface Objective {
  id: string
  title: string
  why: string
  /** First line is an instruction. Remaining lines form one optional TypeScript example. */
  hints: string[]
  progressUnit: string
  highlight:
    | {
        type: 'machine'
        kind: MachineKind
        id?: string
        deposit?: 'iron' | 'copper' | 'coal'
        recipe?: RecipeId
      }
    | { type: 'shop'; item: MachineKind | 'road' | 'belt'; siteId?: string }
    | { type: 'plot'; siteId: string; id: string }
    | { type: 'tile'; siteId: string; x: number; y: number; tool?: MachineKind }
    | { type: 'research'; id: string }
    | { type: 'button'; id: 'editor' | 'deploy' | 'files' | 'memory' | 'inbox' }
  reward: { money: number; researchPoints: number }
  story?: string
}
type Measure = (c: Campaign) => number | boolean
interface Stage extends Objective {
  target: number
  measure: Measure
}
type Highlight = Objective['highlight']
const machine = (kind: MachineKind, id?: string): Highlight => ({ type: 'machine', kind, id })
const shop = (item: MachineKind | 'road' | 'belt', siteId = 'shed'): Highlight => ({
  type: 'shop',
  item,
  siteId,
})
const mine = machine('miner', 'mine')
const dock = machine('dock')
const editor: Highlight = { type: 'button', id: 'editor' }
const files: Highlight = { type: 'button', id: 'files' }
const machines = (c: Campaign, kind: MachineKind) => c.world.machines.filter((m) => m.kind === kind)
const count =
  (kind: MachineKind): Measure =>
  (c) =>
    machines(c, kind).length
const processed =
  (kind: MachineKind): Measure =>
  (c) =>
    machines(c, kind).reduce((sum, m) => sum + m.stats.processed, 0)
const shipped =
  (kind: MaterialId): Measure =>
  (c) =>
    c.world.delivered[kind] ?? 0
function goal(
  id: string,
  title: string,
  highlight: Highlight,
  progressUnit: string,
  measure: Measure,
  hints: string[],
  why: string,
  target = 1,
  story?: string,
): Stage {
  return {
    id,
    title,
    highlight,
    progressUnit,
    measure,
    hints,
    why,
    target,
    story,
    reward: { money: 20, researchPoints: 2 },
  }
}
function learn(id: string, node: string, name: string, why: string, story?: string) {
  return goal(
    id,
    'Unlock ' + name,
    { type: 'research', id: node },
    'unlocks',
    (c) => c.economy.research.includes(node),
    ['Select ' + name + ' in Research.'],
    why,
    1,
    story,
  )
}
function customer(id: string, highlight: Highlight, unit: string, hints: string[], story: string) {
  const q = QUESTS.find((q) => q.id === id)!
  return goal(
    id,
    q.title,
    highlight,
    unit,
    (c) => {
      if (c.progress.completedQuests.includes(id)) return q.quantity
      return c.progress.activeQuest?.id === id ? (questStatus(c)?.current ?? 0) : 0
    },
    hints,
    q.brief,
    q.quantity,
    story,
  )
}
function linked(c: Campaign, from: MachineKind, to: MachineKind) {
  const sources = machines(c, from),
    sinks = machines(c, to)
  return c.world.belts.filter((b) => sources.some((m) => m.id === b.from) && sinks.some((m) => m.id === b.to))
}
type RoutingLesson = ObjectiveRun & { fedFurnaces?: string[] }
function rememberOreArrivals(c: Campaign, run: RoutingLesson) {
  const recipients = new Set(run.fedFurnaces)
  for (const event of c.world.lastEvents) {
    if (
      event.type === 'itemArrived' &&
      event.item.kind === 'iron-ore' &&
      machines(c, 'furnace').some((m) => m.id === event.machineId)
    )
      recipients.add(event.machineId)
  }
  run.fedFurnaces = [...recipients]
}
function motorInput(material: MaterialId): Measure {
  return (c) =>
    (c.world.delivered.motor ?? 0) > 0 ||
    machines(c, 'assembler').some(
      (m) =>
        m.recipe === 'motor' &&
        (m.queue.some((item) => item.kind === material) ||
          c.world.lastEvents.some(
            (e) => e.type === 'itemArrived' && e.machineId === m.id && e.item.kind === material,
          ) ||
          m.remaining > 0 ||
          m.output?.kind === 'motor'),
    )
}
function withoutComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
}
function code(c: Campaign) {
  return withoutComments(Object.values(c.project.deployed).join('\n'))
}
function hasHelper(c: Campaign) {
  const main = withoutComments(c.project.deployed['main.ts'])
  const imports = main.matchAll(/\bimport\s+(?!type\b)[^;'"\n]+\s+from\s*["']\.\/(lib\/[^"']+)["']/g)
  for (const [, path] of imports) {
    if ([path, path + '.ts', path + '/index.ts'].some((key) => c.project.deployed[key]?.trim())) return true
  }
  return false
}
function typedHelper(c: Campaign, annotation: RegExp) {
  return (
    hasHelper(c) &&
    Object.entries(c.project.deployed).some(
      ([path, text]) => path.startsWith('lib/') && annotation.test(withoutComments(text)),
    )
  )
}
const stages: Stage[] = [
  goal(
    'dig',
    'Dig 1 iron rock',
    mine,
    'rocks',
    (c) => c.world.extracted['iron-ore'] ?? 0,
    ['Add this inside onTick and deploy.', 'ctx.dig("mine")'],
    'Uncle left a shovel with a power cord.',
    1,
    'shovel',
  ),
  goal(
    'fire',
    'Make your first iron ingot',
    machine('furnace', 'furnace-a'),
    'ingots',
    processed('furnace'),
    ['Keep digging. Add this inside onTick.', 'ctx.work("furnace-a")'],
    'The furnace is waiting for a job.',
  ),
  goal(
    'ingot',
    'Ship 1 iron ingot',
    dock,
    'ingots',
    shipped('iron-ingot'),
    ['Let the ingot ride the furnace belt to the dock.'],
    'Hale is waiting at the loading door.',
  ),
  customer(
    'shed',
    dock,
    'ingots',
    ['Keep the mine and furnace running until the dock has ten bars.'],
    'hale',
  ),
  goal(
    'belt-space',
    'Check a belt for space',
    mine,
    'belt checks',
    (c) => /\.space\s*\(/.test(code(c)),
    ['Replace the dig line inside onTick.', 'if (ctx.space("mine")) ctx.dig("mine")'],
    'A full belt can leave the next rock on the floor.',
  ),
  customer(
    'loading',
    dock,
    'ingots',
    ['Let the dock collect three more bars. Every pickup counts.'],
    'board',
  ),
  goal(
    'tally',
    'Count a dig with a variable',
    editor,
    'counters',
    (c) => /\blet\s+\w+/.test(code(c)) && /\+\+|\+=\s*1|\+\s*1/.test(code(c)),
    [
      'Put the counter above onTick and the dig inside it.',
      'let rocks = 0',
      'if (ctx.space("mine") && ctx.dig("mine")) rocks++',
    ],
    'One chalk mark for each rock.',
  ),
  goal(
    'chalk',
    'Save a positive count in memory',
    { type: 'button', id: 'memory' },
    'saved numbers',
    (c) => Object.values(c.memory).some((v) => typeof v === 'number' && Number.isSafeInteger(v) && v > 0),
    ['Try this inside onTick.', 'memory.rocks = Number(memory.rocks ?? 0) + 1'],
    'The ledger stays on the desk between shifts.',
  ),
  goal(
    'redeploy',
    'Keep your number through a deploy',
    { type: 'button', id: 'deploy' },
    'deploys',
    (c) => {
      const run = c.progress.objectiveRun
      if (run?.memoryKey === undefined || (c.project.history.at(-1)?.id ?? 0) <= run.revision) return false
      const v = c.memory[run.memoryKey]
      return typeof v === 'number' && v >= run.memoryValue!
    },
    ['Change a comment and press Deploy. Leave your memory entry in place.'],
    'Send the controller back to work with its ledger.',
    1,
    'ledger',
  ),
  learn('survey', 'survey', 'Tape measure', 'The east plot has a copper seam.'),
  goal(
    'plot',
    'Buy the east plot',
    { type: 'plot', siteId: 'shed', id: 'east-lot' },
    'plots',
    (c) =>
      c.world.sites
        .find((s) => s.id === 'shed')
        ?.plots.some((p) => p.id === 'east-lot' && p.status === 'owned') ?? false,
    ['Select the east lot beside the shed and buy it.'],
    'You will use this patch of land for copper.',
  ),
  goal(
    'oven',
    'Place a second furnace',
    shop('furnace'),
    'furnaces',
    count('furnace'),
    ['Pick Furnace in the shop, then an empty shed tile.'],
    'A second burner gives the ore another place to go.',
    2,
  ),
  goal(
    'belt',
    'Connect both furnaces to the dock',
    shop('belt'),
    'connected furnaces',
    (c) => new Set(linked(c, 'furnace', 'dock').map((b) => b.from)).size,
    ['Drag a belt from the new furnace to the dock.'],
    'The old furnace already has its belt.',
    2,
  ),
  learn('gauges', 'bins', 'Bin gauges', 'A gauge shows how much ore is waiting.'),
  learn('fork-license', 'fork', 'Forked belts', 'A splitter sends parcels in two directions.'),
  goal(
    'fork',
    'Place a splitter',
    shop('splitter'),
    'splitters',
    count('splitter'),
    ['Place a splitter between the mine and the furnaces.'],
    'One belt goes in and two can come out.',
  ),
  goal(
    'fork-feed',
    'Connect the mine to the splitter',
    shop('belt'),
    'connections',
    (c) =>
      linked(c, 'miner', 'splitter').some(
        (b) => c.world.machines.find((m) => m.id === b.from)?.deposit === 'iron',
      ),
    ['Remove the old mine-to-furnace belt. Drag a belt from the mine to the splitter.'],
    'Ore now has a fork in the road.',
  ),
  goal(
    'fork-belts',
    'Connect the splitter to both furnaces',
    machine('splitter'),
    'connected furnaces',
    (c) =>
      Math.max(
        0,
        ...machines(c, 'splitter').map(
          (m) => linked(c, 'splitter', 'furnace').filter((b) => b.from === m.id).length,
        ),
      ),
    ['Drag one belt from the splitter to each furnace.'],
    'Each exit feeds one burner.',
    2,
  ),
  goal(
    'share-ore',
    'Send ore to both furnaces',
    machine('splitter'),
    'furnaces fed',
    (c) => (c.progress.objectiveRun as RoutingLesson | undefined)?.fedFurnaces?.length ?? 0,
    [
      'Try each exit. When a belt fills up, ore can take the other one.',
      'ctx.route("splitter", "furnace-a")',
      'ctx.route("splitter", "furnace-b")',
    ],
    'Each furnace counts as soon as a rock arrives.',
    2,
  ),
  customer(
    'balance',
    machine('furnace'),
    'ingots',
    ['Work either furnace. The counter moves when a bar is made.', 'ctx.work("furnace-b")'],
    'rail',
  ),
  learn('dies', 'press', 'Stamping dies', 'The press takes iron and coal.'),
  goal(
    'coal',
    'Place a miner on coal',
    { type: 'tile', siteId: 'shed', x: 1, y: 4, tool: 'miner' },
    'coal miners',
    (c) => c.world.machines.some((m) => m.deposit === 'coal'),
    ['Place a miner on the black patch at (1, 4) in the shed.'],
    'Miller needs a new run of pressed parts.',
  ),
  goal(
    'press',
    'Place a press',
    shop('press'),
    'presses',
    count('press'),
    ['Choose Press and place it near the furnaces.'],
    'There are two hoppers to fill.',
  ),
  goal(
    'press-coal',
    'Feed coal to the press',
    machine('press'),
    'coal deliveries',
    (c) =>
      machines(c, 'press').some(
        (m) =>
          m.queue.some((i) => i.kind === 'coal') ||
          c.world.lastEvents.some(
            (e) => e.type === 'itemArrived' && e.machineId === m.id && e.item.kind === 'coal',
          ),
      ),
    [
      'Belt the coal miner to the press. Use your miner’s ID.',
      'if (ctx.space("coal-mine")) ctx.dig("coal-mine")',
    ],
    'The black hopper takes one sack at a time.',
  ),
  goal(
    'press-iron',
    'Connect a furnace to the press',
    shop('belt'),
    'connections',
    (c) => linked(c, 'furnace', 'press').length,
    ['Remove a furnace-to-dock belt. Connect that furnace to the press.'],
    'Hot ingots fill the other hopper.',
  ),
  goal(
    'part',
    'Ship 1 pressed part',
    dock,
    'parts',
    shipped('part'),
    ['Connect the press to the dock. Add this inside onTick.', 'ctx.work("press", "part")'],
    'One ingot and one sack of coal fit the die.',
  ),
  customer(
    'parts',
    dock,
    'parts',
    ['Keep the press running. Let its belt carry three more parts to the dock.'],
    'miller',
  ),
  learn('clock', 'clock', 'Faster clock', 'Your controller has room for more instructions.'),
  goal(
    'coal-memory',
    'Remember coal in memory',
    { type: 'button', id: 'memory' },
    'coal entries',
    (c) => typeof c.memory.coal === 'number' && Number.isSafeInteger(c.memory.coal) && c.memory.coal > 0,
    [
      'Replace the coal dig line with this, using your miner’s ID.',
      'if (ctx.space("coal-mine") && ctx.dig("coal-mine"))',
      '  memory.coal = Number(memory.coal ?? 0) + 1',
    ],
    'Leave a mark in the ledger when a sack comes up.',
  ),
  customer(
    'gate',
    machine('press'),
    'parts',
    ['Keep feeding the press. Each new part counts as soon as it is made.', 'ctx.work("press", "part")'],
    'canal',
  ),
  learn('binder', 'binder', 'Workshop binder', 'A helper can live on its own page.', 'binder'),
  goal(
    'helper',
    'Import a helper from lib/',
    files,
    'imports',
    hasHelper,
    [
      'Move your routing function to lib/feed.ts and export it. In main.ts add:',
      'import { feed } from "./lib/feed"',
    ],
    'Give the splitter dance a name.',
  ),
  learn('copper-claim', 'copper', 'Copper claim', 'The east plot has a green patch.'),
  goal(
    'copper',
    'Place a miner on copper',
    { type: 'tile', siteId: 'shed', x: 9, y: 2, tool: 'miner' },
    'copper miners',
    (c) => c.world.machines.some((m) => m.deposit === 'copper'),
    ['Place a miner on the green patch at (9, 2) on the east lot.'],
    'Fresh wire starts here.',
  ),
  learn('blueprints', 'blueprints', 'Blueprint API', 'Your controller can place machines on owned land.'),
  goal(
    'code-furnace',
    'Build 1 furnace from code',
    { type: 'tile', siteId: 'shed', x: 10, y: 2 },
    'furnaces',
    (c) => machines(c, 'furnace').some((m) => m.builtByCode),
    [
      'Use a free tile near the copper miner. Save the new ID.',
      'if (!memory.oven)',
      '  memory.oven = ctx.build("furnace", 10, 2, { recipe: "copper-ingot" }) ?? null',
    ],
    'The copper crew can follow a plan.',
  ),
  goal(
    'code-belt',
    'Connect your new furnace from code',
    { type: 'machine', kind: 'furnace', recipe: 'copper-ingot' },
    'belts',
    (c) =>
      machines(c, 'furnace').some(
        (m) =>
          m.builtByCode && c.world.belts.some((b) => b.builtByCode && (b.from === m.id || b.to === m.id)),
      ),
    [
      'Use your copper miner’s ID and the furnace ID you saved.',
      'if (!memory.wired && typeof memory.oven === "string")',
      '  memory.wired = ctx.connect("copper", memory.oven)',
    ],
    'One belt joins the copper crew to its furnace.',
  ),
  goal(
    'copper-ore',
    'Dig 1 copper rock',
    { type: 'machine', kind: 'miner', deposit: 'copper' },
    'rocks',
    (c) => c.world.extracted['copper-ore'] ?? 0,
    ['Use your copper miner’s ID to dig once.', 'if (ctx.space("copper")) ctx.dig("copper")'],
    'The first green rock is on its way.',
  ),
  goal(
    'copper-bar',
    'Ship 1 copper ingot',
    { type: 'machine', kind: 'furnace', recipe: 'copper-ingot' },
    'ingots',
    shipped('copper-ingot'),
    [
      'Connect the copper furnace to the dock. Run the ingot recipe.',
      'if (typeof memory.oven === "string") ctx.work(memory.oven, "copper-ingot")',
    ],
    'The electrician likes her copper in bars.',
  ),
  goal(
    'cutter',
    'Place a cutter',
    shop('cutter'),
    'cutters',
    count('cutter'),
    ['Unlock Cutting head, then place a cutter beside the copper furnace.'],
    'The little hole in the die draws wire.',
  ),
  goal(
    'wire',
    'Ship 1 wire',
    { type: 'machine', kind: 'cutter', recipe: 'wire' },
    'wires',
    shipped('wire'),
    ['Belt the copper furnace to the cutter and its output to the dock.', 'ctx.work("draw", "wire")'],
    'An ingot stretches a long way.',
  ),
  goal(
    'plate',
    'Ship 1 plate',
    machine('press'),
    'plates',
    shipped('plate'),
    ['Change the press recipe. Leave its dock belt in place.', 'ctx.work("press", "plate")'],
    'The flat die only needs iron.',
  ),
  goal(
    'gear',
    'Ship 1 gear',
    { type: 'machine', kind: 'cutter', recipe: 'gear' },
    'gears',
    shipped('gear'),
    ['Belt plates to a cutter and its output to the dock.', 'ctx.work("teeth", "gear")'],
    'Two plates make one gear.',
  ),
  learn('cards', 'recipes', 'Recipe cards', 'Each machine has its own menu.'),
  goal(
    'assembler',
    'Place an assembler',
    shop('assembler'),
    'assemblers',
    count('assembler'),
    ['Unlock Assembly jig, then place an assembler near the plate and wire lines.'],
    'This bench joins parts together.',
  ),
  goal(
    'jig',
    'Choose the bracket recipe',
    machine('assembler'),
    'recipes',
    (c) => c.progress.signals.choseRecipe,
    ['Use your assembler’s ID.', 'ctx.work("jig", "bracket")'],
    'The jig remembers its last job.',
  ),
  goal(
    'bracket',
    'Ship 1 bracket',
    dock,
    'brackets',
    shipped('bracket'),
    ['Belt plates and wire to the assembler. Connect its output to the dock.'],
    'Nora has a shelf waiting for this.',
    1,
    'shelf',
  ),
  goal(
    'shelves',
    'Place a storage bin',
    shop('storage'),
    'bins',
    count('storage'),
    ['Unlock Spare shelves and put a storage bin beside a working belt.'],
    'A shelf gives the line somewhere to wait.',
  ),
  goal(
    'buffer',
    'Store 3 parcels',
    machine('storage'),
    'parcels',
    (c) => Math.max(0, ...machines(c, 'storage').map((m) => m.queue.length)),
    ['Feed your storage bin. Leave its exit closed until three parcels are inside.'],
    'This bin can catch a whole burst.',
    3,
  ),
  goal(
    'release',
    'Send 1 parcel out of storage',
    machine('storage'),
    'parcels',
    processed('storage'),
    ['Connect storage to the next station. Use those two IDs.', 'ctx.route("buffer", "jig")'],
    'Open the exit when the next station is ready.',
  ),
  goal(
    'merger',
    'Connect 2 belts to a merger',
    shop('merger'),
    'incoming belts',
    (c) =>
      Math.max(0, ...machines(c, 'merger').map((m) => c.world.belts.filter((b) => b.to === m.id).length)),
    ['Unlock Joining belts and place a merger. Drag one belt from each furnace into it.'],
    'Two suppliers can share one loading door.',
    2,
  ),
  goal(
    'merge-out',
    'Send 1 parcel through the merger',
    machine('merger'),
    'parcels',
    processed('merger'),
    ['Belt the merger to the press. Use your IDs.', 'ctx.route("merge", "press")'],
    'Both incoming belts have the same exit.',
  ),
  learn('quality', 'quality', 'Quality stamps', 'Some fresh parcels now carry a defect.', 'stamps'),
  goal(
    'sorter-built',
    'Place a sorter',
    shop('sorter'),
    'sorters',
    count('sorter'),
    ['Put a sorter on the iron ore line. Belt the miner to it.'],
    'Read the stamp before choosing an exit.',
  ),
  goal(
    'sorter',
    'Read the first parcel in the sorter',
    machine('sorter'),
    'parcels read',
    (c) => c.progress.signals.inspectedParcel,
    ['Let ore reach the sorter. Look at the front parcel.', 'ctx.peek("sorter")'],
    'A bent parcel has a defect stamp.',
  ),
  goal(
    'scrap',
    'Recycle 1 defective parcel',
    machine('scrap'),
    'parcels',
    processed('scrap'),
    [
      'Connect one sorter exit to a recycler. Send it the bent parcels.',
      'ctx.route("sorter", ctx.peek("sorter")?.defect ? "scrap" : "splitter")',
      'ctx.work("scrap")',
    ],
    'Even a bent parcel is worth some clean iron ore.',
  ),
  goal(
    'contract',
    'Type a recipe in a helper',
    files,
    'typed helpers',
    (c) => typedHelper(c, /:\s*(?:MaterialId|RecipeId)\b|Record\s*<[^>]*(?:MaterialId|RecipeId)/),
    [
      'In a helper under lib/, import the recipe type.',
      'import type { RecipeId } from "inherit"',
      'export const pressJob: RecipeId = "plate"',
    ],
    'Try typing “wirre” at the call site. The editor will spot the typo.',
  ),
  goal(
    'recipe-table',
    'Put a recipe in a typed table',
    files,
    'tables',
    (c) => typedHelper(c, /Record\s*<[^>]*,\s*RecipeId\s*>|satisfies\s+[^;\n]*RecipeId/),
    ['Add a table to your helper file.', 'const jobs: Record<string, RecipeId> = { jig: "bracket" }'],
    'Look up the job by the machine’s name.',
  ),
  learn('doorbell', 'arrivals', 'Doorbell', 'A belt can ring when a parcel arrives.'),
  goal(
    'arrival',
    'Start a machine when a parcel arrives',
    machine('scrap'),
    'starts',
    (c) => c.progress.signals.arrival,
    [
      'Move the recycler’s work call into onItemArrived(event, ctx).',
      'if (event.machineId === "scrap") ctx.work("scrap")',
    ],
    'The recycler can sleep between deliveries.',
  ),
  learn('idle-bell', 'idle', 'Shift bell', 'A machine can ring when it stops working.'),
  goal(
    'idle',
    'Save the name of an idle machine',
    { type: 'button', id: 'memory' },
    'names',
    (c) => /\bonMachineIdle\b/.test(code(c)) && c.progress.signals.idle,
    ['Export onMachineIdle(event, ctx) from main.ts. Inside it write:', 'memory.lastIdle = event.machineId'],
    'The ledger tells you which station rang.',
  ),
  goal(
    'road',
    'Open the road to the yard',
    shop('road'),
    'roads',
    (c) => c.economy.road,
    ['Unlock Road permit. Choose the road in the shop.'],
    'The yard is four ticks away by truck.',
    1,
    'road',
  ),
  goal(
    'local-depot',
    'Place a depot in the shed',
    shop('depot'),
    'depots',
    (c) => machines(c, 'depot').some((m) => m.siteId === 'shed'),
    ['Place a depot beside a shed production line. Belt cargo into it.'],
    'This is the loading end of the road.',
  ),
  goal(
    'depots',
    'Place a depot in the yard',
    shop('depot', 'yard'),
    'depots',
    (c) => machines(c, 'depot').some((m) => m.siteId === 'yard'),
    ['Switch to the yard and place a depot there.'],
    'The truck needs somewhere to unload.',
  ),
  goal(
    'truck',
    'Place a truck in the shed',
    shop('truck'),
    'trucks',
    (c) => machines(c, 'truck').some((m) => m.siteId === 'shed'),
    ['Unlock Freight license, then place a truck on the shed side.'],
    'Load the truck where the parcels are.',
  ),
  goal(
    'manifest',
    'Send 1 truckload to the yard',
    machine('truck'),
    'loads sent',
    (c) => c.world.trips.length > 0 || c.world.receipts.length > 0 || c.progress.signals.breakdown,
    [
      'Use the truck and depot IDs on your floor. Keep this load’s name.',
      'ctx.dispatch("truck", "local", "remote", "island-1")',
    ],
    'The driver writes the load name on the receipt.',
  ),
  goal(
    'breakdown',
    'Resend the broken-down truckload',
    machine('truck'),
    'loads recovered',
    (c) => c.progress.signals.recovered,
    [
      'When the truck returns, dispatch the same load again.',
      'ctx.dispatch("truck", "local", "remote", "island-1")',
    ],
    'The driver brought the original parcel back.',
    1,
    'axle',
  ),
  goal(
    'ack',
    'Confirm the missing receipt',
    machine('truck'),
    'receipts',
    (c) => c.progress.signals.confirmed,
    [
      'Dispatch again using the original load name. The yard already has the parcel.',
      'ctx.dispatch("truck", "local", "remote", "island-1")',
    ],
    'This trip carries paperwork.',
    1,
  ),
  goal(
    'motor-bench',
    'Set an assembler to make motors',
    shop('assembler'),
    'motor benches',
    (c) => machines(c, 'assembler').some((m) => m.recipe === 'motor'),
    ['Place a second assembler. Use its ID.', 'ctx.work("motor-jig", "motor")'],
    'Keep the first jig making brackets.',
  ),
  goal(
    'motor-gear',
    'Feed a gear to the motor bench',
    machine('cutter'),
    'gear deliveries',
    motorInput('gear'),
    ['Split the plate line between the bracket jig and gear cutter. Belt the cutter to the motor bench.'],
    'The gear goes on the shaft.',
  ),
  goal(
    'motor-wire',
    'Feed wire to the motor bench',
    machine('storage'),
    'wire deliveries',
    motorInput('wire'),
    ['Split the wire line between the bracket jig and the motor bench.'],
    'Wire goes around the motor’s core.',
  ),
  goal(
    'motor',
    'Ship 1 motor',
    dock,
    'motors',
    shipped('motor'),
    ['Belt the bracket jig to the motor bench. Connect the motor bench to the dock.'],
    'A bracket holds the motor together.',
  ),
  goal(
    'tram',
    'Ship 3 motors in total',
    dock,
    'motors',
    shipped('motor'),
    ['Keep the motor line running. Your first shipment already counts.'],
    'Three motors will get the island tram moving.',
    3,
    'tram',
  ),
  goal(
    'network',
    'Read the island letter',
    { type: 'button', id: 'inbox' },
    'letters read',
    (c) => c.progress.messages.some((m) => m.id === 'tram' && !m.unread),
    ['Open “One more stop” in your inbox.'],
    'Someone across the water has a factory of their own.',
    1,
    'network',
  ),
]
export const OBJECTIVES: readonly Objective[] = stages.map(({ measure, target, ...view }) => view)
function indexOfActive(c: Campaign) {
  // Old linear saves can skip newly inserted lessons behind their last stamp.
  const last = c.progress.completedObjectives.at(-1)
  const next = stages.findIndex((o) => o.id === last) + 1
  return next < stages.length ? next : -1
}
export function objectiveTrack(c: Campaign): {
  active?: Objective
  next?: Objective
  progress: { current: number; target: number }
} {
  const index = indexOfActive(c)
  const stage = stages[index]
  if (!stage) return { progress: { current: 0, target: 0 } }
  return {
    active: activeCard(c, OBJECTIVES[index]),
    next: OBJECTIVES[index + 1],
    progress: { current: Math.min(stage.target, Number(stage.measure(c))), target: stage.target },
  }
}
/** Completed stages retain their stamp even if the player later rewires the line. */
export function objectiveProgress(c: Campaign, id: string) {
  const stage = stages.find((o) => o.id === id)
  if (!stage) return
  const activeIndex = indexOfActive(c)
  const state =
    activeIndex === -1 || stages.indexOf(stage) < activeIndex
      ? 'complete'
      : stages[activeIndex] === stage
        ? 'active'
        : 'upcoming'
  const current =
    state === 'complete'
      ? stage.target
      : state === 'active'
        ? Math.min(stage.target, Number(stage.measure(c)))
        : 0
  return { state, current, target: stage.target } as const
}
export function retryObjective(c: Campaign): boolean {
  const active = stages[indexOfActive(c)]
  if (!active) return false
  if (QUESTS.some((q) => q.id === active.id)) return restartQuest(c, active.id)
  if (active.id === 'breakdown' || active.id === 'ack') {
    const fault = active.id === 'breakdown' ? 'breakdown' : 'lostAck'
    if (!c.world.tripScript.includes(fault)) c.world.tripScript.unshift(fault)
    return true
  }
  return false
}
export function beginObjective(c: Campaign) {
  const stage = stages[indexOfActive(c)]
  const existing = c.progress.activeQuest
  // A v3 save may already have this order open when a new lesson is inserted before it.
  const keepOrder = c.progress.objectiveRun && existing && !c.progress.completedQuests.includes(existing.id)
  c.progress.objectiveRun = { startTick: c.world.tick, revision: c.project.history.at(-1)?.id ?? 0 }
  c.world.dockInterval = 1
  if (keepOrder && stage?.id === existing.id) return
  if (!keepOrder) delete c.progress.activeQuest
  if (!stage) return
  if (stage.id === 'redeploy') {
    const entry = Object.entries(c.memory).find(
      ([, v]) => typeof v === 'number' && Number.isSafeInteger(v) && v > 0,
    )
    if (entry) Object.assign(c.progress.objectiveRun, { memoryKey: entry[0], memoryValue: entry[1] })
  }
  if (QUESTS.some((q) => q.id === stage.id)) {
    restartQuest(c, stage.id)
    const run = c.progress.activeQuest!
    const paused = c.progress.pausedQuest
    if (paused?.id === stage.id) {
      run.startTick -= paused.elapsed
      run.shipped -= paused.shipped
      if (QUESTS.some((q) => q.id === stage.id && q.count === 'made'))
        Object.assign(run, { made: paused.shipped })
      run.lost -= paused.lost
      run.coal -= paused.coal
      for (const id of Object.keys(run.furnaceActive))
        run.furnaceActive[id] = Math.max(0, run.furnaceActive[id] - (paused.furnaceActive[id] ?? 0))
      delete c.progress.pausedQuest
    } else if (stage.id === 'shed') run.shipped = 0
  }
}
export function finishObjective(c: Campaign): Objective | undefined {
  const index = indexOfActive(c)
  const stage = stages[index]
  if (!stage) return
  if (stage.id === 'share-ore' && c.progress.objectiveRun) rememberOreArrivals(c, c.progress.objectiveRun)
  if (Number(stage.measure(c)) < stage.target) return
  if (QUESTS.some((q) => q.id === stage.id) && !c.progress.completedQuests.includes(stage.id))
    c.progress.completedQuests.push(stage.id)
  c.progress.completedObjectives.push(stage.id)
  c.economy.money += stage.reward.money
  c.economy.researchPoints += stage.reward.researchPoints
  beginObjective(c)
  return OBJECTIVES[index]
}
