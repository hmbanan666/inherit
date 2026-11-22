export interface PlayerAPI {
  /** Give Mila a speech bubble with your words. */
  say(words: string): void
  /** Plant this many flowers in the open bed. */
  plant(count: number): void
  /** Paint a name on the cottage sign. */
  paintSign(name: string): void
  /** Hang a blue or gold welcome flag. */
  hangFlag(colour: string): void
  /** Gather apples from the two trees into the basket. */
  fillBasket(count: number): void
  /** Ring the brass morning bell. */
  ringBell(): void
  /** Swing the cottage shutters open. */
  openShutters(): void
  /** Hang ribbons under the cottage windows. */
  hangRibbons(count: number): void
  /** Find out whether rain is falling in the village. */
  isRaining(): boolean
  /** Spread the striped shelter over the path. */
  openCanopy(): void
  /** Fold the shelter to let the sunlight through. */
  foldCanopy(): void
  /** Count the apples in the basket. */
  basketCount(): number
  /** Lay a cloth and plates for a picnic. */
  setPicnic(): void
  /** Light one path lamp by its number, from 1 to 5. */
  lightLamp(lamp: number): void
  /** Invite a neighbour to the fair by name. */
  greet(name: string): void
  /** Open a fair stall for one of the neighbours. */
  openStall(guest: string): void
  /** Raise the welcome banner above the stalls. */
  hangBanner(): void
}
