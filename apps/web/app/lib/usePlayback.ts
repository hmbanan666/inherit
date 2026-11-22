import { TICK_MS, type CallRecord, type CampaignWorld } from '@inherit/sim'
import type { usePlaybackClock } from './playback-clock'

export function usePlayback(clock: ReturnType<typeof usePlaybackClock>) {
  const watching = ref(false)
  const call = shallowRef<CallRecord>()
  const line = shallowRef<CallRecord>()
  const place = ref<string>()
  const previousPlace = ref<string>()
  const travel = ref(1)
  const returning = shallowRef<CampaignWorld['hand']>()
  const hand = ref<string | null>(null)
  const stationStatuses = shallowRef(new Map<string, Set<string>>())
  const messages = ref<string[]>([])
  let generation = 0
  function clear() {
    generation++
    watching.value = false
    clock.cancel()
    previousPlace.value = undefined
    travel.value = 1
    stationStatuses.value = new Map()
    call.value = undefined
    line.value = undefined
    returning.value = undefined
    place.value = undefined
    messages.value = []
  }
  function travelTo(destination: string | undefined, start: number, end: number) {
    previousPlace.value = place.value
    place.value = destination
    return clock.waitUntil(end, time => {
      travel.value = Math.max(0, Math.min(1, (time - start) / (end - start)))
    })
  }
  async function play(
    calls: CallRecord[],
    mode: 'run' | 'tick' | 'setup',
    held?: CampaignWorld['hand'],
    start = clock.now(),
  ) {
    const watched = mode === 'run'
    if (!watched && !calls.length && !stationStatuses.value.size) {
      line.value = undefined
      return
    }
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
    if (!visible.length) line.value = undefined
    stationStatuses.value = statuses
    // All live calls share one tick. Absolute deadlines prevent per-call timer drift.
    const interval = watched ? 500 : TICK_MS / Math.max(1, visible.length)
    const ticket = generation
    watching.value = watched
    messages.value = []
    hand.value = held?.item ?? null
    if (watched && held) {
      returning.value = held
      await travelTo(held.origin, start, start + interval)
      if (ticket !== generation) return
      hand.value = null
      start += interval * 1.5
      await clock.waitUntil(start)
      if (ticket !== generation) return
      returning.value = undefined
    }
    for (const record of visible) {
      line.value = record
      call.value = record
      const destination = record.fn === 'buy' ? record.args[1] ?? record.args[0] : record.args[0]
      await travelTo(destination, start, start + interval / 2)
      if (ticket !== generation) return
      hand.value = record.hand
      if (record.message && !messages.value.includes(record.message)) messages.value.push(record.message)
      start += interval
      await clock.waitUntil(start)
      if (ticket !== generation) return
    }
    if (mode !== 'tick') line.value = undefined
    watching.value = false
    call.value = undefined
  }
  return { watching, call, line, place, previousPlace, travel, returning, hand, messages, stationStatuses, play, clear }
}
