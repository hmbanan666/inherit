import { afterEach, expect, test, vi } from 'vitest'
import { usePlaybackClock } from './playback-clock'

afterEach(() => vi.useRealTimers())

test('a pending transfer and the tick deadline keep their remaining time across pause and speed changes', async () => {
  vi.useFakeTimers()
  const clock = usePlaybackClock()
  const transfer = vi.fn()
  const tickEnd = clock.now() + 250
  const playback = clock.waitUntil(tickEnd - 125).then(transfer)
  await vi.advanceTimersByTimeAsync(25)
  clock.paused.value = true
  clock.speed.value = 2
  await vi.advanceTimersByTimeAsync(1000)
  expect(clock.now()).toBe(25)
  clock.paused.value = false
  await vi.advanceTimersByTimeAsync(40)
  expect(transfer).not.toHaveBeenCalled()
  clock.speed.value = 4
  await vi.advanceTimersByTimeAsync(5)
  await playback
  expect(transfer).toHaveBeenCalledOnce()
  expect(tickEnd - clock.now()).toBe(125)
})
