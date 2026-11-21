import { createCampaign } from './campaign'
import { markMessageRead } from './story'
import { applyChapterHint } from './reference/chapter-one'
import { recording, routes } from './reference/recording'
import { primitiveTick } from './primitives'
import { deployGameProject, type ChapterMachine } from './research'
import type { Campaign } from './model'
import {
  activeRequest,
  debtRemaining,
  enterBeat,
  letter,
  payInstallment,
  settleTown,
  TAB_LETTER,
} from './town'
import { firstIngotAfterRetry, lessons } from './lessons'

export type StepPhase = 'brief' | 'working' | 'solved'
export type Reveal =
  | { kind: 'section'; id: 'town' | 'inbox' | 'orders' }
  | { kind: 'coins' }
  | { kind: 'debt' }
  | { kind: 'letter'; id: string }
export interface LessonStep {
  id: string
  beat: number
  who: string
  title: string
  story: string
  task: string
  idea?: { name: string; explain: string }
  example?: string
  callsToMove?: { name: string; place?: string }[]
  starter?: string
  hints: [idea: string, places: string, lines: string]
  checks: { id: string; text: string }[]
  solved: { reaction: string; did: string; idea: string; reward?: string }
  button: 'run' | 'deploy'
}
export interface CheckView {
  id: string
  text: string
  status: 'red' | 'amber' | 'green'
  progress?: string
}
export interface StepView {
  step: LessonStep
  phase: StepPhase
  checks: CheckView[]
  index: number
  total: number
  nextReveal?: Reveal
}

export interface CallRecord {
  file: string
  line: number
  fn: 'take' | 'put' | 'look' | 'buy' | 'repair'
  args: string[]
  ok: boolean
  result?: unknown
  message?: string
  /** Short machine bubble for a routine outcome on the live clock. */
  floorStatus?: string
  within?: string
  hand: string | null
}

export interface LessonProgress {
  index: number
  phase: StepPhase
  passed: string[]
  queue: Reveal[]
  released: Reveal[]
  firstCartRunEmpty?: boolean
}

export function currentStep(c: Campaign): StepView | undefined {
  const { index, phase, passed, queue } = c.lesson
  let step = lessons[index]
  if (!step) return
  if (step.id === 'bram-cart' && phase === 'solved' && c.lesson.firstCartRunEmpty) {
    step = { ...step, solved: { ...step.solved, idea: firstIngotAfterRetry } }
  }
  const request = activeRequest(c)
  const progress =
    request && deliverySteps.has(step.id) ? c.town.filled + ' / ' + request.quantity : undefined
  return {
    step,
    phase,
    index,
    total: lessons.length,
    nextReveal: queue[0],
    checks: step.checks.map((check) => ({
      ...check,
      text: step.id === 'bram-loop' ? "Ingots in Bram's cart: " + progress : check.text,
      progress,
      status: passed.includes(check.id)
        ? 'green'
        : phase === 'working' && progress && c.town.filled > 0
          ? 'amber'
          : 'red',
    })),
  }
}

const deliverySteps = new Set(['bram-loop', 'elsie-grate', 'tomas-lamps', 'wen-wheel', 'bridge-span'])
const revealsAfter: Record<string, Reveal[]> = {
  'bram-loop': [
    { kind: 'coins' },
    { kind: 'section', id: 'town' },
    { kind: 'section', id: 'inbox' },
    { kind: 'letter', id: 'tab' },
    { kind: 'debt' },
  ],
  'harrow-tab': [{ kind: 'section', id: 'orders' }],
  'elsie-grate': [{ kind: 'letter', id: 'vein' }],
  'tomas-lamps': [{ kind: 'letter', id: 'heat' }],
  'wen-wheel': [{ kind: 'letter', id: 'competition' }],
  'harrow-deed': [{ kind: 'letter', id: 'slow' }],
}

function solved(c: Campaign, step: LessonStep): LessonProgress {
  return {
    ...c.lesson,
    phase: 'solved',
    passed: step.checks.map((check) => check.id),
    queue: structuredClone(revealsAfter[step.id] ?? []),
  }
}

