// Human play time beside the balance gate. Every rate used by sim/humanEstimate.ts lives here.
// Minutes are bot time plus reading, writing, debugging, and shop. Profiles scale those
// minutes. Average is the default. Nothing in this file fails `pnpm sim`.

/** Time multipliers. 1 is the average player. Below 1 is faster. */
export interface Pace {
  /** Quest text. */
  reading: number
  /** Lines inserted or deleted. */
  writing: number
  /** First-time API calls and concepts. */
  learning: number
  /** Failed runs. */
  debug: number
  /** Shop rows, buy-or-save decisions, and new machines. */
  shop: number
}

export interface Profile {
  label: string
  pace: Pace
}

export interface ConceptRule {
  id: string
  label: string
  /** Applied to the reference program with comments removed. */
  pattern: RegExp
}

// Recipes that consume more than one input. grate is two steel. hinge is a plate and a pin.
// pack is a kit. alloy is ore and coal.
const multiInputRecipes = ['alloy', 'grate', 'hinge', 'pack'] as const

export const humanTime = {
  reading: {
    // Careful first read of short quest text, not a novel. Repetition is not discounted.
    wordsPerMinute: 150,
    // The need line on the card always ends with this sentence.
    deliverySentence: 'Collect sends a drone from the furnace to the depot.',
    // Hand-over trigger lines. They match grantHint on the quest card.
    triggerText: {
      run: 'Press ▶ next to a function. It runs once, this tick.',
      tick: 'Loop calls that function every tick.',
      events: 'on() runs a function when the works change.',
    },
  },
  writing: {
    // One non-blank line inserted or deleted, including a comment. Thinking is in this rate.
    // Charged only when the diff is new logic. A trivial edit charges nothing.
    secondsPerLine: 12,
    // Token insertions plus deletions at or below this are not new code.
    // A new function, branch, loop, or API call has to clear this count as well.
    // A swapped job name or number is a literal change and does not count at any size.
    trivialTokenEdits: 2,
    // The first time a works API call appears in the reference program.
    secondsPerApi: 40,
    // The first time a concept below appears. Later quests pay the line rate only.
    secondsPerConcept: 120,
  },
  debugging: {
    // Expected failed runs on a quest whose program changes, before new ideas.
    // The successful run is the bot's minutes, not a debug run.
    baseRuns: 1,
    // Added for each concept first met on this quest.
    runsPerConcept: 1,
    // Added for each API call first used on this quest. An expectation, so it may be fractional.
    runsPerApi: 0.2,
    // Cap so one large first deploy does not imply a dozen failed runs.
    maxRuns: 5,
    // Start the run, watch, and read the failed check. Includes that inspection.
    secondsPerRun: 60,
  },
  shop: {
    // A shop row, the tick it first appears.
    secondsPerListing: 15,
    // The hand-over that can first afford a convenience, or an actual purchase.
    secondsPerDecision: 40,
    // A machine the tick it first appears on the floor, including the opening furnace and veins.
    secondsPerMachine: 20,
  },
  // Comments are ignored. The starter program already contains `function`, so that concept is not charged.
  concepts: [
    { id: 'function', label: 'Function', pattern: /\bfunction\b/ },
    // onTick is the works Loop. for and while are the language loop. The first of either is the cost.
    { id: 'loop', label: 'Loop', pattern: /\b(?:for|while)\s*\(|\bonTick\b/ },
    {
      id: 'multiple-inputs',
      label: 'Multiple inputs',
      pattern: new RegExp(String.raw`\.alloy\s*\(|['"](?:${multiInputRecipes.join('|')})['"]`),
    },
    // transfer carries one good from one station to another.
    { id: 'routing', label: 'Routing', pattern: /\.transfer\s*\(/ },
  ] as ConceptRule[],
  multiInputRecipes,
  profiles: {
    fast: {
      label: 'Fast',
      pace: { reading: 0.6, writing: 0.5, learning: 0.35, debug: 0.45, shop: 0.6 },
    },
    average: {
      label: 'Average',
      pace: { reading: 1, writing: 1, learning: 1, debug: 1, shop: 1 },
    },
    // New to TypeScript. Dialogue is nearly the same speed. Calls, concepts, and failed runs are not.
    newbie: {
      label: 'New to TypeScript',
      pace: { reading: 1.15, writing: 1.8, learning: 2.5, debug: 2.2, shop: 1.4 },
    },
  } satisfies Record<string, Profile>,
  defaultProfile: 'average' as const,
  profileOrder: ['fast', 'average', 'newbie'] as const,
  // About 25 minutes for one quest, average profile. Over this is a warning, not a failed check.
  maxQuestMinutes: 25,
  // About 15 minutes of machine time while the reference program does not change.
  maxWaitMinutes: 15,
}

export type ProfileId = keyof typeof humanTime.profiles
