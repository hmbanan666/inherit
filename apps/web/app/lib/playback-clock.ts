import { ref, watch } from 'vue'

/** Playback deadlines use simulation milliseconds. Pausing or changing speed preserves elapsed time. */
export function usePlaybackClock(initialSpeed = 1) {
  const paused = ref(false)
  const speed = ref(initialSpeed)
  let elapsed = 0
  let anchor = performance.now()
  let rate = initialSpeed
  let reschedule: (() => void) | undefined
  let cancel: (() => void) | undefined

  function now() {
    return elapsed + (performance.now() - anchor) * rate
  }

  watch([speed, paused], () => {
    elapsed = now()
    anchor = performance.now()
    rate = paused.value ? 0 : speed.value
    reschedule?.()
  }, { flush: 'sync' })

  function waitUntil(deadline: number, paint?: (time: number) => void) {
    return new Promise<void>(resolve => {
      let timer: ReturnType<typeof setTimeout>
      let frame: number | undefined
      function stop() {
        clearTimeout(timer)
        if (frame !== undefined) cancelAnimationFrame(frame)
      }
      function finish() {
        stop()
        cancel = undefined
        reschedule = undefined
        resolve()
      }
      function draw() {
        paint?.(now())
        frame = requestAnimationFrame(draw)
      }
      function schedule() {
        stop()
        const remaining = deadline - now()
        if (remaining <= 0) {
          paint?.(deadline)
          finish()
        } else if (rate > 0) {
          if (paint) draw()
          timer = setTimeout(schedule, Math.ceil(remaining / rate))
        }
      }
      cancel = finish
      reschedule = schedule
      schedule()
    })
  }

  return { speed, paused, now, waitUntil, cancel: () => cancel?.() }
}
