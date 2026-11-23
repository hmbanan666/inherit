import type { Files } from '../../sim/src/framework/pack'
import { playerError } from './player-error'

export interface PlainError {
  file: string
  line: number
  mark: { from: number; to: number }
  title: string
  body: string
  raw: string
}

export class PlayerRunError extends Error {
  diagnostic: PlainError

  constructor(cause: unknown, files: Files, names: readonly string[], example?: string) {
    const message = playerError(cause, names)
    super(message, { cause })
    const raw = cause instanceof Error ? cause.message : message
    const location = /^([\w./-]+\.ts)(?::(\d+))? · /.exec(raw)
    const file = location?.[1] ?? 'main.ts'
    const lines = (files[file] ?? '').split('\n')
    const line = Math.min(lines.length, Number(location?.[2] ?? 1))
    const text = lines[line - 1]
    const start = lines.slice(0, line - 1).reduce((sum, value) => sum + value.length + 1, 0)
    const { title, body, token } = explain(message, text, line, example)
    const from = start + Math.max(0, text.indexOf(token))
    this.diagnostic = { raw, file, line, title, body, mark: { from, to: from + token.length } }
  }
}

function explain(message: string, text: string, line: number, example?: string) {
  const result = (title: string, body: string, token = text.trim()) => ({ title, body, token })
  const curly = /[“”‘’]/.exec(text)
  if (curly && /invalid character/i.test(message))
    return result('Those are curly quotes', 'Retype the curly quotes as straight quotes (").', curly[0])
  const unknown = /Unknown name “(.+?)”\.(?: Did you mean “(.+?)”\?)?/.exec(message)
  const words = /\b(?:say|paintSign)\(\s*([A-Za-z]+(?: [A-Za-z]+)*)\s*\)/.exec(text)?.[1]
  if (words && (unknown?.[1] === words.split(' ')[0] || /expected/i.test(message)))
    return result('The words need quotes', 'Put double quotes around “' + words + '”.', words)
  if (unknown) {
    const [, name, suggestion] = unknown
    if (suggestion && name.toLowerCase() === suggestion.toLowerCase())
      return result('Capital letters matter in names', 'Use the spelling “' + suggestion + '”.', name)
    return result('Check the spelling on line ' + line, suggestion ? 'Did you mean “' + suggestion + '”?' : 'Check the name “' + name + '” against the reference.', name)
  }
  if (/matching quote/i.test(message))
    return result('A quote is missing', 'Add a matching quote after the words.', /(["'])[\s\S]*$/.exec(text)?.[0])
  const bracket = /Add the closing (.) to match/.exec(message)?.[1]
  if (bracket) return result('A bracket is missing', 'Add the closing ' + bracket + '.', ({ ')': '(', ']': '[', '}': '{' })[bracket])
  if (/nonblank string/i.test(message))
    return result('No words yet', 'Type some words between the quotes.', /"\s*"|'\s*'/.exec(text)?.[0])
  return result('Line ' + line + ' is not quite code yet', example ? 'Compare this line with ' + example.split('\n')[0] + '.' : 'Check this line against the functions reference.')
}
