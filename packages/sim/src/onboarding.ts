import type { Campaign } from './model'

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

interface Lesson {
  title: string
  text: string
  blank: string
  idea: string
  importLine?: string
  code?: string
  action?: string
}

export const bramLessons: Record<OnboardingStep, Lesson> = {
  1: {
    title: 'Write your first function',
    text: 'The factory looks in main.ts for a function called onTick and runs it every tick. The word export lets the factory see it.',
    blank: 'export function ____() { console.log("tick") }',
    idea: 'Name your function onTick. Put a message inside its braces so you can see when it runs.',
    code: 'export function onTick() {\n  console.log("tick")\n}',
  },
  2: {
    title: 'Deploy your draft',
    text: 'Your edits stay a draft until you deploy. Deploy makes the factory run them every tick.',
    blank: 'In the console: ____',
    idea: 'Print a message inside onTick, then use the button at the bottom of the workshop.',
    code: 'console.log("tick")',
    action: 'Click Deploy and look for your message in the console.',
  },
  3: {
    title: 'Dig your first rock',
    text: 'Uncle’s machines live in the "inherit" module. Import the mine above your function, then tell it to dig inside onTick and deploy.',
    blank: 'mine.____()',
    idea: 'An import gives you the machine by name. A dot lets you call its dig method.',
    importLine: 'import { mine } from "inherit"',
    code: 'mine.dig()',
  },
  4: {
    title: 'Connect the mine to the furnace',
    text: 'Your rock lands on the floor without a belt. Add furnace to your import, connect the mine to it inside onTick, and deploy.',
    blank: 'mine.connect(____)',
    idea: 'Call connect on the machine sending the ore. Put the machine receiving it in the parentheses.',
    importLine: 'import { mine, furnace } from "inherit"',
    code: 'mine.connect(furnace)',
  },
  5: {
    title: 'Smelt the ore',
    text: 'Ore sits in the furnace until you tell it to smelt. Add the call inside onTick and deploy.',
    blank: 'furnace.____()',
    idea: 'Call smelt on the furnace. Empty parentheses select its iron ingot recipe.',
    code: 'furnace.smelt()',
  },
  6: {
    title: 'Connect the furnace to the cart',
    text: 'An ingot needs a belt to reach Bram’s cart. Add cart to the import, connect the furnace to it inside onTick, and deploy.',
    blank: 'furnace.connect(____)',
    idea: 'The furnace sends the ingot. Use the cart as the destination.',
    importLine: 'import { mine, furnace, cart } from "inherit"',
    code: 'furnace.connect(cart)',
  },
  7: {
    title: 'Deliver three ingots',
    text: 'Leave the factory running. The cart takes each ingot to Bram for the mail horse’s shoes.',
    blank: '____ / 3 iron ingots',
    idea: 'Each ingot in the cart adds one to the count on Bram’s request.',
    action: 'Leave your last deploy running until the count reaches 3 / 3.',
  },
}

export function onboardingStep(c: Campaign, draftExportsOnTick = false): OnboardingStep {
  if (c.town.beat !== 1) return 7
  const { world } = c
  // Older saves recorded spilled ore but did not record whether the controller printed.
  const dug = !!world.extracted['iron-ore'] || (world.lost > 0 &&
    world.machines.some(m => m.id === 'mine' && m.stats.blockedTicks > 0))
  if (!(c.progress.signals.printedTick ?? dug)) return draftExportsOnTick ? 2 : 1
  if (!dug) return 3
  const connected = (from: string, to: string) => world.belts.some(b => b.from === from && b.to === to)
  if (!connected('mine', 'furnace')) return 4
  if (!world.machines.find(m => m.id === 'furnace')?.stats.activeTicks) return 5
  return connected('furnace', 'cart') ? 7 : 6
}
