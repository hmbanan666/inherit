import { workKits } from './lib/kits'

// Odile: pack the winch crate, then the lamp crate. The shutter line does not fill either crate.
export function onTick() {
  workKits()
}
