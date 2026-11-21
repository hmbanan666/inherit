import type { MachineKind, MaterialId } from './campaign-api'
import type { Campaign } from './model'
import { questStatus, QUESTS, restartQuest } from './quests'
import { MOTOR_CUSTOMER } from './orders'

export interface Objective {
  id: string
  title: string
  why: string
  hints: string[]
  reward: { money: number; researchPoints: number }
  story?: string
}
type Measure = (c: Campaign) => number | boolean
interface Stage extends Objective {
  target: number
  measure: Measure
  complete?: Measure
}
function goal(
  id: string,
  title: string,
  why: string,
  hints: string[],
  measure: Measure,
  target = 1,
  story?: string,
): Stage {
  return { id, title, why, hints, measure, target, reward: { money: 20, researchPoints: 2 }, story }
}
const machines = (c: Campaign, kind: MachineKind) => c.world.machines.filter((m) => m.kind === kind)
const count =
  (kind: MachineKind): Measure =>
  (c) =>
    machines(c, kind).length
const license =
  (id: string): Measure =>
  (c) =>
    c.economy.research.includes(id)
const delivered =
  (material: MaterialId): Measure =>
  (c) =>
    c.world.delivered[material] ?? 0
const extracted =
  (material: MaterialId): Measure =>
  (c) =>
    c.world.extracted[material] ?? 0
const processed =
  (kind: MachineKind): Measure =>
  (c) =>
    machines(c, kind).reduce((sum, m) => sum + m.stats.processed, 0)
