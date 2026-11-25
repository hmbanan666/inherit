import { expect, test } from 'vitest'
import { cardSide } from './cardPlace'

test.each([
  [300, 1280, 'right'],
  [900, 1280, 'left'],
  [550, 1100, 'left'],
  [300, 1099, 'center'],
  [undefined, 1280, 'center'],
] as const)('a machine at %s in a %ipx viewport opens on the %s', (x, width, side) => {
  expect(cardSide(x, width)).toBe(side)
})
