import { tick } from './lib/mill'

// Wen: the next station depends on the part. A plate goes to the lathe, a cut plate back to the press.
export function onTick() {
  tick('shutters')
}
