import { apiBook, createWorld, factoryBricks, kettlewick, type inspectMachine } from '@inherit/sim/v8'
import type { MachineKind } from './floorPick'

export type InspectView = NonNullable<ReturnType<typeof inspectMachine>>
type Recipe = InspectView['recipes'][number]
type Action = InspectView['actions'][number]
const apiSections = { furnace: 'furnace', depot: 'depot', press: 'press', spare: 'press', lathe: 'lathe', bench: 'bench', drone: 'drone', vein: 'veins' } as const
type SheetKind = MachineKind | 'drone'

function kindOf(id: string): SheetKind {
  if (Object.hasOwn(apiSections, id)) return id as SheetKind
  return id.startsWith('Vein ') ? 'vein' : 'drone'
}

const headings = { state: 'State', recipes: 'Recipes', api: 'Code API', locked: 'Locked' } as const
export const missingLabel = 'Missing'
export const sheetLabels = { intro: 'Call these from your code.', link: 'API', close: 'Esc to close', actions: 'Actions' } as const
export const rowHeight = { heading: 28, intro: 20, meter: 28, fact: 24, progress: 28, recipe: 32, missing: 18, api: 44, locked: 64, gap: 24 } as const
export const headerHeight = 112
export const footerHeight = 48
export const sheetCss = Object.fromEntries(Object.entries({ ...rowHeight, header: headerHeight, footer: footerHeight })
  .map(([name, px]) => [`--sheet-${name}`, `${px}px`]))
export const fitBudget = Math.floor(720 * 0.92) - 44 - 2 * 24 - headerHeight - rowHeight.gap - footerHeight

export function machineStatus(view: InspectView) {
  const task = view.lines.find(line => line.label === 'Task')?.value
  const label = view.progress?.label ?? (task && !/^(idle|none)$/i.test(task) ? task : undefined)
  return label ? { label, tone: 'working' } : { label: 'Idle', tone: 'idle' }
}

const palette: Record<string, string> = {
  ore: '#99b3bf', coal: '#84858e', ingot: '#b4c9c7', steel: '#8eafc7', grate: '#99a78d', plate: '#c1b29a',
  blank: '#a4aabf', gear: '#c7a373', pin: '#d7c18d', hinge: '#99b4a5', shutter: '#a6a3b9', crate: '#c6ae7a',
  cargo: '#b6a484', cut: '#aab8b2', winch: '#ca995d', lamp: '#e5ca87',
}
const resourceAliases: Record<string, string> = { ingots: 'ingot', load: 'cargo', 'cut plate': 'cut' }
export function resourceColor(label: string) {
  const item = label.toLowerCase().replace(/^hopper /, '')
  const name = Object.hasOwn(resourceAliases, item) ? resourceAliases[item]! : item
  return Object.hasOwn(palette, name) ? palette[name]! : 'var(--sub)'
}

type Chip = { qty?: number; item: string }
export function recipeChips(text: string): Chip[] {
  const chips: Chip[] = []
  for (const part of text.split('+')) {
    const match = /^(\d+)\s+([a-z]+(?:\s+[a-z]+)*)$/i.exec(part.trim())
    if (!match) return [{ item: text }]
    chips.push({ qty: Number(match[1]), item: match[2]! })
  }
  return chips
}

// Only signatures and docs are static. Availability always comes from the live inspection.
const book = apiBook(factoryBricks(kettlewick), createWorld(kettlewick))
const entries = new Map(book.flatMap(section => section.entries.map(entry => [entry.id, entry] as const)))
const furnaceCalls: Record<string, string> = { ingot: 'smelt', steel: 'alloy' }
export function recipeCall(view: InspectView, recipe: Recipe) {
  const id = `${view.id}.${view.id === 'furnace' ? furnaceCalls[recipe.id] : recipe.id}`
  const signature = entries.get(id)?.signature ?? kettlewick.questList?.find(quest => quest.unlock?.brick === id)?.unlock?.signature
  return signature?.split(':', 1)[0]?.trim()
}

function actionLocked(action: Action) {
  return !action.enabled && !!action.reason?.startsWith('Unlocks with ')
}
type Locked = { key: string; kind: 'locked'; label: string; api?: string; input?: Chip[]; output?: Chip[]; unlock: string }
export function lockedEntries(view: InspectView): Locked[] {
  const remaining = new Set(view.actions.filter(actionLocked))
  const locked: Locked[] = []
  for (const recipe of view.recipes) {
    if (!recipe.locked) continue
    const call = recipeCall(view, recipe)
    const action = [...remaining].find(a => recipe.locked!.includes(a.api) || a.api === call)
    if (action) remaining.delete(action)
    const title = recipe.locked.match(/^(.+?) unlocks /)?.[1] ?? action?.reason?.slice('Unlocks with '.length) ?? recipe.locked
    locked.push({ key: `recipe:${recipe.id}`, kind: 'locked', label: action?.label ?? recipe.id,
      api: action?.api ?? call, input: recipeChips(recipe.input), output: recipeChips(recipe.output), unlock: `Unlocks after: ${title}` })
  }
  for (const action of remaining) {
    locked.push({ key: `action:${action.id}`, kind: 'locked', label: action.label, api: action.api,
      unlock: `Unlocks after: ${action.reason!.slice('Unlocks with '.length)}` })
  }
  return locked
}

