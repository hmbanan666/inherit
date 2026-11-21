import type { Graphics } from 'pixi.js'
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

// Redrawn only for machines with an active hiccup.
export function drawHiccup(g: Graphics, status: string, now: number) {
  g.clear()
  if (status === 'jammed') {
    const pulse = (1 + Math.sin(now / 210)) / 2
    g.roundRect(-38, -25, 76, 48, 8).stroke({ color: 0xf47c55, width: 2.5, alpha: 0.4 + pulse * 0.5 })
    // Two opposing jaws around the actual item in the intake.
    for (const side of [-1, 1])
      g.moveTo(-25 + side * 10, -12)
        .lineTo(-25 + side * 7, -8)
        .lineTo(-25 + side * 10, -4)
        .stroke({ color: 0xffb180, width: 2.2 })
  } else if (status === 'broken') {
    g.ellipse(2, 2, 31, 12).fill({ color: 0xf28d46, alpha: 0.29 + 0.08 * Math.sin(now / 470) })
    for (let i = 0; i < 5; i++) {
      const age = (now / 1550 + i / 5) % 1
      g.circle(-12 + age * 9 + Math.sin(age * 7) * 2, -21 - age * 36, 3 + age * 5).fill({
        color: i % 2 ? 0x89868a : 0x605e64,
        alpha: 0.78 * (1 - age),
      })
    }
  }
}
