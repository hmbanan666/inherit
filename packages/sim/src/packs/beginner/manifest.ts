import type { PackManifest } from '../../framework/pack'

import { units } from './map'

export default {
  units,
  id: 'beginner',
  title: 'TypeScript from zero',
  tagline: 'Give Mila her first words. Build a village fair from a ledger of bookings.',
  level: 'Beginner',
  track: 'course',
  genre: 'Village puzzles',
  learningGoals: ['Values and types', 'Conditions', 'Arrays and loops', 'Functions', 'Interfaces'],
  estimatedMinutes: { min: 200, max: 230 },
  cover: 'cover.svg',
  next: 'workshop',
  featured: true,
  showcaseNote: 'Start here',
} satisfies PackManifest
