import { afterEach, expect, test, vi } from 'vitest'
import { dialogClose } from './dialogMotion'

afterEach(() => vi.useRealTimers())

test('the panel exit completes one close even when another request arrives', () => {
  vi.useFakeTimers()
  const close = vi.fn()
  const motion = dialogClose(close)
  motion.requestClose()
  vi.advanceTimersByTime(80)
  motion.requestClose()
  motion.animationEnd('dialog-panel-in')
  expect(motion.closing.value).toBe(true)
  expect(close).not.toHaveBeenCalled()
  motion.animationEnd('dialog-panel-out')
  vi.advanceTimersByTime(300)
  expect(close).toHaveBeenCalledOnce()
})

test('the 200ms fallback survives repeat requests and is cancelled on replacement', () => {
  vi.useFakeTimers()
  const close = vi.fn()
  const motion = dialogClose(close)
  motion.requestClose()
  vi.advanceTimersByTime(199)
  motion.requestClose()
  expect(close).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(close).toHaveBeenCalledOnce()
  motion.reset()
  motion.requestClose()
  motion.reset()
  vi.advanceTimersByTime(250)
  expect(close).toHaveBeenCalledOnce()
  expect(motion.closing.value).toBe(false)
})
