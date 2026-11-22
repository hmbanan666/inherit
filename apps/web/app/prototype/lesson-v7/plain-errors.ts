export interface PlainError {
  title: string
  /** Plain-words fix. Text between backticks is code. */
  body: string
  line?: number
  /** Character range in the source to underline. */
  mark?: { from: number; to: number }
  /** The message the runner produced, kept for the details disclosure. */
  raw: string
}

interface Context {
  /** Function names the lesson has introduced. */
  names: readonly string[]
  /** A working line from the lesson's theory. */
  example: string
  /** Lesson voice for a missing string, such as "Mila needs some words." */
  needsWords: string
}

/** Turn a runner message into one sentence about what is wrong and one about what to type. */
export function plainError(raw: string, code: string, context: Context): PlainError {
  const located = /^[\w./-]+\.ts(?::(\d+))? · ([\s\S]*)$/.exec(raw)
  const message = located?.[2] ?? raw
  const line = located?.[1] ? Number(located[1]) : undefined
  const lines = code.split('\n')
  const text = line ? lines[line - 1] ?? '' : ''
  const start = line ? lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0) : 0
  const indent = text.length - text.trimStart().length
  const whole = line && text.trim() ? { from: start + indent, to: start + text.trimEnd().length } : undefined
  const on = line ? ' on line ' + line : ''
  const result = (title: string, body: string, mark = whole): PlainError => ({ title, body, line, mark, raw })
  const token = (word: string) => {
    const at = text.search(new RegExp('(?<![\\w$])' + word.replace(/[$]/g, '\\$&') + '(?![\\w$])'))
    return at < 0 ? whole : { from: start + at, to: start + at + word.length }
  }
  const call = /([A-Za-z_$][\w$]*)\s*\(/.exec(text)?.[1]
  const inside = /\(([^)]*)\)?/.exec(text)?.[1]?.trim() ?? ''
  const bareWords = !!call && !!inside && !/["'`]/.test(inside) && /^[A-Za-z]/.test(inside)

  if (/[“”‘’]/.test(text) && /invalid character/i.test(message))
    return result('Those are curly quotes', 'Code needs straight double quotes: `"`. Retype the quotes' + on + '.')

  const unknown = /Unknown name “(.+?)”\.(?: Did you mean “(.+?)”\?)?/.exec(message)
  if (unknown) {
    const [, name, suggestion] = unknown
    if (suggestion && name.toLowerCase() === suggestion.toLowerCase())
      return result('Capital letters matter in names', 'Write `' + suggestion + '`, not `' + name + '`' + on + '.', token(name))
    if (suggestion)
      return result('Check the spelling' + on, 'The game does not know `' + name + '`. Did you mean `' + suggestion + '`?', token(name))
    if (bareWords && inside.split(/\s+/)[0] === name)
      return result('The words need quotes', 'Put double quotes around your words' + on + ': `' + call + '("' + inside + '")`.')
    return result('Check the spelling' + on, 'The game does not know `' + name + '`. Use one of these names: ' +
      context.names.map(n => '`' + n + '`').join(', ') + '.', token(name))
  }
  if (bareWords && /expected/i.test(message))
    return result('The words need quotes', 'Put double quotes around your words' + on + ': `' + call + '("' + inside + '")`.')
  if (/matching quote/i.test(message))
    return result('A quote is missing', 'Words start and end with a double quote. Add `"` after your words' + on + '.')
  const bracket = /Add the closing (.) to match/.exec(message)
  if (bracket)
    return result('A bracket is missing', 'Every opening bracket needs its partner. Add `' + bracket[1] + '` at the end of line ' + (line ?? 1) + '.')
  if (/nonblank string/i.test(message))
    return result('No words yet', context.needsWords + ' Type them between the quotes' + on + (call ? ', like `' + call + '("…")`.' : '.'))
  return result((line ? 'Line ' + line : 'Your code') + ' is not quite code yet',
    'Compare it with this working line: `' + context.example.split('\n')[0] + '`.')
}
