export interface Guest {
  name: string
  seats: number
}

export interface PlayerAPI {
  /** Give Mila some words to say aloud. */
  say(words: string): void
  /** Copy the supplied text onto the next sign. */
  paintSign(text: string): void
  /** Swing the brass bell once. */
  ringBell(): void
  /** Grow this many flowers in the next marked bed. */
  plant(count: number): void
  /** Place a whole number of apples in the basket. */
  fillBasket(count: number): void
  /** Set the scoreboard to a number. */
  showScore(points: number): void
  /** Raise a blue or gold flag on the pole. */
  hangFlag(colour: string): void
  /** Swing open the cottage shutters. */
  openShutters(): void
  /** Set the signal to green for true or off for false. */
  setSignal(on: boolean): void
  /** Read the number of apples in the basket. */
  basketCount(): number
  /** Read the weather sensor. Rain gives true and clear skies give false. */
  isRaining(): boolean
  /** Pull the canopy across the path. */
  openCanopy(): void
  /** Fold the canopy back from the path. */
  foldCanopy(): void
  /** Fill the hooks with these flag colours, left to right. */
  rackFlags(colours: string[]): void
  /** Lay the numeric weights into the tray in order. */
  loadWeights(weights: number[]): void
  /** Invite one named guest onto the path. */
  greet(name: string): void
  /** Light the path lamp with this number, from one to five. */
  lightLamp(number: number): void
  /** Move the robot one square towards the dock. */
  step(): void
  /** Dress the next rail with this many ribbons. */
  hangRibbons(count: number): void
  /** Copy a booking's name and seat count onto the next stall card. */
  postCard(card: { name: string; seats: number }): void
  /** Read today's guest cards in arrival order. */
  guests(): Guest[]
  /** Open one named fair stall. */
  openStall(name: string): void
  /** Raise the fair's welcome banner. */
  hangBanner(): void
}
