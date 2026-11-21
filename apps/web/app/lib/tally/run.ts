import { createProgram } from '@inherit/sandbox'
import { deskFrames, firstDifference, type DeskAction, type TallyRow } from '@inherit/sim/tally-desk'
import { referenceTallies } from './reference'

const driver = `import { tallyFor } from './desk'
let setTally
let last
export function onTick(ctx) {
  const desk = ctx.inspect('desk')
  if (desk.action === 'stamp') setTally(last + 1)
  ;[last, setTally] = tallyFor(desk.shift)
  if (!Number.isFinite(last) || typeof setTally !== 'function')
    throw new Error('Return a pair containing a number and a setter function.')
  ctx.memory.tally = last
}`

export async function runDesk(source: string, actions: DeskAction[]) {
  const frames = deskFrames(actions)
  const reference = referenceTallies(frames)
  const program = await createProgram({ files: { 'main.ts': driver, 'desk.ts': source } })
  try {
    const rows: TallyRow[] = frames.map((frame, tick) => {
      program.onTick({ tick, inspect: (id: string) => id === 'desk' ? frame : undefined })
      return { ...frame, reference: reference[tick], player: Number(program.exportMemory().tally) }
    })
    return { rows, difference: firstDifference(rows) }
  } finally {
    program.dispose()
  }
}
export type DeskResult = Awaited<ReturnType<typeof runDesk>>
