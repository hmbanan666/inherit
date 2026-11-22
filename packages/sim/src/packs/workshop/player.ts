export type Place = string
export type MachineKind = 'press' | 'furnace' | 'cutter' | 'assembler'
export interface Inspection { status: string; inside: string[]; ready?: string; wanted?: string[]; waiting?: Record<string,number> }
export interface PlayerAPI {
  /** Pick up the front ready item. The hand holds one item. */
  take(place: Place): string | undefined
  /** Put the item in the hand down at this place. */
  put(place: Place): boolean
  /** Read the state and contents of a place. */
  look(place: Place): Inspection
  /** Buy a machine once for its name. */
  buy(kind: MachineKind, name?: string): boolean
  /** Restart a broken machine. */
  repair(place: Place): boolean
  /** Answer Mrs Harrow and leave the balance for later. */
  replyLater(): boolean
  /** Pay the remaining balance from the workshop earnings. */
  payBalance(): boolean
}
