type SourceLine = { file: string; line: number }
const minimumDwellMs = 120

export function createLineHighlight(paint: (line?: SourceLine) => void) {
  let shown: SourceLine | undefined
  let nextChangeAt = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  function show(line?: SourceLine) {
    clearTimeout(timer)
    if (shown?.file === line?.file && shown?.line === line?.line) return
    const remaining = nextChangeAt - performance.now()
    if (remaining > 0) {
      timer = setTimeout(() => show(line), Math.ceil(remaining))
      return
    }
    paint(line)
    shown = line
    nextChangeAt = line ? performance.now() + minimumDwellMs : 0
  }

  function reset() {
    clearTimeout(timer)
    if (shown) paint(undefined)
    shown = undefined
    nextChangeAt = 0
  }

  return { show, reset }
}
