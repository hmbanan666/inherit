import { mainFile, type Check, type Evidence, type Lesson } from '../../framework/pack'
import { units } from './map'
import { inputCards } from './inputs'
import type { PlayerAPI } from './player'
import { initialWorld, type Fixture, type Prop, type Scene, type Village } from './world'

type Seen = Evidence<Village>

export function calls(e: Seen, operation: keyof PlayerAPI) {
  return e.calls.filter(call => call.name === operation)
}

export function same(actual: unknown, expected: unknown) {
  return JSON.stringify(actual) === JSON.stringify(expected)
}

export function sameHelper(e: Seen, first: keyof PlayerAPI, second: keyof PlayerAPI) {
  const actions = e.calls.filter(call => call.name === first || call.name === second)
  return actions.length === 2 && !!actions[0].within && actions[0].within === actions[1].within
}

export function check(
  label: string,
  passes: (e: Seen) => boolean,
  appliesTo: (entry: Readonly<Village>) => boolean = () => true,
  reason?: Check<Village>['reason'],
): Check<Village> {
  return {
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
    label, reason,
    evaluate: evidence => !appliesTo(evidence.before) || passes(evidence) ? 'green' : 'red',
  }
}

interface Unit {
  id: string
  title: string
  landmark: string
}

interface Page {
  id: string
  steps?: string[]
  slot?: { line: number; column: number; placeholder: string }
  readyPattern?: RegExp
  focus?: string
  kind: 'write' | 'fill' | 'fix' | 'predict'
  goal: string
  scene: Scene
  cue: string
  reason: string
  introduces?: (keyof PlayerAPI)[]
  theory: { title: string; body: string[]; example: string }
  prediction?: { question: string; choices: string[]; answer: string }
  starter: string
  reference: string
  hints: string[]
  checks: Check<Village>[]
  fixture?: Fixture
  variants?: { input: string; fixture: Fixture }[]
  solved: { reaction: string; did: string }
  effect: [Prop, string]
}

function lessonFor(unit: Unit, lessonIds: string[], page: Page) {
  const { id, kind, goal, scene, theory, prediction, checks, hints } = page
  const [prop, text] = page.effect
  const editLine = page.starter.split('\n').findIndex(line => line.includes('// TODO:')) + 2

  const variants = (page.variants ?? []).map(({ input, fixture }) => ({
    input,
    enter: (world: Village) => { Object.assign(world, structuredClone(fixture)) },
  }))

  return {
    id,
    kind, steps: page.steps, focus: page.focus, readyPattern: page.readyPattern,
    unit: unit.id,
    goal,
    scene,
    theory,
    prediction,
    checks,
    hints,
    task: { condition: page.reason, examples: [] },
    introduces: page.introduces ?? [],
    variants,
    inputs: inputCards,
    idea: theory.title,
    mode: 'run' as const,
    starter: () => {
      const starter = mainFile(page.starter, page.slot?.line ?? editLine)
      if (page.slot) {
        starter.edit.column = page.slot.column
        starter.placeholder = page.slot.placeholder
      }
      return starter
    },
    referenceSolution: { 'main.ts': page.reference },
    visibleEffect: { testId: prop, text, description: page.reason },
    solved: {
      ...page.solved,
      idea: theory.title,
    },
    enter(world: Village) {
      Object.assign(world, initialWorld(), {
        unit: { id: unit.id, landmark: unit.landmark, lessonIds },
        lessonId: id,
        scene,
        prop,
        cue: page.cue,
        reason: page.reason,
      }, structuredClone(page.fixture ?? {}))
    },
  } satisfies Lesson<Village> & Record<string, unknown>
}

export function courseUnit(unitId: string, pages: Page[]) {
  const unit = units.find(unit => unit.id === unitId)
  if (!unit) throw new Error('Unknown course unit: ' + unitId)
  const lessonIds = pages.map(page => page.id)
  return { unit, lessons: pages.map(page => lessonFor(unit, lessonIds, page)) }
}
