import type { inspectMachine } from '@inherit/sim/v8'
import { Cog, Flame, Hammer, Mountain, Stamp, Truck, Warehouse } from '@lucide/vue'
import type { MachineKind } from './floorPick'

export type InspectView = NonNullable<ReturnType<typeof inspectMachine>>
type SheetKind = MachineKind | 'drone'
const icons = { furnace: Flame, depot: Warehouse, press: Stamp, spare: Stamp, lathe: Cog, bench: Hammer, drone: Truck, vein: Mountain } satisfies Record<SheetKind, unknown>

function kindOf(id: string): SheetKind {
  if (Object.hasOwn(icons, id)) return id as SheetKind
  return id.startsWith('Vein ') ? 'vein' : 'drone'
}

const headings = { state: 'State', recipes: 'Recipes', api: 'Code API', locked: 'Locked' } as const
export const missingLabel = 'Missing'
export const rowHeight = { heading: 18, meter: 22, fact: 20, recipe: 20, api: 40, locked: 36, progress: 22, gap: 8 } as const
export const sheetCss = Object.fromEntries(Object.entries(rowHeight).map(([name, px]) => [`--sheet-${name}`, `${px}px`]))
export const fitBudget = 464

type Meter = { kind: 'meter' | 'progress'; label: string; value: number; max: number; text: string }
type Row = { key: string } & (
  | Meter
  | ({ kind: 'fact' } & InspectView['lines'][number])
  | { kind: 'recipe'; recipe: InspectView['recipes'][number] }
  | { kind: 'api'; action: InspectView['actions'][number]; disabled: boolean }
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
    if (capacity) meters.push({ key: label, kind: 'meter', label, value: Number(capacity[1]), max: Number(capacity[2]), text: value })
    else facts.push({ key: label, kind: 'fact', label, value })
  }
  const state = [...meters, ...facts]
  if (view.progress) {
    const { label, pct } = view.progress
    state.push({ key: 'progress', kind: 'progress', label, value: pct, max: 100, text: `${Math.round(pct)}%` })
  }

  const recipes: Row[] = [], api: Row[] = [], locked: Row[] = []
  for (const recipe of view.recipes) {
    const rows = recipe.locked ? locked : recipes
    rows.push({ key: `recipe:${recipe.id}`, kind: 'recipe', recipe })
  }
  for (const action of view.actions) {
    const rows = !action.enabled && action.reason?.startsWith('Unlocks') ? locked : api
    rows.push({ key: `action:${action.id}`, kind: 'api', action, disabled: !action.enabled })
  }
  return {
    name: view.name, description: view.description, icon: icons[kind],
    columns: [
      [...section('state', state), ...section('recipes', recipes)],
      [...section('api', api), ...section('locked', locked)],
    ].filter(column => column.length),
  }
}

export function sheetHeight(sheet: ReturnType<typeof machineSheet>, columns: 1 | 2) {
  const layout = columns === 1 ? [sheet.columns.flat()] : sheet.columns
  return Math.max(0, ...layout.map(column => {
    let height = Math.max(0, column.length - 1) * rowHeight.gap
    for (const section of column) {
      height += rowHeight.heading
      let meters = 0
      for (const row of section.rows) {
        if (row.kind === 'meter') meters++
        else height += section.kind === 'locked' ? rowHeight.locked : rowHeight[row.kind]
      }
      height += Math.ceil(meters / 2) * rowHeight.meter
    }
    return height
  }))
}
