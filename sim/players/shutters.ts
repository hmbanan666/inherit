import { workShutters } from './lib/shutters'

// Wen: the next station depends on the part. A plate goes to the lathe, a cut plate comes back to the press.
export function onTick() {
  workShutters()
}
