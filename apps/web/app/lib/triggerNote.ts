import { triggerDocs } from '@inherit/sim/v8'
import { insertQuestNote } from './questNote'

export interface TriggerExample {
  id: string
  source: string
}

/** The same example the API book shows. Inserted once, the same way as a quest note. */
export function triggerExample(trigger: 'run' | 'events' | 'tick'): TriggerExample {
  const doc = triggerDocs.find(item => item.id === trigger)
  return { id: `trigger:${trigger}`, source: doc?.example ?? '' }
}

/** Skip a second onTick when the file already exports one. */
export function insertTriggerExample(source: string, trigger: 'run' | 'events' | 'tick', remembered: readonly string[]) {
  const example = triggerExample(trigger)
  if (trigger === 'tick' && /export\s+function\s*\*?\s+onTick\s*\(/.test(source)) {
    return { source, remembered: remembered.includes(example.id) ? [...remembered] : [...remembered, example.id] }
  }
  return insertQuestNote(source, example.source, example.id, remembered)
}
