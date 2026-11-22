import type { PackManifest } from '../../framework/pack'
export default {
  track: 'course',
  units: [
    { id: 'chapter', title: 'The shed', landmark: 'Riverside bridge' },
  ],
  id: 'workshop', title: 'Uncle’s Workshop', tagline: 'Bring the forge back to life and build a bridge for Kettlewick.',
  level: 'Game', genre: 'Factory automation', learningGoals: ['Functions', 'Automation', 'Modules'],
  estimatedMinutes: { min: 55, max: 70 }, cover: 'cover.svg', showcaseNote: 'After the basics',
} satisfies PackManifest
