import { workGears } from './lib/gears'

// Tomas: a blank becomes a gear only on the lathe. This file does not assemble.
export function onTick() {
  workGears()
}
