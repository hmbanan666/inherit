import type { GameLog } from './gameProtocol'

export interface ConsoleRow extends GameLog {
  count: number
}

export function appendConsoleLines(rows: ConsoleRow[], lines: GameLog[]): ConsoleRow[] {
  if (!lines.length) return rows
  const next = [...rows]
  for (const line of lines) {
    const last = next.at(-1)
    if (last && last.level === line.level && last.text === line.text &&
      last.file === line.file && last.line === line.line) {
      next[next.length - 1] = { ...line, count: last.count + 1 }
    } else {
      next.push({ ...line, count: 1 })
    }
  }
  return next.slice(-256)
}
