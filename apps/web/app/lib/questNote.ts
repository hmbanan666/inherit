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

const goodName: Record<string, [string, string]> = {
  ingot: ['ingot', 'ingots'],
  steel: ['steel', 'steel'],
  ore: ['ore', 'ore'],
  grate: ['grate', 'grates'],
  plate: ['plate', 'plates'],
  blank: ['blank', 'blanks'],
  gear: ['gear', 'gears'],
  pin: ['pin', 'pins'],
  cut: ['cut plate', 'cut plates'],
  shutter: ['shutter', 'shutters'],
  hinge: ['hinge', 'hinges'],
  winch: ['crate', 'crates'],
  lamp: ['crate', 'crates'],
}

function named(item: string, qty: number) {
  const pair = goodName[item]
  if (!pair) return qty === 1 ? item : `${item}s`
  return qty === 1 ? pair[0] : pair[1]
}

/** The quantity on the quest rail. The count is what the villager has received. */
export function quantityLabel(from: string, item: string, qty: number, shipped: number, lines?: readonly { item: string; qty: number; shipped: number }[]) {
  const who = from.replace(/^Mayor /, '')
  if (lines?.length) {
    const done = lines.reduce((sum, line) => sum + Math.min(line.shipped, line.qty), 0)
    const total = lines.reduce((sum, line) => sum + line.qty, 0)
    const text = lines.map(line => `${Math.min(line.shipped, line.qty)}/${line.qty} ${named(line.item, line.qty)}`).join(', ')
    return { text: `Delivered to ${who} · ${text}`, value: done, max: total }
  }
  const value = Math.min(shipped, qty)
  return { text: `Delivered to ${who} · ${value}/${qty} ${named(item, qty)}`, value, max: qty }
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
export function goalLabel(checkId: string, item: string, qty: number, shipped: number, done: boolean, memory = 0) {
  if (checkId === 'done') {
    const name = item === 'steel' ? 'Steel' : item === 'ore' ? 'Ore' : item === 'grate' ? 'Grates' : item === 'ingot' ? 'Ingots' : named(item, qty)
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
    vein: 'Vein D ore at the depot',
    haul: 'A haul of steel or a grate',
    plate: 'A plate at the depot',
    blank: 'A blank at the depot',
    winch: 'The winch crate at the depot',
    lamp: 'The lamp crate at the depot',
  }
  const value = done ? 1 : 0
  return { text: `${places[checkId] ?? checkId} ${value}/1`, value, max: 1 }
}
