export interface PlayerAPI {
  /** Give Mila a speech bubble with your words.
   * @param words The words Mila should speak.
   * @returns No value.
   * @example say("Good morning!")
   */
  say(words: string): void
  /** Plant this many flowers in the open bed.
   * @param count Number of flowers to plant.
   * @returns No value.
   * @example plant(2)
   */
  plant(count: number): void
  /** Paint a name on the cottage sign.
   * @param name Text for the sign.
   * @returns No value.
   * @example paintSign("Mila")
   */
  paintSign(name: string): void
  /** Hang a blue or gold welcome flag.
   * @param colour The new flag colour.
   * @returns No value.
   * @example hangFlag("blue")
   */
  hangFlag(colour: string): void
  /** Gather apples from the two trees into the basket.
   * @param count Number of apples in the basket.
   * @returns No value.
   * @example fillBasket(2)
   */
  fillBasket(count: number): void
  /** Ring the brass morning bell.
   * @returns No value.
   * @example ringBell()
   */
  ringBell(): void
  /** Swing the cottage shutters open.
   * @returns No value.
   * @example openShutters()
   */
  openShutters(): void
  /** Hang ribbons under the cottage windows.
   * @param count Number of ribbons.
   * @returns No value.
   * @example hangRibbons(4)
   */
  hangRibbons(count: number): void
  /** Find out whether rain is falling in the village.
   * @returns True when rain is falling.
   * @example const wet = isRaining()
   */
  isRaining(): boolean
  /** Spread the striped shelter over the path.
   * @returns No value.
   * @example openCanopy()
   */
  openCanopy(): void
  /** Fold the shelter to let the sunlight through.
   * @returns No value.
   * @example foldCanopy()
   */
  foldCanopy(): void
  /** Count the apples in the basket.
   * @returns Number of apples currently in the basket.
   * @example const count = basketCount()
   */
  basketCount(): number
  /** Lay a cloth and plates for a picnic.
   * @returns No value.
   * @example setPicnic()
   */
  setPicnic(): void
  /** Light one path lamp by its number, from 1 to 5.
   * @param lamp Lamp number along the path.
   * @returns No value.
   * @example lightLamp(2)
   */
  lightLamp(lamp: number): void
  /** Invite a neighbour to the fair by name.
   * @param name Name of the arriving neighbour.
   * @returns No value.
   * @example greet("Pip")
   */
  greet(name: string): void
  /** Open a fair stall for one of the neighbours.
   * @param guest Name of a neighbour already at the fair.
   * @returns No value.
   * @example openStall("Ada")
   */
  openStall(guest: string): void
  /** Raise the welcome banner above the stalls.
   * @returns No value.
   * @example hangBanner()
   */
  hangBanner(): void
}