type Meter = { kind: 'meter' | 'progress'; label: string; value: number; max: number; text: string; color: string; full: boolean }
type Row = { key: string } & (
  | Meter
  | ({ kind: 'fact' } & InspectView['lines'][number])
  | { kind: 'recipe'; input: Chip[]; output: Chip[]; call?: string; missing?: string }
  | { kind: 'api'; api: string; description?: string; ready: boolean; readiness?: string }
  | Locked
)
type Section = { kind: keyof typeof headings; title: string; rows: Row[] }

function section(kind: Section['kind'], rows: Row[]): Section[] {
  return rows.length ? [{ kind, title: headings[kind], rows }] : []
}

export function machineSheet(view: InspectView, kind = kindOf(view.id)) {
  const meters: Row[] = []
  const facts: Row[] = []
  for (const { label, value } of view.lines) {
    const capacity = /^(\d+)\/(\d+)$/.exec(value)
    if (capacity) {
      const count = Number(capacity[1]), max = Number(capacity[2])
      meters.push({ key: label, kind: 'meter', label, value: count, max, text: value, color: resourceColor(label), full: max > 0 && count === max })
    } else facts.push({ key: label, kind: 'fact', label, value })
  }
  const state = [...meters, ...facts]
  if (view.progress) {
    const { label, pct } = view.progress
    state.push({ key: 'progress', kind: 'progress', label, value: pct, max: 100, text: `${Math.round(pct)}%`, color: 'var(--gold)', full: false })
  }
  const recipes = view.recipes.filter(recipe => !recipe.locked).map((recipe): Row => ({
    key: recipe.id, kind: 'recipe', input: recipeChips(recipe.input), output: recipeChips(recipe.output),
    call: recipeCall(view, recipe), missing: recipe.missing,
  }))
  const actions = view.actions.filter(action => !actionLocked(action))
  const api = actions.map((action): Row => {
    const doc = entries.get(action.api.split('(', 1)[0]!)?.doc
    const description = doc?.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? doc ?? action.reason
    return { key: action.id, kind: 'api', api: action.api, description, ready: action.enabled, readiness: action.enabled ? 'Ready' : action.reason }
  })
  return {
    name: view.name, kind: kind === 'drone' ? 'Cart' : kind === 'vein' ? 'Vein' : 'Machine',
    description: view.description, status: machineStatus(view), apiSection: apiSections[kind], actions,
    columns: [
      [...section('state', state), ...section('recipes', recipes)],
      [...section('api', api), ...section('locked', lockedEntries(view))],
    ],
  }
}

type Sheet = ReturnType<typeof machineSheet>
function columnHeight(column: Section[]) {
  let height = Math.max(0, column.length - 1) * rowHeight.gap
  for (const section of column) {
    height += rowHeight.heading
    if (section.kind === 'api') height += rowHeight.intro
    for (const row of section.rows) {
      height += rowHeight[row.kind]
      if (row.kind === 'recipe' && row.missing) height += rowHeight.missing
    }
  }
  return height
}

function balanced(columns: Section[][]) {
  const heights = columns.map(columnHeight)
  return Math.max(...heights) <= 1.6 * Math.min(...heights)
}
export function sheetLayout(sheet: Sheet): 1 | 2 {
  const sections = sheet.columns.flat()
  if (columnHeight(sections) > fitBudget) return 2
  // A small State + API sheet (a vein or cart) can be read straight down.
  return sections.length > 2 && balanced(sheet.columns) ? 2 : 1
}

export function sheetColumns(sheet: Sheet, layout: 1 | 2): Section[][] {
  if (layout === 1) return [sheet.columns.flat()]
  if (balanced(sheet.columns) && sheet.columns.every(c => columnHeight(c) <= fitBudget)) return sheet.columns
  const [left = [], right = []] = sheet.columns
  const [state, ...recipes] = left
  if (state?.kind !== 'state' || state.rows.length < 2) return sheet.columns
  // Keep the recipe and documentation sections intact. Try each break between State rows.
  let best = sheet.columns
  let shortest = Infinity
  for (let cut = 1; cut < state.rows.length; cut++) {
    const columns = [
      [{ ...state, rows: state.rows.slice(0, cut) }, ...recipes],
      [{ ...state, rows: state.rows.slice(cut) }, ...right],
    ]
    const height = Math.max(...columns.map(columnHeight))
    if (height < shortest) { best = columns; shortest = height }
  }
  return best
}

export function sheetHeight(sheet: Sheet, layout: 1 | 2) {
  return Math.max(0, ...sheetColumns(sheet, layout).map(columnHeight))
}