function customer(id: string, title: string, why: string, hints: string[], story?: string): Stage {
  const quest = QUESTS.find((q) => q.id === id)!
  const stage = goal(
    id,
    title,
    why,
    hints,
    (c) => {
      if (c.progress.completedQuests.includes(id)) return quest.quantity
      const status = questStatus(c)
      if (status?.id !== id) return 0
      return status.shipped
    },
    quest.quantity,
    story,
  )
  stage.complete = (c) =>
    c.progress.completedQuests.includes(id) ||
    (c.progress.activeQuest?.id === id && questStatus(c)?.state === 'complete')
  return stage
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
    'Dig one rock',
    'Uncle left a shovel with a power cord. Try it.',
    ['Put this inside onTick and deploy.', 'ctx.dig("mine")'],
    extracted('iron-ore'),
    1,
    'shovel',
  ),
  goal(
    'fire',
    'Wake the furnace',
    'Ore goes in. Something shinier should come out.',
    ['Keep digging. Give the burner a job each tick.', 'ctx.work("furnace-a")'],
    processed('furnace'),
  ),
  goal(
    'ingot',
    'Ship your first ingot',
    'Hale is waiting at the end of the belt.',
    ['Follow an ingot down the second belt. The dock loads itself.'],
    delivered('iron-ingot'),
  ),
  customer(
    'shed',
    'Ship ten ingots to Hale',
    'Ten shiny bars will keep the hardware shop open until lunch.',
    ['Leave both machines running. The inherited furnace takes four ticks.'],
    'hale',
  ),
  customer(
    'loading',
    'Ship seven ingots without a spill',
    'County Freight picks up every twelve ticks. Seven clean pickups will save them a broom.',
    [
      'Only dig when the belt has space. A spill starts a fresh count.',
      'if (ctx.space("mine")) ctx.dig("mine")',
    ],
    'board',
  ),
  goal(
    'tally',
    'Count successful digs with a variable',
    'A chalk mark for every rock. Cross out the ones that missed.',
    [
      'Put let rocks = 0 above onTick. Add one only after a successful dig.',
      'if (ctx.space("mine") && ctx.dig("mine")) rocks++',
    ],
    (c) =>
      /\blet\s+\w+/.test(code(c)) &&
      /\+\+|\+=\s*1|\+\s*1/.test(code(c)) &&
      (c.world.extracted['iron-ore'] ?? 0) > 0,
  ),
  goal(
    'chalk',
    'Put a count in memory',
    'Chalk washes off the console. The ledger stays put.',
    ['Save a positive whole number in memory.', 'memory.rocks = Number(memory.rocks ?? 0) + 1'],
    (c) => Object.values(c.memory).some((v) => typeof v === 'number' && Number.isSafeInteger(v) && v > 0),
  ),
  goal(
    'redeploy',
    'Carry the count through a deploy',
    'Change a comment and send the controller back to work. Check the ledger.',
    ['Deploy once more. Keep the same memory key and keep counting.'],
    (c) => {
      const run = c.progress.objectiveRun
      if (run?.memoryKey === undefined || (c.project.history.at(-1)?.id ?? 0) <= run.revision) return false
      const v = c.memory[run.memoryKey]
      return typeof v === 'number' && v >= run.memoryValue!
    },
    1,
    'ledger',
  ),
  goal(
    'plot',
    'Buy a neighboring plot',
    'The landlord accepts coins. He has stopped accepting ingots.',
    ['Research Tape measure. The east lot has copper for later.'],
    (c) => c.world.sites.some((s) => s.plots.some((p) => p.price > 0 && p.status === 'owned')),
  ),
  goal(
    'oven',
    'Place a second furnace',
    'The new burner takes one tick. The old one enjoys a longer lunch.',
    ['Buy a furnace and give it a free tile near the dock.'],
    count('furnace'),
    2,
  ),
  goal(
    'belt',
    'Connect two furnaces to the dock',
    'The new burner needs somewhere to send its first bar.',
    ['Drag a belt from the new furnace to the dock.'],
    (c) =>
      machines(c, 'furnace').filter((m) =>
        c.world.belts.some((b) => b.from === m.id && machines(c, 'dock').some((d) => d.id === b.to)),
      ).length,
    2,
  ),
  goal(
    'gauges',
    'Research bin gauges',
    'Find out which furnace has room for dinner.',
    ['Buy Bin gauges on the research tree.', 'ctx.stock("furnace-a")'],
    license('bins'),
  ),
  goal(
    'fork',
    'Fit a splitter between the burners',
    'One belt in, two ways out. Even Uncle drew this one right.',
    ['Research Forked belts. Sell the mine-to-furnace belt. Belt mine → splitter → both furnaces.'],
    (c) =>
      machines(c, 'splitter').some(
        (m) =>
          c.world.belts.some((b) => b.to === m.id) &&
          machines(c, 'furnace').filter((f) => c.world.belts.some((b) => b.from === m.id && b.to === f.id))
            .length >= 2,
      ),
  ),
  customer(
    'balance',
    'Balance 48 ingots for West End Rail',
    'Ship 185 bars per minute with each burner busy at least half the shift.',
    [
      'Work both burners. Send ore to the shorter queue. Retry for a fresh rate window.',
      'ctx.route("splitter", ctx.stock("furnace-a") <= ctx.stock("furnace-b") ? "furnace-a" : "furnace-b")',
    ],
    'rail',
  ),
  goal(
    'coal',
    'Open the coal seam',
    'Miller wants a harder part. The black patch in the shed should help.',
    ['Research Stamping dies. Place a miner on the coal tile at (1, 4).'],
    (c) => c.world.machines.some((m) => m.deposit === 'coal'),
  ),
  goal(
    'press',
    'Set up a stamping press',
    'Its two hoppers are labeled iron and definitely not iron.',
    ['Belt coal and a furnace to a press. Wire its output to the dock.'],
    (c) =>
      machines(c, 'press').some(
        (m) =>
          c.world.belts.filter((b) => b.to === m.id).length >= 2 &&
          c.world.belts.some((b) => b.from === m.id),
      ),
  ),
  goal(
    'part',
    'Ship one pressed part',
    'A little coal and one ingot become a very convincing doorstop.',
    ['Dig coal only when its belt has room. Work the press.', 'ctx.work("press", "part")'],
    delivered('part'),
  ),
  customer(
    'parts',
    'Send ten parts to Miller',
    'Apparently the doorstop has nine cousins.',
    ['Keep feeding one coal and one iron ingot per part. The dock counts the batch.'],
    'miller',
  ),
  goal(
    'clock',
    'Upgrade the controller clock',
    'The coal line has given your controller a second job.',
    ['Research Faster clock. The new allowance applies next tick.'],
    license('clock'),
  ),
  customer(
    'gate',
    'Make twelve gate parts on a coal allowance',
    'Canal Lock Works has twelve sacks and 128 ticks. Leave nothing on the floor.',
    [
      'Send only parts to the slow dock. Count successful coal draws from the start of this order.',
      'if (sacks < 12 && ctx.space("coal-mine") && ctx.dig("coal-mine")) sacks++',
      'After a failed attempt reset your counter and retry the customer.',
    ],
    'canal',
  ),
  goal(
    'binder',
    'Research the Workshop binder',
    'The splitter dance is getting its own sheet of paper.',
    ['Buy Workshop binder. Your existing main.ts stays on the front page.'],
    license('binder'),
    1,
    'binder',
  ),
  goal(
    'helper',
    'Import a helper from lib/',
    'Give that splitter dance a name and call it from the shed.',
    ['Move the routing function to lib/feed.ts and export it.', 'import { feed } from "./lib/feed"'],
    hasHelper,
  ),
  goal(
    'copper',
    'Sink a copper miner',
    'The east lot has a little green showing through the dirt.',
    ['Buy the east lot and research Copper claim. Place a miner at (9, 2).'],
    (c) => c.world.machines.some((m) => m.deposit === 'copper'),
  ),
  goal(
    'blueprints',
    'Research Blueprint API',
    'Uncle left the copper crew a set of plans. Your controller can read them now.',
    ['Buy Blueprint API for three research points. Open api.d.ts to see the new calls.'],
    license('blueprints'),
  ),
  goal(
    'code-furnace',
    'Place a furnace from code',
    'The copper crew needs a burner. Give the controller the blueprints.',
    [
      'Choose a free owned tile near the copper miner. Save the returned ID so you only buy one furnace.',
      'if (!memory.oven) { const id = ctx.build("furnace", 10, 2, { recipe: "copper-ingot" }); if (id) memory.oven = id }',
    ],
    (c) => machines(c, 'furnace').some((m) => m.builtByCode),
  ),
  goal(
    'code-belt',
    'Connect your new furnace from code',
    'The belt crew takes coordinates. Your controller just needs the two machine IDs.',
    [
      'Connect your copper miner to the ID saved in memory. Replace "copper" with the ID of your miner.',
      'if (!memory.wired && typeof memory.oven === "string") memory.wired = ctx.connect("copper", memory.oven)',
    ],
    (c) =>
      machines(c, 'furnace').some(
        (m) =>
          m.builtByCode && c.world.belts.some((b) => b.builtByCode && (b.from === m.id || b.to === m.id)),
      ),
  ),
  goal(
    'copper-ore',
    'Dig your first copper ore',
    'Fresh ore looks better on a belt than in a brochure.',
    ['Belt the copper miner to a furnace, then dig when there is space.'],
    extracted('copper-ore'),
  ),
  goal(
    'copper-bar',
    'Ship a copper ingot',
    'The electrician would like her wire in a less rocky shape.',
    [
      'Connect the copper furnace to the dock.',
      'if (typeof memory.oven === "string") ctx.work(memory.oven, "copper-ingot")',
    ],
    delivered('copper-ingot'),
  ),
  goal(
    'cutter',
    'Fit a cutting head',
    'The wire die is the little hole in the middle.',
    ['Research Cutting head and buy a cutter.'],
    count('cutter'),
  ),
  goal(
    'wire',
    'Draw and ship copper wire',
    'One copper ingot stretches much further than expected.',
    ['Rewire the copper furnace to the cutter. Belt the cutter to the dock.', 'ctx.work("draw", "wire")'],
    delivered('wire'),
  ),
  goal(
    'plate',
    'Stamp and ship a plate',
    'Give the press the flat die. It can forget about coal for this job.',
    ['Keep iron flowing through the press to the dock.', 'ctx.work("press", "plate")'],
    delivered('plate'),
  ),
  goal(
    'gear',
    'Cut teeth in two plates',
    'A gear is just two plates with excellent dental care.',
    ['Feed two plates to a cutter. Ship its first gear.', 'ctx.work("teeth", "gear")'],
    delivered('gear'),
  ),
  goal(
    'cards',
    'Open the recipe cards',
    'Read the menu before asking the cutter for soup.',
    ['Buy Recipe cards.', 'ctx.recipes("teeth")'],
    license('recipes'),
  ),
  goal(
    'jig',
    'Choose the bracket recipe',
    'The jig holds a plate still while the wire goes on.',
    ['Research Assembly jig and buy an assembler. Give it a bracket job.', 'ctx.work("jig", "bracket")'],
    (c) => machines(c, 'assembler').some((m) => m.recipe === 'bracket' && c.progress.signals.choseRecipe),
  ),
  goal(
    'bracket',
    'Deliver the first bracket',
    'Our customer has found a shelf with nowhere to sit.',
    ['Join a plate and a wire at the assembler. Belt its output to the dock.'],
    delivered('bracket'),
    1,
    'shelf',
  ),
  goal(
    'shelves',
    'Build a storage buffer',
    'A shelf buys time when the next machine wants a break.',
    ['Research Spare shelves. Place storage on a working line.'],
    count('storage'),
  ),
  goal(
    'buffer',
    'Catch a burst of three parcels',
    'Let three parcels pile up before opening the exit.',
    ['Belt a producer to storage. Pause its route call until three parcels arrive.'],
    (c) => Math.max(0, ...machines(c, 'storage').map((m) => m.queue.length)),
    3,
  ),
  goal(
    'release',
    'Release a buffered parcel',
    'The shelf has earned its keep. Let the line run again.',
    ['Belt storage to a consumer.', 'ctx.route("buffer", "dock")'],
    processed('storage'),
  ),
  goal(
    'merger',
    'Join two feeds with a merger',
    'Two suppliers, one loading door. Give both a turn.',
    ['Research Joining belts. Wire two producers into a merger and route to its exit.'],
    (c) =>
      machines(c, 'merger').some(
        (m) => m.stats.processed > 0 && c.world.belts.filter((b) => b.to === m.id).length >= 2,
      ),
  ),
  goal(
    'quality',
    'Research quality stamps',
    'We found a part stamped “probably fine.” Time for a closer look.',
    ['Buy Quality stamps. Fresh material can now carry a defect.'],
    license('quality'),
    1,
    'stamps',
  ),
  goal(
    'sorter',
    'Fit a sorter and inspect its queue',
    'Look at the parcel before choosing its belt.',
    ['Put a sorter after a busy producer. Let one parcel arrive.', 'ctx.peek("sorter")'],
    (c) =>
      machines(c, 'sorter').some((m) => m.queue.length || m.stats.processed) &&
      c.progress.signals.inspectedParcel,
  ),
  goal(
    'scrap',
    'Recycle one defective parcel',
    'The recycler gives a wonky parcel another life as clean iron ore.',
    [
      'Belt one sorter exit to scrap and the other to a good bin. Work the recycler.',
      'ctx.route("sorter", ctx.peek("sorter")?.defect ? "scrap" : "dock")',
    ],
    processed('scrap'),
  ),
  goal(
    'contract',
    'Give a helper a material contract',
    'A misspelled gear once cost Uncle an afternoon. Let the editor catch yours.',
    [
      'In lib/, type a parameter or a table with MaterialId or RecipeId.',
      'Try "wirre", read the underline, then correct it to "wire" before deploying.',
    ],
    (c) => typedHelper(c, /:\s*(?:MaterialId|RecipeId)\b|Record\s*<[^>]*(?:MaterialId|RecipeId)/),
  ),
  goal(
    'recipe-table',
    'Put the workshop recipes in a typed table',
    'File the dies by name. The editor can spot a typo before a machine eats it.',
    [
      'In lib/, give your station table a RecipeId value type.',
      'const jobs: Record<string, RecipeId> = { jig: "bracket" }',
    ],
    (c) => typedHelper(c, /Record\s*<[^>]*,\s*RecipeId\s*>|satisfies\s+[^;\n]*RecipeId/),
  ),
  goal(
    'doorbell',
    'Research the arrival bell',
    'The belt can ring when something lands.',
    ['Buy Doorbell to unlock onItemArrived.'],
    license('arrivals'),
  ),
  goal(
    'arrival',
    'Work a machine on arrival',
    'Give one station a doorbell and take its polling call out of onTick.',
    [
      'Export onItemArrived(event, ctx) from main.ts. Work a machine when its own parcel arrives.',
      'if (event.machineId === "scrap") ctx.work("scrap")',
    ],
    (c) => /\bonItemArrived\b/.test(code(c)) && c.progress.signals.arrival,
  ),
  goal(
    'idle-bell',
    'Research the shift bell',
    'Sometimes the useful sound is a machine going quiet.',
    ['Buy Shift bell to unlock onMachineIdle.'],
    license('idle'),
  ),
  goal(
    'idle',
    'Log an idle bell in memory',
    'Leave a chalk mark when a machine stops working.',
    [
      'Export onMachineIdle from main.ts. Let one station finish and go idle.',
      'memory.lastIdle = event.machineId',
    ],
    (c) => /\bonMachineIdle\b/.test(code(c)) && c.progress.signals.idle,
  ),
  goal(
    'road',
    'Buy the road to the yard',
    'The yard is four ticks away if the truck behaves.',
    ['Research Road permit, then purchase the road.'],
    (c) => c.economy.road,
    1,
    'road',
  ),
  goal(
    'depots',
    'Put a depot at each end',
    'A road with one loading bay is a very long shelf.',
    ['Build a depot in the shed and another in the yard. Feed the shed depot.'],
    (c) => new Set(machines(c, 'depot').map((m) => m.siteId)).size,
    2,
  ),
  goal(
    'truck',
    'Park a truck by the shed',
    'The handbrake is the least rusty lever.',
    ['Research Freight license and buy a truck on the same site as the loaded depot.'],
    count('truck'),
  ),
  goal(
    'manifest',
    'Send the first manifest',
    'Put a name on this load. You may need to ask about it twice.',
    [
      'Keep one key for this parcel. Dispatch it between depots.',
      'ctx.dispatch("truck", "local", "remote", "island-1")',
    ],
    (c) => c.world.trips.length > 0 || c.world.receipts.length > 0 || c.progress.signals.breakdown,
  ),
  goal(
    'breakdown',
    'Recover the broken-down shipment',
    'The driver is back, and so is the parcel. Send it again.',
    ['Retry the same manifest after breakdown. Watch for its arrival at the far depot.'],
    (c) => c.progress.signals.recovered,
    1,
    'axle',
  ),
  goal(
    'ack',
    'Confirm a lost receipt with the same key',
    'The parcel arrived. Only the paperwork needs another trip.',
    ['Retry the unacknowledged manifest using its original key. One parcel, one receipt.'],
    (c) => c.progress.signals.confirmed,
  ),
  goal(
    'motor',
    'Build and ship a motor',
    'One gear, two wires and a bracket. This one moves under its own steam.',
    [
      'Split the plate and wire lines so both assemblers get fed. Route gear, wire and bracket to the motor jig.',
      'ctx.work("motor-jig", "motor")',
    ],
    delivered('motor'),
  ),
  goal(
    'tram',
    'Fill the island tram order',
    'Three motors for Lark Island. The conductor has retired the pushing stick.',
    ['Accept Lark Island Tram on the board. Ship three motors before pickup closes.'],
    (c) => c.economy.orders.some((o) => o.customer === MOTOR_CUSTOMER && o.status === 'done'),
    1,
    'tram',
  ),
  goal(
    'network',
    'Open the island letter',
    'Someone across the water has a factory of their own.',
    ['Open the conductor’s email, “One more stop.”'],
    (c) => c.progress.messages.some((m) => m.id === 'tram' && !m.unread),
    1,
    'network',
  ),
]

