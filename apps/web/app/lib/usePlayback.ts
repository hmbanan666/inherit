import { TICK_MS, type CallRecord } from '@inherit/sim'

export function usePlayback() {
  const watching = ref(false)
  const call = shallowRef<CallRecord>()
  const last = shallowRef<CallRecord>()
  const hand = ref<string | null>(null)
  const stationStatuses = shallowRef(new Map<string, Set<string>>())
  const messages = ref<string[]>([])
  let finishWait: (() => void) | undefined
  let generation = 0
  function clear() {
    generation++
    watching.value = false
    finishWait?.()
    stationStatuses.value = new Map()
    call.value = last.value = undefined
    messages.value = []
  }
  function wait(ms: number) {
    return new Promise<void>(resolve => {
      const timer = setTimeout(resolve, ms)
      finishWait = () => { clearTimeout(timer); resolve() }
    })
  }
  async function play(calls: CallRecord[], mode: 'run' | 'tick' | 'setup', speed: number) {
    const watched = mode === 'run'
    if (!calls.length && !watched && !stationStatuses.value.size) return
    const statuses = new Map<string, Set<string>>()
    const visible: CallRecord[] = []
    for (const record of calls) {
      if (mode === 'tick' && record.floorStatus) {
        const place = record.args[0]!
        const atPlace = statuses.get(place) ?? new Set<string>()
        atPlace.add(record.floorStatus)
        statuses.set(place, atPlace)
      } else visible.push(record)
    }
    stationStatuses.value = statuses
    const interval = (watched ? 500 : TICK_MS / (2 * Math.max(1, visible.length))) / speed
    const ticket = generation
    watching.value = watched
    if (watched) hand.value = null
    messages.value = []
    for (const record of visible) {
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
  return { watching, call, last, hand, messages, stationStatuses, play, clear }
}
