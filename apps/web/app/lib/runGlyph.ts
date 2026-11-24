/** Exported functions with no parameters. The gutter play mark uses these. */
export function runnableExports(source: string) {
  const found: { name: string; line: number }[] = []
  for (const match of source.matchAll(/^export\s+function\s+([A-Za-z_$][\w$]*)\s*\(\s*\)/gm)) {
    const name = match[1]
    if (!name || match.index === undefined) continue
    found.push({ name, line: source.slice(0, match.index).split('\n').length })
  }
  return found
}

/** The no-argument export the caret is in. The gutter and the command menu share it. */
export function exportAtCursor(source: string, line: number) {
  let chosen: { name: string; line: number } | undefined
  for (const item of runnableExports(source)) {
    if (item.line > line) break
    chosen = item
  }
  return chosen
}
