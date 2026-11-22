import type { PackManifest } from '../../framework/pack'
export default {
  track: 'course',
  units: [
    { id: 'gate', title: 'At the gate', landmark: 'Welcome flag' },
    { id: 'cottage', title: 'Around the cottage', landmark: 'Ribbon windows' },
    { id: 'fair', title: 'Village fair', landmark: 'Fair stalls' },
  ],
  id: 'beginner', title: 'Village at Dawn', tagline: 'Wake a sleepy village, one line at a time.',
  level: 'Beginner', genre: 'Village decorating', learningGoals: ['Variables', 'Functions', 'Choices', 'Loops'],
  estimatedMinutes: { min: 30, max: 45 }, cover: 'cover.svg', next: 'workshop', featured: true, showcaseNote: 'Start here',
} satisfies PackManifest
