import { createCampaign, snapshotProject } from './campaign'
import { MACHINES, MATERIALS, RECIPES } from './catalog'
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
  status: one('open', 'accepted', 'done', 'failed'),
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
  version: one(2),
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
  if (data.version !== 2) throw new Error('Unsupported factory save version: ' + String(data.version))
  if (!save(data)) throw new Error('Invalid version 2 factory save.')
  return validate(data as unknown as Campaign)
}
