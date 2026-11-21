export function inside(path: string, folder: string) {
  return path === folder || path.startsWith(folder + '/')
}

export function treeRows(files: string[], collapsed = new Set<string>()) {
  const directories = new Set<string>()
  for (const path of files) {
    const parts = path.split('/')
    while (parts.length > 1) {
      parts.pop()
      const dir = parts.join('/')
      if (dir) directories.add(dir)
    }
  }
  const rows: { path: string; name: string; depth: number; folder: boolean }[] = []
  function visit(parent: string, depth: number) {
    for (const [paths, folder] of [
      [directories, true],
      [files, false],
    ] as const) {
      for (const path of [...paths].sort()) {
        const slash = path.lastIndexOf('/')
        if (path.slice(0, Math.max(0, slash)) !== parent) continue
        rows.push({ path, name: path.slice(slash + 1), depth, folder })
        if (folder && !collapsed.has(path)) visit(path, depth + 1)
      }
    }
  }
  visit('', 0)
  return rows
}

export function checkPath(path: string, folder: boolean, files: string[]) {
  if (path.length > 128 || !/^[\w-][\w.-]*(\/[\w-][\w.-]*)*$/.test(path))
    throw new Error('Use a relative path, like lib/feed.ts.')
  if (!folder && (!path.endsWith('.ts') || path.endsWith('.d.ts'))) throw new Error('Choose a .ts filename.')
  if (files.some((file) => inside(path, file) || inside(file, path)))
    throw new Error('That path is already in use.')
}

export function movePaths(from: string, to: string, files: string[]) {
  if (from === 'main.ts') throw new Error('main.ts is the entry file.')
  if (inside(to, from)) throw new Error('Choose a different path.')
  checkPath(to, !files.includes(from), files)
  return files
    .filter((file) => inside(file, from))
    .map((file) => {
      const target = to + file.slice(from.length)
      checkPath(target, false, files)
      return [file, target] as const
    })
}
