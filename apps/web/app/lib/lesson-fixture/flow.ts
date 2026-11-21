// TEMPORARY Bram fixture for the web worktree. Never a second source of chapter rules.
import { createCampaign, loadSave, isStarterProject, snapshotProject, getSurface, type ApiEntry, type Campaign } from '@inherit/sim'
import { beforeStep, bram, starter } from './bram'
import type { CallRecord, Reveal, StepView, StepPhase } from './types'

const reveals: Reveal[] = [{ kind: 'coins' }, { kind: 'section', id: 'town' }, { kind: 'letter', id: 'tab' }, { kind: 'debt' }]
const interludes = [
  ['Bram paid for his iron.', 'The coin purse holds your first payment.'],
  ['The forge is lit again.', 'Visit Town to see Bram’s forge.'],
  ['Mrs Harrow sent a letter.', 'Open Inbox to read her news.'],
]
interface Fixture { index: number; phase: StepPhase; hand: string | null; deliveries: number; reveals: number; mayor: boolean }
function fixture(c: Campaign): Fixture {
  return (c as Campaign & { bramFixture: Fixture }).bramFixture
}
export function loadChapter(input?: unknown): Campaign {
  const old = loadSave(input)
  if (fixture(old) && Number.isInteger(fixture(old).index)) return old
  const c = createCampaign()
  if (!isStarterProject(old.project.working)) snapshotProject(old, 'Previous chapter code')
  for (const revision of old.project.history.slice(1)) {
    old.project.snapshots.push({ ...revision, name: 'Previous · ' + revision.name })
  }
  c.project.snapshots = old.project.snapshots
  c.project.nextRevision = old.project.nextRevision
  c.project.working = { 'main.ts': starter }
  c.project.deployed = { ...c.project.working }
  c.project.history[0]!.files = { ...c.project.working }
  c.seenSections = ['factory']
  Object.assign(c, { bramFixture: { index: 0, phase: 'brief', hand: null, deliveries: 0, reveals: 0, mayor: false } })
  return c
}
export function jumpToStep(c: Campaign, id: string): Campaign {
  const mayor = id === 'mayor-tools'
  const index = mayor ? 5 : bram.findIndex(s => s.id === id)
  if (index < 0) return c
  c = loadChapter()
  Object.assign(fixture(c), { index, mayor, deliveries: index > 2 ? 1 : 0, reveals: mayor ? 4 : 0 })
  c.project.working['main.ts'] = starter + beforeStep[index]
  const furnace = c.world.machines.find(m => m.id === 'furnace')!
  if (index >= 2 && index < 5) furnace.output = { kind: 'iron-ingot' }
  if (index === 5) furnace.batchTicks = 47
  if (mayor) c.town.beat = 9
  return c
}
export function currentStep(c: Campaign): StepView | undefined {
  const f = fixture(c)
  const step = bram[f.index]
  if (!step) return
  const progress = f.index === 5 ? f.deliveries + ' / 3' : undefined
  const after = interludes[f.reveals - 1]
  return {
    step: f.mayor ? { ...step, who: 'odile', title: 'Organise your tools', story: 'Your tools could use a file of their own.', task: 'Move your functions into tools.ts.', idea: undefined } :
      after ? { ...step, story: after[0]!, solved: { did: after[0]!, idea: after[1]! } } : step,
    phase: f.phase, index: f.index, total: bram.length,
    checks: step.checks.map(check => ({ ...check, progress, status: f.phase === 'solved' ? 'green' : progress && f.deliveries ? 'amber' : 'red' })),
    nextReveal: f.index === 5 ? reveals[f.reveals] : undefined,
  }
}
export const primaryButton = (c: Campaign) => currentStep(c)?.step.button ?? 'deploy'
export const placeNames = (c: Campaign) => c.world.machines.map(m => m.id)
export const revealed = (c: Campaign) => reveals.slice(0, fixture(c).reveals)
export const heldItem = (c: Campaign) => fixture(c).hand
export const setHand = (c: Campaign, item: string | null) => { fixture(c).hand = item }
export function continueStep(c: Campaign): Campaign {
  const f = fixture(c)
  if (f.phase !== 'solved') return c
  if (f.index < 5) {
    f.index++
    f.phase = 'brief'
    if (f.index === 5) c.world.machines.find(m => m.id === 'furnace')!.batchTicks = 47
  }
  else if (f.reveals < reveals.length) {
    f.reveals++
    if (f.reveals === reveals.length) f.index++
  }
  return c
}
export function finishCalls(c: Campaign, calls: CallRecord[], deliveredIngots: number, automated: boolean) {
  const f = fixture(c)
  if (f.phase === 'solved' || f.mayor) return
  const success = (fn: string, place: string, within?: string) => calls.some(r => r.ok && r.fn === fn && r.args[0] === place && (!within || r.within === within))
  const shipped = deliveredIngots > 0
  if (shipped && (f.index === 2 || (f.index === 5 && automated))) f.deliveries = Math.min(3, f.deliveries + deliveredIngots)
  const solved = [
    f.hand === 'iron-ore' && success('take', 'mine'), success('put', 'furnace'), shipped,
    success('take', 'mine', 'smelt') && success('put', 'furnace', 'smelt'), shipped && success('take', 'furnace', 'ship') && success('put', 'cart', 'ship'), automated && f.deliveries === 3,
  ][f.index]
  f.phase = solved ? 'solved' : 'working'
  if (solved && f.index === 5) {
    c.town.beat = 2
    c.economy.money += 64
    c.town.changes.push({ buildingId: 'forge', tick: c.world.tick, text: 'Bram lights his forge.' })
    c.progress.messages.push({ id: 'tab', kind: 'email', tick: c.world.tick, from: 'Mrs Harrow', title: 'The family tab', body: 'Your uncle left a tab with the bank. Pay when you are ready.', unread: true })
  }
}
export function chapterSurface(c: Campaign) {
  return { ...getSurface(c), multiFile: c.town.beat >= 9 || Object.keys(c.project.working).length > 1 }
}
export function chapterReference(_campaign: Campaign): ApiEntry[] {
  return [
    { name: 'take', signature: 'take(place: Place): string | undefined', description: 'Lift a ready item into the arm’s empty hand.', example: 'take("mine")' },
    { name: 'put', signature: 'put(place: Place): boolean', description: 'Set the item in the arm’s hand down at a place.', example: 'put("furnace")' },
  ]
}
export function chapterDeclarations(c: Campaign) {
  return 'declare module "inherit" {\n type Place = ' + placeNames(c).map(p => JSON.stringify(p)).join(' | ') + '\n' +
    chapterReference(c).map(r => ' export function ' + r.signature).join('\n') + '\n}\ndeclare const console: { log(...args: unknown[]): void }'
}
