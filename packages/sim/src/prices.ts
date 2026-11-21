import type { MachineKind } from './campaign-api'

export const PRICES = {
  machines: {
    miner: 18,
    furnace: 24,
    dock: 16,
    splitter: 12,
    press: 28,
    cutter: 26,
    assembler: 40,
    storage: 18,
    merger: 12,
    sorter: 22,
    scrap: 18,
    depot: 32,
    truck: 50,
  } satisfies Record<MachineKind, number>,
  beltPerTile: 2,
  plots: { 'shed-floor': 0, 'east-lot': 80, 'south-lot': 60, 'rail-spur': 180, roadhead: 0 } as Record<
    string,
    number
  >,
  road: 90,
}
