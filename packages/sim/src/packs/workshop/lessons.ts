import { mainFile, type Lesson } from '../../framework/pack'
import { briefs } from './briefs'
import { passes } from './checks'
import { inputs, type ChallengeId } from './fixtures'
import { createFloor, type Floor } from './floor'
import { solutions } from './solutions'

export const lessons = (Object.keys(briefs) as ChallengeId[]).map(id => {
  const brief = briefs[id]
  const [shown, ...hidden] = inputs(id)
  const [station, text] = brief.effect
  return {
    id,
    kind: 'write',
    scene: 'parcel-floor',
    mode: shown.turns ? 'deploy' : 'run',
    goal: brief.goal,
    steps: brief.steps,
    focus: id === 'dispatch-batch' ? 'cart' : undefined,
    readyPattern: id === 'dispatch-batch' ? /^(?=[\s\S]*\btake\s*\()(?=[\s\S]*\bput\s*\()/ : undefined,
    idea: brief.practice,
    task: { condition: brief.condition, examples: brief.examples },
    theory: { title: brief.title, body: brief.body, example: brief.example },
    starter: () => ({
      ...mainFile(brief.todo.map(note => (brief.steps ? '// ' : '// TODO: ') + note).join('\n') + '\n'),
      placeholder: brief.placeholder,
    }),
    hints: brief.hints,
    checks: brief.checks.map((label, index) => ({
      id: id + '-' + (index + 1),
      label,
      reason: id === 'dispatch-batch' ? ({ world }) => {
        if (index === 0) return 'The cart holds ' + (world.queues.cart.map(p => p.id).join(', ') || 'no parcels') + ' and needs the full batch in arrival order.'
        if (index === 1) return 'The arm is still holding ' + world.hand?.id + '.'
        return 'Stop just after trying to lift from the empty belt.'
      } : undefined,
      evaluate: evidence => passes(evidence, index),
    })),
    referenceSolution: { 'main.ts': solutions[id] },
    visibleEffect: { description: brief.goal, testId: 'result-' + station, text },
    solved: { reaction: 'Batch checked', did: id === 'dispatch-batch' ? 'Your loop kept delivering parcels until the belt was empty.' : brief.goal, idea: brief.practice + '.' },
    enter(world: Floor) { Object.assign(world, createFloor(id, shown)) },
    variants: hidden.map(fixture => ({
      input: fixture.name,
      enter(world: Floor) { Object.assign(world, createFloor(id, fixture)) },
      maxTicks: fixture.turns?.length,
    })),
  } satisfies Lesson<Floor>
})
