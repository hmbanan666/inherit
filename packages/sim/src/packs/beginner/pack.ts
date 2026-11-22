import { definePack } from '../../framework/pack'
import { lessons, units } from './lessons'
import manifest from './manifest'
import type { PlayerAPI } from './player'
import { decodeWorld, initialWorld, villageAPI, type Village } from './world'

const available = new Map<string, (keyof PlayerAPI)[]>()
const introduced = new Set<keyof PlayerAPI>()
for (const lesson of lessons) {
  for (const name of lesson.introduces) introduced.add(name)
  available.set(lesson.id, [...introduced])
}

export default definePack<Village, PlayerAPI>({
  manifest,
  units,
  lessons,
  version: 2,
  initialWorld,
  decodeWorld,
  exposure: 'globals',
  retry: 'entry',
  entities: [],
  panels: [],
  available: (_, id) => available.get(id) ?? [],
  beginAttempt(world) {
    return { api: villageAPI(world), finish() {} }
  },
})
