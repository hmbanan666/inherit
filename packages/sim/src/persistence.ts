import { createCampaign, snapshotProject, initialSignals } from './campaign'
import { MACHINES, MATERIALS, RECIPES } from './catalog'
import { questStatus } from './quests'
import { RESEARCH } from './research'
import type { Campaign } from './model'

export function serializeSave(campaign: Campaign): string {
  return JSON.stringify(campaign)
}

type Check = (value: unknown) => boolean
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const str: Check = (v) => typeof v === 'string'
const integer: Check = (v) => Number.isSafeInteger(v)
const count: Check = (v) => integer(v) && Number(v) >= 0
const bool: Check = (v) => typeof v === 'boolean'
const list =
  (check: Check): Check =>
  (v) =>
    Array.isArray(v) && v.every(check)
const opt =
  (check: Check): Check =>
  (v) =>
    v === undefined || check(v)
const one =
  (...values: unknown[]): Check =>
  (v) =>
    values.includes(v)
const shape =
  (fields: Record<string, Check>): Check =>
  (v) =>
    record(v) && Object.entries(fields).every(([k, check]) => check(v[k]))
const dict =
  (check: Check): Check =>
  (v) =>
    record(v) && Object.values(v).every(check)
const material = one(...Object.keys(MATERIALS))
const recipe = one(...Object.keys(RECIPES))
const outcome = one('ok', 'lostAck', 'breakdown')
const deposit = one('iron', 'coal', 'copper')
const tile = { x: integer, y: integer }
const item = { kind: material, defect: opt(one(true)) }
const trip = { key: str, truckId: str, from: str, to: str, tick: count }
const files = dict(str)
const deployed: Check = (v) => record(v) && str(v['main.ts']) && files(v)
const revision = shape({ id: count, tick: count, name: str, files })
const activeQuest = shape({
  id: str,
  startTick: count,
  shipped: count,
  lost: count,
  coal: count,
  furnaceActive: dict(count),
})
const totals: Check = (v) => dict(count)(v) && Object.keys(v as object).every(material)
const event: Check = (v) =>
  record(v) &&
  count(v.tick) &&
  str(v.machineId) &&
  (v.type === 'machineIdle' ||
    ((v.type === 'itemArrived' || v.type === 'delivered') && shape(item)(v.item)) ||
    (v.type === 'truckReturned' && outcome(v.outcome) && str(v.key)))
const machine = shape({
  ...tile,
  id: str,
  kind: one(...Object.keys(MACHINES)),
  siteId: str,
  queue: list(shape(item)),
  status: one('working', 'ready', 'blocked', 'starved', 'idle'),
  recipe: opt(recipe),
  remaining: count,
  output: opt(shape(item)),
  stats: shape({ processed: count, rate: count, activeTicks: count, idleTicks: count, blockedTicks: count }),
  lastInput: opt(str),
  recentProduction: list(count),
  paid: count,
  builtAt: count,
  batchTicks: opt((v) => count(v) && Number(v) > 0),
  batchDefect: opt(one(true)),
  deposit: opt(deposit),
})
const site = shape({
  id: str,
  name: str,
  roads: list(str),
  deposits: list(shape({ ...tile, kind: deposit })),
  plots: list(
    shape({
      ...tile,
      width: count,
      height: count,
      id: str,
      price: count,
      status: one('owned', 'sale', 'locked'),
    }),
  ),
})
const order = shape({
  id: str,
  customer: str,
  items: totals,
  status: one('open', 'accepted', 'done', 'failed', 'declined'),
  pay: count,
  reputation: integer,
  deadline: opt(count),
  quality: opt(one('good')),
})
const world = shape({
  tick: count,
  seed: count,
  nextIncidentId: count,
  nextMachineId: count,
  sites: list(site),
  machines: list(machine),
  belts: list(
    shape({
      siteId: str,
      from: str,
      to: str,
      path: list(shape(tile)),
      paid: count,
      sequence: count,
      items: list(shape({ ...item, id: count, position: count })),
    }),
  ),
  trips: list(shape({ ...trip, due: count, outcome, cargo: opt(shape(item)) })),
  receipts: list(shape({ ...trip, acknowledged: bool })),
  dockInterval: (v) => count(v) && Number(v) > 0,
  defectsEnabled: bool,
  events: list(event),
  lastEvents: list(event),
  incidents: list(
    shape({
      id: count,
      machineId: str,
      startTick: count,
      endTick: opt(count),
      cause: one('blocked', 'breakdown', 'lostAck'),
      key: opt(str),
      affectedOrders: list(str),
    }),
  ),
  tripScript: list(outcome),
  lost: count,
  delivered: totals,
  extracted: totals,
})
const save = shape({
  version: one(2, 3),
  world,
  progress: shape({ activeQuest: opt(activeQuest), completedQuests: list(str) }),
  memory: record,
  economy: shape({ money: count, reputation: integer, research: list(str), orders: list(order) }),
  project: shape({
    working: files,
    deployed,
    nextRevision: count,
    history: list(revision),
    snapshots: list(revision),
  }),
})

const gameFields = shape({
  progress: shape({
    completedObjectives: list(str),
    pausedQuest: opt(
      shape({
        id: str,
        elapsed: count,
        shipped: count,
        lost: count,
        coal: count,
        furnaceActive: dict(count),
      }),
    ),
    signals: shape({
      choseRecipe: bool,
      inspectedParcel: bool,
      arrival: bool,
      idle: bool,
      breakdown: bool,
      recovered: bool,
      confirmed: bool,
      brokenKey: opt(str),
      missingKey: opt(str),
    }),
    messages: list(
      shape({
        id: str,
        kind: one('notebook', 'email'),
        from: str,
        title: str,
        body: str,
        tick: count,
        unread: bool,
      }),
    ),
    objectiveRun: opt(
      shape({ startTick: count, revision: count, memoryKey: opt(str), memoryValue: opt(integer) }),
    ),
  }),
  economy: shape({
    nextOrder: count,
    orderSeed: count,
    road: bool,
    researchPoints: count,
    orders: list(shape({ line: str, filled: totals, duration: count })),
  }),
})

