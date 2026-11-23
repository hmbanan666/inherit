import { expect, test } from 'vitest'
import { rankApiSuggestions } from './editor'

test('sa ranks say before satisfies and globals while keeping the other suggestions in order', () => {
  const items = [
    { label: 'satisfies', sortText: '15' },
    { label: 'SharedArrayBuffer', sortText: '15' },
    { label: 'say', sortText: '16' },
  ]
  rankApiSuggestions(items, new Set(['say']))
  expect(items.sort((a, b) => a.sortText.localeCompare(b.sortText)).map(i => i.label))
    .toEqual(['say', 'satisfies', 'SharedArrayBuffer'])
})
