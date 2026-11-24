import { insertQuestNote } from './questNote'

export interface TriggerExample {
  id: string
  source: string
}

/** A ready function with a comment. Inserted once, the same way as a quest note. */
export function triggerExample(trigger: 'run' | 'events' | 'tick'): TriggerExample {
  if (trigger === 'run') return {
    id: 'trigger:run',
    source: `import { drones, veins, findPath } from "inherit"

// Run plays bringOne until it returns. yield waits one tick.
export function* bringOne() {
  const vein = veins()[0]
  // Walk to the vein, one cell each tick. Read the drone again after each yield.
  while (!drones()[0].isNear(vein)) {
    const drone = drones()[0]
    drone.moveAlong(findPath(drone.pos, vein.pos))
    yield
  }
  // A poor vein needs several ticks for one rock.
  while (drones()[0].cargo < 1) {
    drones()[0].mine(vein)
    yield
  }
}`,
  }
  if (trigger === 'tick') return {
    id: 'trigger:tick',
    source: `// Loop runs onTick again each time it finishes. Press Stop to hold the works.
export function onTick() {
  // One step. Loop calls this again after it returns.
}`,
  }
  return {
    id: 'trigger:events',
    source: `import { on } from "inherit"

// on() runs this function once when the cart becomes idle.
on("drone.idle", function () {
  // The cart is empty and not walking.
})`,
  }
}

/** Skip a second onTick when the file already exports one. */
export function insertTriggerExample(source: string, trigger: 'run' | 'events' | 'tick', remembered: readonly string[]) {
  const example = triggerExample(trigger)
  if (trigger === 'tick' && /export\s+function\s*\*?\s+onTick\s*\(/.test(source)) {
    return { source, remembered: remembered.includes(example.id) ? [...remembered] : [...remembered, example.id] }
  }
  return insertQuestNote(source, example.source, example.id, remembered)
}
