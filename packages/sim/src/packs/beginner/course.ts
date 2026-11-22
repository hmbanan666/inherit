import { mainFile, type Check, type Evidence, type Lesson } from '../../framework/pack'
import type { PlayerAPI } from './player'
import { initialWorld, propText, type Fixture, type Prop, type Scene, type Village } from './world'

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

export function check(label: string, passes: (e: Seen) => boolean): Check<Village> {
  return {
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
    label,
    evaluate: evidence => passes(evidence) ? 'green' : 'red',
  }
}

interface Unit {
  id: string
  title: string
  landmark: string
}

interface Page {
  id: string
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
  effect: [Prop, string]
}

function lessonFor(unit: Unit, page: Page) {
  const { id, kind, goal, scene, theory, prediction, checks, hints } = page
  const [prop, text] = page.effect
  const editLine = page.starter.split('\n').findIndex(line => line.includes('// TODO:')) + 2

  return {
    id,
    kind,
    unit: unit.id,
    goal,
    scene,
    theory,
    prediction,
    checks,
    hints,
    task: { condition: page.reason, examples: [] },
    introduces: page.introduces ?? [],
    variants: page.variants ?? [],
    idea: theory.title,
    mode: 'run' as const,
    starter: () => mainFile(page.starter, editLine),
    referenceSolution: { 'main.ts': page.reference },
    visibleEffect: { testId: prop, text, description: page.reason },
    solved: {
      reaction: page.cue,
      did: checks.at(-1)!.label,
      idea: theory.title,
    },
    enter(world: Village) {
      const album = world.album
      if (world.lessonId) album[world.lessonId] = propText(world, world.prop)
      Object.assign(world, initialWorld(), {
        album,
        lessonId: id,
        scene,
        prop,
        cue: page.cue,
        reason: page.reason,
      }, structuredClone(page.fixture ?? {}))
    },
  } satisfies Lesson<Village> & Record<string, unknown>
}

export function courseUnit(unit: Unit, pages: Page[]) {
  return { unit, lessons: pages.map(page => lessonFor(unit, page)) }
}
