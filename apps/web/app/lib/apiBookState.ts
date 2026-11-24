export type ApiBookEvent = 'api' | 'escape' | 'close' | 'shade'

/** The API button opens the book. Escape, the X, and the shade close it. */
export function reduceApiBook(open: boolean, event: ApiBookEvent) {
  if (event === 'api') return true
  return false
}
