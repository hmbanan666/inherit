import { mainFile, type Lesson } from '../../framework/pack'
import type { Village } from './world'
export const lessons: Lesson<Village>[] = [{
  id: 'hello', goal: 'Say hello to Mila', idea: 'Call a function with a string.', mode: 'run',
  starter: () => mainFile('// say("...") makes Mila talk.\n// Type say("Hello!") on the blank line below.\n'),
  hints: ['Give Mila a greeting in quotes.', 'say("Hello!")'],
  checks: [{ id: 'hello', label: 'Mila says hello', evaluate: e =>
    e.world.bubble === 'Hello!' && e.calls.some(c => c.name === 'say') ? 'green' : 'red' }],
  referenceSolution: { 'main.ts': 'say("Hello!")' },
  visibleEffect: { description: 'Mila waves and speaks.', testId: 'speech', text: 'Hello!' },
  solved: { reaction: 'Good morning to you too!', did: 'You gave Mila her first words.', idea: 'A function call can carry words in quotes.' },
}]
