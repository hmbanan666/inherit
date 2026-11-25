import type { GameEvent } from './worldEvents'

export type Toast = GameEvent & { id: number; until: number }
type Waiting = GameEvent & { id: number }
type ToastList = { visible: Toast[]; pending: Waiting[] }

const visibleLimit = 3
const pendingLimit = 24

export function emptyToasts(): ToastList {
  return { visible: [], pending: [] }
}

function show(event: Waiting, now: number): Toast {
  return { ...event, until: now + (event.kind === 'npc' || event.key === 'welcome' ? 7000 : 4000) }
}

function queue(pending: Waiting[], event: Waiting) {
  pending.push(event)
  if (pending.length <= pendingLimit) return

  // Prefer the latest passing row for a quest when space runs out.
  const repeated = pending.findIndex(({ key }, index) => {
    if (!key.startsWith('passed:')) return false
    const questPrefix = key.slice(0, key.lastIndexOf(':') + 1)
    return pending.slice(index + 1).some(later => later.key.startsWith(questPrefix))
  })
  const drop = repeated >= 0 ? repeated : pending.findIndex(item => item.key.startsWith('passed:'))
  pending.splice(Math.max(0, drop), 1)
}

export function pushToasts(
  list: ToastList, events: readonly GameEvent[], now: number, seen: Set<string>, priority: 'normal' | 'urgent' = 'normal',
): ToastList {
  const visible = [...list.visible]
  const pending = [...list.pending]
  for (const event of events) {
    if (seen.has(event.key)) continue
    seen.add(event.key)
    const entry = { ...event, id: seen.size }
    if (priority === 'urgent' && visible.length === visibleLimit) visible.shift()
    if (visible.length < visibleLimit) visible.push(show(entry, now))
    else queue(pending, entry)
  }
  return { visible, pending }
}

function refill(visible: Toast[], pending: Waiting[], now: number): ToastList {
  const slots = visibleLimit - visible.length
  return {
    visible: [...visible, ...pending.slice(0, slots).map(event => show(event, now))],
    pending: pending.slice(slots),
  }
}

export function dismissToast(list: ToastList, id: number, now: number) {
  return refill(list.visible.filter(toast => toast.id !== id), list.pending, now)
}

export function expireToasts(list: ToastList, now: number) {
  if (!list.visible.some(toast => toast.until <= now)) return list
  return refill(list.visible.filter(toast => toast.until > now), list.pending, now)
}

export function holdToasts(list: ToastList, _now: number, ms: number) {
  return { ...list, visible: list.visible.map(toast => ({ ...toast, until: toast.until + ms })) }
}
