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
    idea: brief.practice,
    task: { condition: brief.condition, examples: brief.examples },
    theory: { title: brief.title, body: brief.body, example: brief.example },
    starter: () => mainFile(brief.todo.map(note => '// TODO: ' + note).join('\n') + '\n'),
    hints: brief.hints,
    checks: brief.checks.map((label, index) => ({
      id: id + '-' + (index + 1),
      label,
      input: shown.name,
      evaluate: evidence => passes(evidence, index),
    })),
    referenceSolution: { 'main.ts': solutions[id] },
    visibleEffect: { description: brief.goal, testId: 'result-' + station, text },
    solved: { reaction: 'Batch checked', did: brief.goal, idea: brief.practice + '.' },
    enter(world: Floor) { Object.assign(world, createFloor(id, shown)) },
    variants: hidden.map(input => ({ input: input.name, world: () => createFloor(id, input) })),
    ticks: shown.turns?.length,
  } satisfies Lesson<Floor>
})
