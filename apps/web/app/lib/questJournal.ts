import type { QuestDef } from '../../../../packages/sim/src/v8/quests'

export function questHistory(cleared: readonly string[], quests: readonly QuestDef[]) {
  return cleared.flatMap(id => {
    const quest = quests.find(quest => quest.id === id)
    if (!quest) return []
    return [{ id, title: quest.title, from: quest.from.replace(/^Mayor /, ''), change: quest.change }]
  })
}
