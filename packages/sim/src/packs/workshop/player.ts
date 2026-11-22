export type Place = string
export type MachineKind = 'press' | 'furnace' | 'cutter' | 'assembler'
export interface Inspection { status: string; inside: string[]; ready?: string; wanted?: string[]; waiting?: Record<string,number> }
export interface PlayerAPI {
  /** Pick up the front ready item. The hand holds one item.
   * @param place Station to pick up from.
   * @returns Item name or undefined when nothing is ready.
   * @example const item = take("furnace")
   */
  take(place: Place): string | undefined
  /** Put the item in the hand down at this place.
   * @param place Station to receive the held item.
   * @returns True when the station accepts the item.
   * @example put("cart")
   */
  put(place: Place): boolean
  /** Read the state and contents of a place.
   * @param place Station to inspect.
   * @returns The status, contents and ready item.
   * @example const report = look("cart")
   */
  look(place: Place): Inspection
  /** Buy a machine once for its name.
   * @param kind Machine to purchase.
   * @param name Optional name for this machine.
   * @returns True when the purchase succeeds.
   * @example buy("furnace", "copper")
   */
  buy(kind: MachineKind, name?: string): boolean
  /** Restart a broken machine.
   * @param place Machine to restart.
   * @returns True when the repair succeeds.
   * @example repair("furnace")
   */
  repair(place: Place): boolean
  /** Answer Mrs Harrow and leave the balance for later.
   * @returns True when the reply is accepted.
   * @example replyLater()
   */
  replyLater(): boolean
  /** Pay the remaining balance from the workshop earnings.
   * @returns True when payment succeeds.
   * @example payBalance()
   */
  payBalance(): boolean
}
