import { definePack } from '../../framework/pack'
import manifest from './manifest'
import { lessons } from './lessons'
import { initialWorld, decodeWorld, type Village } from './world'
import type { PlayerAPI } from './player'
export default definePack<Village,PlayerAPI>({
  manifest, lessons, version: 1, initialWorld, decodeWorld, exposure: 'globals', retry: 'entry',
  entities: [{id: 'villager', label: 'Mila', rows: w => [{id: 'speech', label: 'Mila', value: w.bubble}]}],
  panels: [], available: () => ['say'],
  beginAttempt(world) {
    return {api: { say(words) {
      if (typeof words !== 'string' || words.length > 100) throw new Error('Give Mila a short greeting in quotes.')
      world.bubble = words
    } }, finish() {} }
  },
})
