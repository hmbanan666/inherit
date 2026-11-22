import type { PackManifest } from '../../framework/pack'
export default {
  id: 'beginner', title: 'Village at Dawn', tagline: 'Wake a sleepy village, one line at a time.',
  level: 'Beginner', genre: 'Village decorating', learningGoals: ['Variables', 'Functions', 'Choices', 'Loops'],
  estimatedMinutes: { min: 30, max: 45 }, cover: 'cover.svg', featured: true, showcaseNote: 'Start here',
} satisfies PackManifest
