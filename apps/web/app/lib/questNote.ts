/** A comment in the villager's voice. It names the problem and never the expression. */
export function questComment(from: string, nudge: string) {
  return `// ${from.replace(/^Mayor /, '')}: ${nudge}`
}

/**
 * Put the note on the first line once.
 * An id already in `remembered` is left alone, even when the player has deleted the line.
 */
export function insertQuestNote(source: string, note: string, id: string, remembered: readonly string[]) {
  if (remembered.includes(id)) return { source, remembered: [...remembered] }
  const next = [...remembered, id]
  if (source.split('\n').some(line => line.trim() === note)) return { source, remembered: next }
  return { source: source.length ? `${note}\n${source}` : `${note}\n`, remembered: next }
}

/** The quantity on the quest rail. The count is what the villager has received. */
export function quantityLabel(from: string, item: 'ingot' | 'steel', qty: number, shipped: number) {
  const who = from.replace(/^Mayor /, '')
  const value = Math.min(shipped, qty)
  const good = item === 'steel' ? 'steel' : qty === 1 ? 'ingot' : 'ingots'
  return { text: `Delivered to ${who} · ${value}/${qty} ${good}`, value, max: qty }
}

/** How finished goods leave the furnace. Shown on the need line. */
export function deliveryNote(need: string) {
  return `${need} Collect sends a drone from the furnace to the depot.`
}

/** The first test that is not passing. The footer uses it to open Tests. */
export function firstOpenTest(rows: readonly { id: string; state: string }[]) {
  return rows.find(row => row.state !== 'passing')?.id
}

/** One progress line. The delivery count is named by where the goods are handed over. */
export function goalLabel(checkId: string, item: 'ingot' | 'steel', qty: number, shipped: number, done: boolean, memory = 0) {
  if (checkId === 'done') {
    const name = item === 'steel' ? 'Steel' : 'Ingots'
    return { text: `${name} at the depot ${shipped}/${qty}`, value: Math.min(shipped, qty), max: qty }
  }
  if (checkId === 'memory') {
    const value = Math.min(memory, 8)
    return { text: `A remembered route ${value}/8`, value, max: 8 }
  }
  const places: Record<string, string> = {
    ore: 'Ore at the furnace',
    coal: 'Coal at the furnace',
    ingot: 'An ingot at the furnace',
    steel: 'Steel at the furnace',
    both: 'Ore and coal at the furnace',
    drone: 'drone-2 past the depot',
    smelt: 'An ingot smelted',
  }
  const value = done ? 1 : 0
  return { text: `${places[checkId] ?? checkId} ${value}/1`, value, max: 1 }
}
