import { expect, test } from 'vitest'
import { reduceApiBook } from './apiBookState'

test('the API button opens the book, and Escape, the X, and the shade close it', () => {
  expect(reduceApiBook(false, 'api')).toBe(true)
  expect(reduceApiBook(true, 'api')).toBe(true)
  expect(reduceApiBook(true, 'escape')).toBe(false)
  expect(reduceApiBook(true, 'close')).toBe(false)
  expect(reduceApiBook(true, 'shade')).toBe(false)
  expect(reduceApiBook(false, 'escape')).toBe(false)
})
