import { createCampaign, snapshotProject } from './campaign'
import { COMPETITION_LETTER, INSTALLMENTS, TAB_LETTER } from './town'
import { MACHINES, MATERIALS, RECIPES } from './catalog'
import type { Campaign, ProjectFiles } from './model'

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
  fault: opt(one('broken', 'jammed')),
  heatLimit: opt(count),
  heat: opt(count),
  coolAt: opt(count),
  repairing: opt(one(true)),
  recipe: opt(recipe),
  remaining: count,
  output: opt(shape(item)),
  stats: shape({ processed: count, rate: count, activeTicks: count, idleTicks: count, blockedTicks: count }),
  lastInput: opt(str),
  recentProduction: list(count),
  builtByCode: opt(one(true)),
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
      builtByCode: opt(one(true)),
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
  version: one(4),
  town: shape({
    beat: one(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
    entered: count,
    filled: count,
    paid: count,
    payments: one(0, 1, 2, 3),
    competition: list(str),
    nextOrders: dict(count),
    changes: list(
      shape({
        tick: count,
        buildingId: one('forge', 'bank', 'bakery', 'mill', 'lamp-street', 'bridge', 'town-hall', 'riverside'),
        text: str,
      }),
    ),
  }),
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
    orders: list(shape({ line: str, filled: totals })),
  }),
})

function validate(campaign: Campaign) {
  const world = campaign.world
  const machines = new Map(world.machines.map((machine) => [machine.id, machine]))
  const sites = new Set(world.sites.map((s) => s.id))
  if (
    machines.size !== world.machines.length ||
    sites.size !== world.sites.length ||
    !sites.has('shed') ||
    world.machines.some(
      (machine) =>
        !sites.has(machine.siteId) ||
        machine.builtAt > world.tick ||
        (machine.fault === 'broken' && machine.coolAt === undefined) ||
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

function restoreTown(c: Campaign) {
  const town = c.town as Campaign['town'] & { due?: number; interest?: boolean[]; installments?: number[] }
  if ('interest' in town || 'installments' in town || 'due' in town) {
    const principalPaid = INSTALLMENTS.slice(0, town.payments).reduce((sum, amount) => sum + amount, 0)
    c.economy.money += Math.max(0, town.paid - principalPaid)
    town.paid = principalPaid
    delete town.installments
    delete town.interest
    delete town.due
    c.progress.messages = c.progress.messages.filter((m) => !m.id.startsWith('interest-'))
    for (const m of c.progress.messages) {
      if (m.id === 'tab') m.body = TAB_LETTER
      if (m.id === 'competition') m.body = COMPETITION_LETTER
    }
  }
  for (const order of c.economy.orders) {
    // Freight tickets belong to the older order board and keep their pickup windows.
    if (order.id.startsWith('ticket-')) continue
    delete order.deadline
    delete order.duration
  }
  return c
}

function archiveLegacy(data: Record<string, unknown>) {
  const c = createCampaign()
  function archive(name: string, old: unknown) {
    if (!record(old) || !Object.keys(old).length || !files(old)) return
    c.project.working = old as ProjectFiles
    snapshotProject(c, name)
  }
  if (record(data.project)) {
    const { working, deployed, snapshots, history } = data.project
    archive('v2 code', record(working) && Object.keys(working).length ? working : deployed)
    if (JSON.stringify(working) !== JSON.stringify(deployed)) archive('v2 deployed', deployed)
    for (const group of [snapshots, history]) {
      if (Array.isArray(group))
        for (const rev of group) {
          if (record(rev) && typeof rev.name === 'string') archive('v2 · ' + rev.name, rev.files)
        }
    }
  } else if (record(data.entries)) {
    for (const [key, entry] of Object.entries(data.entries)) {
      if (record(entry) && typeof entry.code === 'string')
        archive(key === String(data.current ?? 0) ? 'v2 code' : 'Chapter ' + (Number(key) + 1), {
          'main.ts': entry.code,
        })
    }
  }
  c.project.working = { ...c.project.deployed }
  return c
}
export function loadSave(input: unknown): Campaign {
  try {
    const data: unknown = typeof input === 'string' ? JSON.parse(input) : structuredClone(input)
    if (!record(data)) return createCampaign()
    if (data.version === undefined || data.version === 1 || data.version === 2 || data.version === 3)
      return archiveLegacy(data)
    if (save(data) && gameFields(data)) return restoreTown(validate(data as unknown as Campaign))
  } catch {
    /* An incomplete write starts a fresh shift. */
  }
  return createCampaign()
}