export function updateBankStep(c: Campaign) {
  const step = lessons[c.lesson.index]
  if (c.lesson.phase === 'solved' || !step) return c.lesson
  if (
    (step.id === 'harrow-tab' &&
      (c.town.paid || c.progress.messages.some((m) => m.id === 'tab' && !m.unread))) ||
    (step.id === 'harrow-deed' && !debtRemaining(c))
  )
    return solved(c, step)
  return c.lesson
}

export function beginLessonAttempt(c: Campaign, calls: CallRecord[] = []): LessonProgress {
  if (c.lesson.phase !== 'brief') return c.lesson
  const lesson: LessonProgress = { ...c.lesson, phase: 'working' }
  if (lessons[lesson.index]?.id === 'bram-cart') {
    const pickup = calls.find(call => call.fn === 'take' && call.args[0] === 'furnace')
    if (pickup && !pickup.ok && pickup.hand === null) lesson.firstCartRunEmpty = true
  }
  return lesson
}

/** Only observed floor effects count. A refactor also has to run in the player's named function. */
export function observeLesson(c: Campaign, calls: CallRecord[], logs: string[] = []) {
  const step = lessons[c.lesson.index]
  if (!step || c.lesson.phase !== 'working') return c.lesson
  const machine = (id: string) => c.world.machines.find((m) => m.id === id)
  const ran = (fn: CallRecord['fn'], place: string) =>
    calls.some((r) => r.ok && r.fn === fn && r.args[0] === place)
  function carried(from: string, to: string, within?: string, item?: string) {
    let held: CallRecord | undefined
    for (const call of calls) {
      if (!call.ok) {
        if (!call.hand) held = undefined
        continue
      }
      if (call.fn === 'take') held = call
      if (call.fn === 'put') {
        if (
          held?.args[0] === from &&
          call.args[0] === to &&
          (!item || held.result === item) &&
          (!within || (held.within === within && call.within === within))
        )
          return true
        held = undefined
      }
    }
    return false
  }
  function done() {
    if (deliverySteps.has(step.id)) {
      const filled = c.town.filled === activeRequest(c)?.quantity
      if (!filled) return false
      if (step.id === 'elsie-grate') return carried('press', 'cart', 'ship', 'plate')
      if (step.id === 'tomas-lamps') return carried('copper', 'cutter', 'cutWire', 'copper-ingot')
      return true
    }
    switch (step.id) {
      case 'bram-take':
        return c.world.hand?.origin === 'mine' && ran('take', 'mine')
      case 'bram-feed':
        return carried('mine', 'furnace')
      case 'bram-cart':
        return carried('furnace', 'cart', undefined, 'iron-ingot')
      case 'bram-smelt':
        return carried('mine', 'furnace', 'smelt')
      case 'bram-ship':
        return carried('furnace', 'cart', 'ship', 'iron-ingot')
      case 'elsie-press':
        return !!machine('press')
      case 'elsie-stamp':
        return carried('furnace', 'press', 'stamp', 'iron-ingot')
      case 'elsie-load':
        return carried('press', 'cart', undefined, 'plate')
      case 'vein-sample':
        return logs.some(line => /\bcopper-ore\b/.test(line)) && calls.some((r) => r.fn === 'take' && r.result === 'copper-ore')
      case 'vein-furnace':
        return machine('copper')?.kind === 'furnace'
      case 'vein-clear':
        return carried('furnace', 'copper', undefined, 'copper-ore')
      case 'tomas-cutter':
        return !!machine('cutter')
      case 'tomas-draw':
        return carried('copper', 'cutter', undefined, 'copper-ingot')
      case 'tomas-collect':
        return carried('cutter', 'cart', undefined, 'wire')
      case 'heat-inspect':
        return logs.some(line => /\bbroken\b/.test(line)) && calls.some(r =>
          r.fn === 'look' && r.args[0] === 'furnace' && (r.result as {status?: string})?.status === 'broken')
      case 'heat-restart':
        return ran('repair', 'furnace')
      case 'heat-rounds':
        return ran('look', 'furnace') && ran('look', 'copper') && ran('repair', 'copper')
      case 'heat-crew':
        return ['furnace', 'copper'].every((place) =>
          calls.some((r) => r.fn === 'look' && r.args[0] === place && r.within === 'fixBroken'),
        )
      case 'wen-move':
        return carried('furnace', 'press', 'move', 'iron-ingot')
      case 'wen-cutter':
        return machine('gears')?.kind === 'cutter'
      case 'wen-gears':
        return !!machine('gears')?.stats.processed
      case 'orders-share':
        return ran('look', 'cart') && ['elsie', 'wen'].every((who) => c.town.competition.includes(who))
      case 'mayor-tools':
        return calls.some((r) => r.ok && r.fn === 'put' && r.file === 'tools.ts')
      case 'bridge-jig':
        return !!machine('assembler')
      case 'bridge-fit':
        return !!machine('assembler')?.stats.processed
    }
  }
  if (step.id === 'vein-sort') {
    const passed = [...c.lesson.passed]
    if (!passed.includes('iron') && carried('mine', 'furnace', undefined, 'iron-ore')) passed.push('iron')
    if (!passed.includes('copper') && carried('mine', 'copper', undefined, 'copper-ore'))
      passed.push('copper')
    return step.checks.every((check) => passed.includes(check.id)) ? solved(c, step) : { ...c.lesson, passed }
  }
  return done() ? solved(c, step) : c.lesson
}

