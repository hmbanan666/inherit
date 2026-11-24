import { tick } from './lib/mill'

// Harrow: the order names a plate and a blank. The press die follows that line.
export function onTick() {
  tick('dies')
}
