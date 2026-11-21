import type { Campaign, StoryMessage } from './model'

const letters: Record<string, [string, string, string]> = {
  shovel: [
    'Uncle',
    'The power shovel',
    'It has one button. Took me a week to label it. Good to see a rock on the belt.',
  ],
  hale: [
    'Hale Hardware',
    'Ten, all present',
    'Counted them twice. The second time was just for the lovely clink.',
  ],
  board: [
    'County Freight',
    'Room on the noticeboard',
    'Seven clean pickups! Neighbors can leave little orders on the board now. Take whichever looks fun.',
  ],
  ledger: [
    'Uncle',
    'Ink that sticks',
    'That ledger has survived three controllers and a tea spill. Keep the good numbers in it.',
  ],
  rail: [
    'West End Rail',
    'Both chimneys smoking',
    'Heard both burners from the station. First time they’ve kept a beat.',
  ],
  miller: [
    'Miller Tool Co.',
    'Parts received',
    'All ten fit. Even the one my apprentice measured in thumbs.',
  ],
  canal: [
    'Canal Lock Works',
    'The gate swings',
    'Twelve sacks on the invoice, twelve parts in the crate. Our accountant has gone outside to celebrate.',
  ],
  binder: [
    'Uncle',
    'The workshop binder',
    'You’ve copied that splitter dance three times. Slip a helper into lib/ and call it from main.ts.',
  ],
  shelf: ['Nora at Number Nine', 'Shelf report', 'The shelf is still horizontal. This is my highest rating.'],
  stamps: [
    'Uncle',
    'The crooked stamp',
    'Look at the front parcel before routing it. Even the bent ones are worth a second trip through scrap.',
  ],
  road: [
    'Uncle',
    'Road to the yard',
    'Pack a spare axle. Also pack a spare copy of the receipt. For entirely unrelated reasons.',
  ],
  axle: [
    'Pip’s Repair Cart',
    'Axle attached',
    'The truck is one piece again. The paperwork is a separate engineering problem.',
  ],
  tram: [
    'Lark Island Tram',
    'One more stop',
    'The tram is running. At the far terminus there’s a second factory with a light in the window. Know anyone?',
  ],
  network: [
    'Uncle',
    'Across the water',
    'A shed, a yard, an island. Maybe the next factory should have your name on the door. To be continued.',
  ],
}
export function postMessage(c: Campaign, id: string): StoryMessage | undefined {
  if (c.progress.messages.some((m) => m.id === id)) return
  const [from, title, body] = letters[id]
  const message: StoryMessage = {
    id,
    from,
    title,
    body,
    kind: from === 'Uncle' ? 'notebook' : 'email',
    tick: c.world.tick,
    unread: true,
  }
  c.progress.messages.push(message)
  return message
}
export function binderNudge(c: Campaign): StoryMessage | undefined {
  if (c.progress.messages.some((m) => m.id === 'binder')) return
  if (c.economy.research.includes('binder')) return postMessage(c, 'binder')
  const main = c.project.deployed['main.ts']
  if (!main.includes('.route(')) return
  const repeats = new Map<string, number>()
  for (const line of main.split('\n')) {
    if (!line.includes('.route(')) continue
    const pattern = line.trim().replace(/["'][^"']+["']/g, 'id')
    const count = (repeats.get(pattern) ?? 0) + 1
    if (count === 3) return postMessage(c, 'binder')
    repeats.set(pattern, count)
  }
}
export function markMessageRead(c: Campaign, id: string) {
  const msg = c.progress.messages.find((m) => m.id === id)
  if (!msg?.unread) return false
  msg.unread = false
  return true
}
