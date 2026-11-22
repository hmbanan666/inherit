export interface Guest {
  name: string
  seats: number
}

export interface PlayerAPI {
  /**
   * Give Mila some words to say aloud.
   * @param words Your words, up to 80 characters.
   * @returns No value.
   * @example say("Good morning!")
   */
  say(words: string): void
  /**
   * Copy the supplied text onto the next sign.
   * @param text The words to letter on the sign.
   * @returns No value.
   * @example paintSign("East Pier")
   */
  paintSign(text: string): void
  /**
   * Swing the brass bell once.
   * @returns No value.
   * @example ringBell()
   */
  ringBell(): void
  /**
   * Grow this many flowers in the next marked bed.
   * @param count The number of flowers, from 0 to 32.
   * @returns No value.
   * @example plant(2)
   */
  plant(count: number): void
  /**
   * Place a whole number of apples in the basket.
   * @param count The number of apples, from 0 to 32.
   * @returns No value.
   * @example fillBasket(4)
   */
  fillBasket(count: number): void
  /**
   * Set the scoreboard to a number.
   * @param points A finite number to display.
   * @returns No value.
   * @example showScore(12)
   */
  showScore(points: number): void
  /**
   * Raise a blue or gold flag on the pole.
   * @param colour The colour, either blue or gold.
   * @returns No value.
   * @example hangFlag("blue")
   */
  hangFlag(colour: string): void
  /**
   * Swing open the cottage shutters.
   * @returns No value.
   * @example openShutters()
   */
  openShutters(): void
  /**
   * Set the signal to green for true or off for false.
   * @param on The signal reading, true for green or false for off.
   * @returns No value.
   * @example setSignal(false)
   */
  setSignal(on: boolean): void
  /**
   * Read the number of apples in the basket.
   * @returns How many apples are in the basket.
   * @example const harvest = basketCount()
   */
  basketCount(): number
  /**
   * Read the weather sensor. Rain gives true and clear skies give false.
   * @returns True in rain and false under clear skies.
   * @example const wet = isRaining()
   */
  isRaining(): boolean
  /**
   * Pull the canopy across the path.
   * @returns No value.
   * @example openCanopy()
   */
  openCanopy(): void
  /**
   * Fold the canopy back from the path.
   * @returns No value.
   * @example foldCanopy()
   */
  foldCanopy(): void
  /**
   * Fill the hooks with these flag colours, left to right.
   * @param colours A list of blue and gold colours in hook order.
   * @returns No value.
   * @example rackFlags(["blue", "gold"])
   */
  rackFlags(colours: string[]): void
  /**
   * Lay the numeric weights into the tray in order.
   * @param weights A list of whole weights, each between 0 and 32.
   * @returns No value.
   * @example loadWeights([3, 1])
   */
  loadWeights(weights: number[]): void
  /**
   * Invite one named guest onto the path.
   * @param name The visitor’s name.
   * @returns No value.
   * @example greet("Pip")
   */
  greet(name: string): void
  /**
   * Light the path lamp with this number, from one to five.
   * @param number The number on the lamp post, from 1 to 5.
   * @returns No value.
   * @example lightLamp(2)
   */
  lightLamp(number: number): void
  /**
   * Move the robot one square towards the dock.
   * @returns No value.
   * @example step()
   */
  step(): void
  /**
   * Dress the next rail with this many ribbons.
   * @param count The number of ribbons for this rail, from 0 to 32.
   * @returns No value.
   * @example hangRibbons(3)
   */
  hangRibbons(count: number): void
  /**
   * Copy a booking's name and seat count onto the next stall card.
   * @param card A booking with a name and a whole seat count from 0 to 32.
   * @returns No value.
   * @example postCard({ name: "Boats", seats: 2 })
   */
  postCard(card: { name: string; seats: number }): void
  /**
   * Read today's guest cards in arrival order.
   * @returns A fresh list of today’s bookings in arrival order.
   * @example const bookings = guests()
   */
  guests(): Guest[]
  /**
   * Open one named fair stall.
   * @param name The stallholder’s name.
   * @returns No value.
   * @example openStall("Kites")
   */
  openStall(name: string): void
  /**
   * Raise the fair's welcome banner.
   * @returns No value.
   * @example hangBanner()
   */
  hangBanner(): void
}
