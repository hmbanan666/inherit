import { createElement, useState } from 'react'
import { create } from 'react-test-renderer'
import type { DeskFrame } from '@inherit/sim/tally-desk'

function Counter({ paint }: Pick<DeskFrame, 'paint'>) {
  const [tally, setTally] = useState(0)
  return createElement('button', { className: paint, onClick: () => setTally(tally + 1) }, String(tally))
}

export function referenceTallies(frames: DeskFrame[]) {
  const sign = (frame: DeskFrame) => createElement(Counter, { key: frame.shift, paint: frame.paint })
  const desk = create(sign(frames[0]))
  try {
    return frames.map(frame => {
      if (frame.action === 'stamp') desk.root.findByType('button').props.onClick()
      else if (frame.action !== 'open') desk.update(sign(frame))
      return Number(desk.root.findByType('button').children[0])
    })
  } finally {
    desk.unmount()
  }
}
