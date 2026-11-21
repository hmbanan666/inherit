import { type Deposit, furnace, miner } from './art/extraction'
import { assembler, cutter, press } from './art/fabrication'
import { scrap } from './art/recycling'
import { junction, sorter } from './art/routing'
import { type Drawing, drawing, mountingPlate } from './art/shared'
import { depot, dock, storage, truck } from './art/shipping'

export type { Deposit } from './art/extraction'
export { itemPop, materialArt, materialStyle, materialStyles } from './art/materials'

const stations = {
  mine: (d) => miner(d, 'iron'),
  coal: (d) => miner(d, 'coal'),
  furnace,
  press,
  cutter,
  assembler,
  splitter: (d) => junction(d, false),
  merger: (d) => junction(d, true),
  storage,
  sorter,
  scrap,
  dock,
  depot,
} satisfies Record<string, (d: Drawing) => void>

// One retained Graphics per station. Unknown catalog entries keep the original press fallback.
export function machineArt(kind: string, deposit: Deposit = 'iron') {
  const d = drawing()
  if (kind === 'dispatch' || kind === 'truck') {
    truck(d)
  } else {
    mountingPlate(d)
    if (kind === 'miner') miner(d, deposit)
    else if (Object.hasOwn(stations, kind)) stations[kind as keyof typeof stations](d)
    else press(d)
  }
  return d.g
}
