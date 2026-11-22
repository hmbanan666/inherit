export type Place = 'belt' | 'left' | 'right' | 'cart'
export interface Parcel {
  id: string
  colour: 'red' | 'blue'
  weight: number
  to: 'north' | 'south' | 'dock'
}
export interface Inspection {
  count: number
  front: Parcel | undefined
  jammed: boolean
}
export interface PlayerAPI {
  /**
   * Lift the front parcel into the empty hand.
   * @param place The belt or a bin to unload.
   * @returns A label snapshot, or undefined for a full hand, an empty or jammed source, or the cart.
   * @example const lifted = take("belt")
   */
  take(place: Place): Parcel | undefined
  /**
   * Drop the held parcel at the back of a queue.
   * @param place A bin or the dispatch cart.
   * @returns True on delivery. An empty hand, blocked bin or belt returns false and leaves the hand unchanged.
   * @example const delivered = put("left")
   */
  put(place: Place): boolean
  /**
   * Inspect a station without moving the arm.
   * @param place The station whose label, count and jam flag you need.
   * @returns A fresh snapshot including blocked parcels. An empty queue has count zero and an undefined front.
   * @example const queued = look("right").count
   */
  look(place: Place): Inspection
  /**
   * Write one reading to the scale. The most recent reading stays visible.
   * @param value A finite number. Invalid readings produce a diagnostic and leave the scale unchanged.
   * @returns No value.
   * @example display(12)
   */
  display(value: number): void
  /**
   * Remove a blockage. The front parcel stays where it is.
   * @param place The station to clear.
   * @returns True if a jam was cleared, false if the station was already clear.
   * @example const cleared = clearJam("left")
   */
  clearJam(place: Place): boolean
}

/** Functions supplied by the player, called by the floor clock after arrivals. */
export interface Controller {
  /**
   * Export this function from main.ts to respond to each tick after Deploy.
   * @returns No value.
   * @example export function onTick() { console.log("Another tick") }
   */
  onTick(): void
}

export interface PlayerConsole {
  /**
   * Write diagnostic values to Console during a run or clock tick.
   * @param values The values to print on one line.
   * @returns No value.
   * @example console.log(look("cart").count)
   */
  log(...values: unknown[]): void
}
