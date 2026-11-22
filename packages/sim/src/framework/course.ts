import type { Lesson, PackManifest } from './pack'

export interface MapLesson {
  id: string
  goal: string
  unit?: string
  state: 'done' | 'current' | 'locked' | 'available'
}

export function courseMap(
  manifest: PackManifest,
  lessons: readonly Pick<Lesson<unknown>, 'id' | 'goal' | 'unit'>[],
  completed: readonly string[],
): MapLesson[] {
  const done = new Set(completed)
  const frontier = lessons.find(lesson => !done.has(lesson.id))
  return lessons.map(({ id, goal, unit }) => ({
    id, goal, unit,
    state: done.has(id) ? 'done' : id === frontier?.id ? 'current'
      : manifest.track === 'challenges' ? 'available' : 'locked',
  }))
}