export function continueStep(c: Campaign): Campaign {
  if (c.lesson.phase !== 'solved') return c
  const next = structuredClone(c)
  const flow = next.lesson
  const reveal = flow.queue.shift()
  if (reveal) {
    flow.released.push(reveal)
    if (reveal.kind === 'letter' && reveal.id === 'tab')
      letter(next, 'tab', 'Mrs Harrow', 'Your uncle’s tab', TAB_LETTER)
    if (flow.queue.length) return next
  }
  next.town.solved.push(lessons[flow.index].id)
  const step = lessons[++flow.index]
  delete flow.firstCartRunEmpty
  flow.phase = 'brief'
  flow.passed = []
  const beat = step?.beat ?? 11
  if (next.town.beat !== beat) enterBeat(next, beat)
  if (step?.id === 'bram-loop') {
    // Bram takes the practice samples home before he orders the production load.
    delete next.town.waiting['iron-ingot']
  }
  const broken = step?.id === 'heat-inspect' ? 'furnace' : step?.id === 'heat-rounds' ? 'copper' : undefined
  if (broken) {
    const oven = next.world.machines.find((m) => m.id === broken)!
    oven.fault = 'broken'
    delete oven.coolAt
  }
  next.lesson = updateBankStep(next)
  return next
}

export function primaryButton(c: Campaign): 'run' | 'deploy' {
  return lessons[c.lesson.index]?.button ?? 'deploy'
}

export function placeNames(c: Campaign): string[] {
  return [...new Set([...c.world.machines.map((m) => m.id), 'mine', 'cart'])]
}

export function revealed(c: Campaign): Reveal[] {
  return structuredClone(c.lesson.released)
}

/** Rebuild a real reference checkpoint synchronously for the development step selector. */
export function jumpToStep(c: Campaign, id: string): Campaign {
  const index = lessons.findIndex((step) => step.id === id)
  if (index < 0) return c
  let checkpoint = createCampaign(1)
  for (const step of lessons.slice(0, index)) {
    checkpoint.project.working = applyChapterHint(checkpoint.project.working, step)
    if (step.id === 'harrow-tab') markMessageRead(checkpoint, 'tab')
    else if (step.id === 'harrow-deed') payInstallment(checkpoint, true)
    else {
      let mode: 'run' | 'deploy' | 'tick' = step.button
      if (mode === 'deploy') deployGameProject(checkpoint)
      for (const [count, route] of recording[step.id]) {
        for (let n = 0; n < count; n++) {
          const frame = primitiveTick(checkpoint, mode)
          for (const command of routes[route].split('; ')) {
            const [fn, place, name] = command.split(' ')
            if (fn === 'buy') frame.api.buy(place as ChapterMachine, name)
            else if (fn === 'take' || fn === 'put' || fn === 'repair') frame.api[fn](place)
          }
          frame.finish()
          if (mode === 'tick') settleTown(checkpoint, true)
          if (mode === 'deploy') mode = 'tick'
        }
      }
      checkpoint.lesson = solved(checkpoint, step)
    }
    do {
      checkpoint = continueStep(checkpoint)
    } while (checkpoint.lesson.phase === 'solved' && checkpoint.lesson.index < index)
  }
  return checkpoint
}
