import type { CallRecord } from '@inherit/sim'

export function usePlayback() {
  const watching = ref(false)
  const call = shallowRef<CallRecord>()
  const last = shallowRef<CallRecord>()
  const hand = ref<string | null>(null)
  const messages = ref<string[]>([])
  let finishWait: (() => void) | undefined
  let generation = 0
  function clear() {
    generation++
    watching.value = false
    finishWait?.()
    call.value = last.value = undefined
    messages.value = []
  }
  function wait(ms: number) {
    return new Promise<void>(resolve => {
      const timer = setTimeout(resolve, ms)
      finishWait = () => { clearTimeout(timer); resolve() }
    })
  }
  async function play(calls: CallRecord[], interval: number, watched: boolean) {
    const ticket = generation
    watching.value = watched
    if (watched) hand.value = null
    messages.value = []
    for (const record of calls) {
      call.value = last.value = record
      // A watched call has two visible moments: reach the place, then lift or release.
      if (watched) {
        await wait(interval / 2)
        if (ticket !== generation) return
      }
      hand.value = record.hand
      if (record.message && !messages.value.includes(record.message)) messages.value.push(record.message)
      await wait(watched ? interval / 2 : interval)
      if (ticket !== generation) return
    }
    finishWait = undefined
    watching.value = false
    call.value = undefined
  }
  return { watching, call, last, hand, messages, play, clear }
}
