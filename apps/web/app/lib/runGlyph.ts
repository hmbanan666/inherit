/** Exported functions with no parameters. The gutter play mark uses these. */
export function runnableExports(source: string) {
  const found: { name: string; line: number }[] = []
  for (const match of source.matchAll(/^export\s+function\s*\*?\s+([A-Za-z_$][\w$]*)\s*\(\s*\)/gm)) {
    const name = match[1]
    if (!name || match.index === undefined) continue
    found.push({ name, line: source.slice(0, match.index).split('\n').length })
  }
  return found
}