function migrateEngine(c: Campaign) {
  c.version = 3
  c.progress.completedObjectives = []
  c.progress.messages = []
  const oldRun = c.progress.activeQuest
  const status = questStatus(c)
  if (oldRun && status) {
    const { id, elapsed, shipped, lost, coal } = status
    const furnaceActive = Object.fromEntries(
      c.world.machines
        .filter((m) => m.kind === 'furnace')
        .map((m) => [m.id, Math.max(0, m.stats.activeTicks - (oldRun.furnaceActive[m.id] ?? 0))]),
    )
    c.progress.pausedQuest = { id, elapsed, shipped, lost, coal, furnaceActive }
  }
  c.progress.signals = initialSignals()
  const e = c.economy
  e.researchPoints = 1
  e.orderSeed = c.world.seed
  e.nextOrder = 1
  e.road = c.world.machines.some((m) => m.siteId === 'yard' || m.kind === 'truck')
  const files = c.project.deployed
  const code = Object.values(files).join('\n')
  // Grandfather equipment and operations already in use on the unlicensed v2 floor.
  const licenses = new Set(e.research)
  function allow(id: string) {
    if (licenses.has(id)) return
    licenses.add(id)
    RESEARCH.find((n) => n.id === id)?.requires.forEach(allow)
  }
  for (const node of RESEARCH) {
    if (
      node.machines?.some((kind) => c.world.machines.some((m) => m.kind === kind)) ||
      node.methods?.some((method) => code.includes('.' + method + '(')) ||
      node.events?.some((name) => code.includes(name))
    )
      allow(node.id)
  }
  if (Object.keys(files).length > 1) allow('binder')
  if (e.road) allow('road')
  if (c.world.defectsEnabled) allow('quality')
  if (c.world.machines.some((m) => m.deposit === 'copper')) allow('copper')
  if (c.world.machines.some((m) => m.deposit === 'coal')) allow('press')
  e.research = [...licenses]
  if (licenses.has('quality')) c.world.defectsEnabled = true
  for (const order of e.orders) {
    order.line = 'One more delivery from the old order book.'
    order.duration = Math.max(1, (order.deadline ?? c.world.tick + 480) - c.world.tick)
    if (order.status === 'accepted') order.deadline ??= c.world.tick + order.duration
    order.filled = order.status === 'done' ? { ...order.items } : {}
  }
  return c
}

function validate(campaign: Campaign) {
  const world = campaign.world
  const machines = new Map(world.machines.map((machine) => [machine.id, machine]))
  const sites = new Set(world.sites.map((s) => s.id))
  if (
    machines.size !== world.machines.length ||
    sites.size !== world.sites.length ||
    world.machines.some(
      (machine) =>
        !sites.has(machine.siteId) ||
        machine.builtAt > world.tick ||
        (machine.recipe && RECIPES[machine.recipe].machine !== machine.kind),
    )
  ) {
    throw new Error('Invalid campaign machines or sites.')
  }
  for (const b of world.belts) {
    const a = machines.get(b.from),
      dest = machines.get(b.to)
    if (
      !a ||
      !dest ||
      a.siteId !== b.siteId ||
      dest.siteId !== b.siteId ||
      b.path.length < 2 ||
      b.items.some((i) => i.position >= b.path.length)
    )
      throw new Error('Invalid campaign belt.')
  }
  for (const t of world.trips) {
    if (
      machines.get(t.from)?.kind !== 'depot' ||
      machines.get(t.to)?.kind !== 'depot' ||
      machines.get(t.truckId)?.kind !== 'truck' ||
      (!t.cargo && (t.outcome !== 'ok' || !world.receipts.some((r) => r.key === t.key)))
    ) {
      throw new Error('Invalid campaign trip.')
    }
  }
  if (
    campaign.version === 3 &&
    campaign.economy.orders.some((o) => o.status === 'accepted' && o.deadline === undefined)
  ) {
    throw new Error('Invalid accepted order without deadline.')
  }
  return campaign
}
function importNotebook(data: Record<string, unknown>): Campaign {
  const campaign = createCampaign()
  if (!record(data.entries)) return campaign
  let selected: string | undefined
  for (const [key, entry] of Object.entries(data.entries)) {
    if (!record(entry) || typeof entry.code !== 'string') continue
    campaign.project.working = { 'main.ts': entry.code }
    snapshotProject(campaign, 'Chapter ' + (Number(key) + 1))
    if (key === String(data.current ?? 0)) selected = entry.code
  }
  campaign.project.working =
    selected !== undefined ? { 'main.ts': selected } : { ...campaign.project.deployed }
  return campaign
}
/** Browser storage and the decision to replace a rejected save belong to the caller. */
export function loadSave(input: unknown): Campaign {
  if (input === null || input === undefined) return createCampaign()
  const data: unknown = typeof input === 'string' ? JSON.parse(input) : JSON.parse(JSON.stringify(input))
  if (!record(data)) throw new Error('Invalid factory save.')
  if (data.version === undefined || data.version === 1) return importNotebook(data)
  if (data.version !== 2 && data.version !== 3)
    throw new Error('Unsupported factory save version: ' + String(data.version))
  if (!save(data) || (data.version === 3 && !gameFields(data)))
    throw new Error('Invalid version ' + data.version + ' factory save.')
  const c = validate(data as unknown as Campaign)
  return data.version === 2 ? migrateEngine(c) : c
}