export const OBJECTIVES: readonly Objective[] = stages.map(({ measure, target, complete, ...view }) => view)
function indexOfActive(c: Campaign) {
  return stages.findIndex((o) => !c.progress.completedObjectives.includes(o.id))
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
    active: OBJECTIVES[index],
    next: OBJECTIVES[index + 1],
    progress: { current: Math.min(stage.target, Number(stage.measure(c))), target: stage.target },
  }
}
/** Completed stages retain their stamp even if the player later rewires the line. */
export function objectiveProgress(c: Campaign, id: string) {
  const stage = stages.find((o) => o.id === id)
  if (!stage) return
  const state = c.progress.completedObjectives.includes(id)
    ? 'complete'
    : stages[indexOfActive(c)] === stage
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
  c.progress.objectiveRun = { startTick: c.world.tick, revision: c.project.history.at(-1)?.id ?? 0 }
  delete c.progress.activeQuest
  c.world.dockInterval = 1
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
  if (!(stage.complete ? stage.complete(c) : Number(stage.measure(c)) >= stage.target)) {
    if (c.progress.activeQuest && questStatus(c)?.state === 'failed') retryObjective(c)
    return
  }
  if (c.progress.activeQuest && !c.progress.completedQuests.includes(stage.id))
    c.progress.completedQuests.push(stage.id)
  c.progress.completedObjectives.push(stage.id)
  c.economy.money += stage.reward.money
  c.economy.researchPoints += stage.reward.researchPoints
  beginObjective(c)
  return OBJECTIVES[index]
}
