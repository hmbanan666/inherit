export interface HostIncident {
  text: string
  tick: number
  file?: string
  line?: number
}

export interface HostNotice extends HostIncident {
  read: boolean
}

/** Keep the first sighting. A new text, file, or line after the notice was cleared counts again. */
export function noteHost(current: HostNotice | undefined, incident: HostIncident): HostNotice {
  if (current && current.text === incident.text && current.file === incident.file && current.line === incident.line)
    return current
  return { text: incident.text, tick: incident.tick, file: incident.file, line: incident.line, read: false }
}

export function markHostRead(notice: HostNotice | undefined) {
  if (!notice || notice.read) return notice
  return { ...notice, read: true }
}

/** A console jump only when the file is one the player can open. */
export function knownLocation(files: Record<string, string>, file?: string, line?: number) {
  if (!file || line === undefined || !Number.isInteger(line) || line < 1 || !Object.hasOwn(files, file)) return
  return { file, line }
}

/** File and line from a deploy error. Other failures stay a string. */
export function scriptFailure(error: unknown): { text: string; file?: string; line?: number } {
  const text = error instanceof Error ? error.message : String(error)
  const diagnostic = error && typeof error === 'object' && 'diagnostic' in error
    ? (error as { diagnostic?: { file?: unknown; line?: unknown } }).diagnostic
    : undefined
  const file = typeof diagnostic?.file === 'string' ? diagnostic.file : undefined
  const line = typeof diagnostic?.line === 'number' ? diagnostic.line : undefined
  if (file && line !== undefined && Number.isInteger(line) && line > 0) return { text, file, line }
  return { text }
}
