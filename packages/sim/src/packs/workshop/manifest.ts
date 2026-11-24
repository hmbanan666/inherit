import type { PackManifest } from '../../framework/pack'

export default {
  id: 'workshop',
  title: 'Workshop',
  tagline: 'Route, weigh and dispatch parcels on one shed floor. Choose any of twelve challenges.',
  track: 'challenges',
  level: 'Game',
  genre: 'Parcel automation',
  learningGoals: ['Queue operations', 'Stable sorting', 'Stateful controllers'],
  estimatedMinutes: { min: 60, max: 180 },
  cover: 'cover.svg',
  showcaseNote: 'Choose a challenge',
  tryOnce: 'Try',
} satisfies PackManifest
