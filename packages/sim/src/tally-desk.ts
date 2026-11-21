export type DeskAction = 'stamp' | 'repaint' | 'handover'
export type Shift = 'Day' | 'Night'
export interface DeskFrame {
  action: DeskAction | 'open'
  shift: Shift
  paint: 'chalk' | 'ink'
}
export interface TallyRow extends DeskFrame {
  reference: number
  player: number
}
export function deskFrames(actions: DeskAction[]): DeskFrame[] {
  let shift: Shift = 'Day'
  let paint: DeskFrame['paint'] = 'chalk'
  const frames: DeskFrame[] = [{ action: 'open', shift, paint }]
  for (const action of actions) {
    if (action === 'handover') shift = shift === 'Day' ? 'Night' : 'Day'
    if (action === 'repaint') paint = paint === 'chalk' ? 'ink' : 'chalk'
    frames.push({ action, shift, paint })
  }
  return frames
}
export const actionNames = { open: 'Open desk', stamp: 'Stamp parcel', repaint: 'Repaint sign', handover: 'Change shift' }
export const starter = `export function tallyFor(shift) {
  let tally = 0
  return [tally, next => { tally = next }]
}`
const firstSolution = `let tally = 0

export function tallyFor(shift) {
  return [tally, next => { tally = next }]
}`
const source = 'https://github.com/facebook/react/blob/be229c5655074642ee664f532f2e7411dd7dccc7/packages/react-reconciler/src/ReactChildFiber.old.js'
export const deskChallenges = [
  {
    title: 'A fresh coat of paint',
    question: 'The dispatch clerk stamps every outgoing parcel. Halfway through the shift, the sign painter refreshes the desk. Which number should still be on the sign?',
    experiment: ['stamp', 'repaint', 'stamp', 'stamp', 'repaint'],
    hint: 'Stamp once. Repaint without stamping. Watch the tally on both signs.',
    explanation: 'Every stamp calls the setter and renders the desk again. Keep the number somewhere the next call to tallyFor can read.',
    solution: firstSolution,
    internals: 'Repainting changes a prop. The counter still has the same key and component type in the same position, so React reuses its fiber and the hook keeps its state.',
    source: source + '#L1140-L1177',
  },
  {
    title: 'The night shift',
    question: 'The night clerk takes the same desk with a different shift key. Later the day clerk returns. What tally does each clerk inherit?',
    experiment: ['stamp', 'repaint', 'handover', 'stamp', 'stamp', 'handover', 'repaint', 'stamp'],
    hint: 'Stamp for Day, change shift, stamp for Night, then change back to Day. Does the first tally come back?',
    explanation: 'The shift name is the component key. Keep the tally while that key stays mounted. Start at zero each time a different key takes the desk.',
    solution: `let mountedShift
let tally = 0

export function tallyFor(shift) {
  if (shift !== mountedShift) {
    mountedShift = shift
    tally = 0
  }
  return [tally, next => { tally = next }]
}`,
    internals: 'A different key causes React to delete the previous child and create a fiber for the incoming counter. Returning to Day mounts a fresh counter and initializes useState(0) again.',
    source: source + '#L1180-L1203',
  },
] satisfies Array<{ title: string; question: string; experiment: DeskAction[]; hint: string; explanation: string; solution: string; internals: string; source: string }>

export function firstDifference(rows: TallyRow[]) {
  return rows.findIndex(row => row.reference !== row.player)
}
