import { definePack } from '../../framework/pack'
import { lessons } from './lessons'
import manifest from './manifest'
import type { PlayerAPI } from './player'
import { decodeWorld, initialWorld, propText, villageAPI, type Village } from './world'

const available = new Map<string, (keyof PlayerAPI)[]>()
const introduced = new Set<keyof PlayerAPI>()
for (const lesson of lessons) {
  for (const name of lesson.introduces) introduced.add(name)
  available.set(lesson.id, [...introduced])
}

export default definePack<Village, PlayerAPI>({
  manifest,
  scenes: [...new Set(lessons.map(lesson => lesson.scene))],
  lessons,
  version: 2,
  initialWorld,
  decorateEntry(world, next) {
    const album = { ...world.album }
    const landmarks = [...world.landmarks]
    if (world.lessonId) {
      album[world.lessonId] = propText(world, world.prop)
      if (world.unit.lessonIds.every(id => Object.hasOwn(album, id)) &&
        !landmarks.some(landmark => landmark.id === world.unit.id)) {
        landmarks.push({ id: world.unit.id, title: world.unit.landmark })
      }
    }
    Object.assign(next, { album, landmarks })
  },
  decodeWorld,
  exposure: 'globals',
  retry: 'entry',
  entities: [],
  panels: [],
  available: (_, id) => available.get(id) ?? [],
  beginAttempt(world) {
    return {
      api: villageAPI(world),
      finish(logs: readonly string[] = []) {
        if (world.prop === 'slip') world.slip = logs.join(' · ')
      },
    }
  },
})
