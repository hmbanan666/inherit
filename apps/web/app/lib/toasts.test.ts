import { questList } from '@inherit/sim/v8'
import { expect, test } from 'vitest'
import type { GameEvent } from './worldEvents'
import { dismissToast, emptyToasts, expireToasts, holdToasts, pushToasts } from './toasts'

function event(key: string): GameEvent {
  return { kind: 'event', icon: 'coins', key, text: key }
}

test('a repeated key is admitted once, including after expiry', () => {
  const seen = new Set<string>()
  const one = event('handed:odile')
  const list = pushToasts(emptyToasts(), [one, one], 100, seen)
  expect(list.visible.map(toast => toast.key)).toEqual([one.key])
  expect(list.pending).toEqual([])
  const empty = expireToasts(list, 4100)
  expect(pushToasts(empty, [one], 4200, seen).visible).toEqual([])
})

const odile = questList.find(quest => quest.id === 'odile')!
const change: GameEvent = {
  kind: 'npc', who: odile.who, name: odile.from, text: odile.change, key: 'change:odile',
}
const handOver = [event('handed:odile'), change, event('level:4'), event('machine:press'), event('drone:drone-2')]
const keys = (toasts: readonly GameEvent[]) => toasts.map(toast => toast.key)

test('urgent replacement dismisses the oldest of three visible toasts', () => {
  const seen = new Set<string>()
  const first = pushToasts(emptyToasts(), handOver.slice(0, 3), 0, seen)
  const urgent = pushToasts(first, [handOver[3]!], 100, seen, 'urgent')
  expect(keys(urgent.visible)).toEqual(keys(handOver.slice(1, 4)))
  expect(urgent.pending).toEqual([])
})

test('a five-event hand-over admits two queued events in order with their full reading time', () => {
  const list = pushToasts(emptyToasts(), handOver, 100, new Set())
  expect(keys(list.visible)).toEqual(keys(handOver.slice(0, 3)))
  expect(keys(list.pending)).toEqual(keys(handOver.slice(3)))
  expect(expireToasts(list, 4099)).toEqual(list)
  const second = expireToasts(list, 4100)
  expect(keys(second.visible)).toEqual(keys([change, ...handOver.slice(3)]))
  expect(second.visible.map(toast => toast.until)).toEqual([7100, 8100, 8100])
  expect(second.pending).toEqual([])
  expect(keys(expireToasts(second, 7100).visible)).toEqual(keys(handOver.slice(3)))
  expect(expireToasts(second, 8100).visible).toEqual([])
})

test('holding the stack extends every visible lifetime and leaves the queue waiting', () => {
  const list = pushToasts(emptyToasts(), handOver, 100, new Set())
  const resumed = holdToasts(list, 15100, 15000)
  expect(resumed.visible.map(toast => toast.until)).toEqual([19100, 22100, 19100])
  expect(resumed.pending).toEqual(list.pending)
  expect(expireToasts(resumed, 19099).visible).toEqual(resumed.visible)
})

test('dismissing one toast admits just the head of the queue', () => {
  const list = pushToasts(emptyToasts(), handOver, 0, new Set())
  const next = dismissToast(list, list.visible[1]!.id, 1200)
  expect(keys(next.visible)).toEqual(keys([handOver[0]!, handOver[2]!, handOver[3]!]))
  expect(keys(next.pending)).toEqual(keys(handOver.slice(4)))
  expect(next.visible.map(toast => toast.until)).toEqual([4000, 4000, 5200])
})

test('a full queue coalesces passing rows of the same quest before dropping another event', () => {
  const seen = new Set<string>()
  const fillers = Array.from({ length: 20 }, (_, index) => event('bought:' + index))
  const waiting = [change, event('passed:bram:ore'), event('passed:ines:vein'), ...fillers, event('passed:bram:done')]
  const full = pushToasts(emptyToasts(), [event('a'), event('b'), event('c'), ...waiting], 0, seen)
  expect(full.pending).toHaveLength(24)
  const last = event('level:4')
  const next = pushToasts(full, [last], 1, seen)
  expect(keys(next.pending)).toEqual(keys([...waiting.filter(item => item.key !== 'passed:bram:ore'), last]))
  expect(keys(next.visible)).toEqual(['a', 'b', 'c'])
})
