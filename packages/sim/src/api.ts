export type Item = 'ore' | 'coal' | 'ingot' | 'part'
export interface Factory {
  readonly tick: number
  /** Extract one unit into the mine's outbound belt. */
  dig(id: string): boolean
  /** Start a batch if the furnace or assembler has its ingredients. */
  work(id: string): boolean
  /** Move the first queued item onto a connected target's belt. */
  route(id: string, target: string): boolean
  /** Can the next belt accept an item right now? */
  space(id: string, target?: string): boolean
  /** Number of queued inputs, optionally filtered by material. */
  stock(id: string, item?: Item): number
}
