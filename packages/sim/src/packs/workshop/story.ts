import type { Campaign } from './model'
import { updateBankStep } from './lesson-flow'

export function markMessageRead(c: Campaign, id: string) {
  const msg = c.progress.messages.find((m) => m.id === id)
  if (!msg || (!msg.unread && !(id === 'tab' && c.town.beat === 2))) return false
  msg.unread = false
  c.lesson = updateBankStep(c)
  return true
}
