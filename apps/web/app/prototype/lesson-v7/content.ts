import type { Village } from '../../../../../packages/sim/src/packs/beginner/world'

/**
 * Presentation copy the v7 screen needs on top of the shipped lesson data.
 * Goal, theory, hints, solved text, scenes and check logic still come from `packages/sim`.
 */
export interface Ghost { offset: number; text: string }
export interface LearnedPart { find: RegExp; tone: 'gold' | 'mint'; label: string }
export interface LessonV7 {
  id: string
  /** Prefill that leaves exactly one new thing to type. */
  starter: string
  /** Caret offset in `starter` when the lesson opens. */
  caret: number
  /** Steps before Run, in the order the player does them. Run is always the last step. */
  write: string
  /** True once the code has the thing `write` asks for. */
  ready(code: string): boolean
  /** Placeholder shown at the edit point while it is still empty. */
  ghost(code: string): Ghost | undefined
  /** One label per shipped check, in the same order. */
  checks: readonly string[]
  /** Scene box, in scene units, that must stay in view. */
  camera: { x0: number; y0: number; x1: number; y1: number }
  /** Why a check is still open after a run without errors. */
  miss(world: Village): string
  /** Names for the parts of the player's own line, shown on the solved card. */
  learned: readonly LearnedPart[]
  /** Subject of error messages, such as "Mila needs some words". */
  needsWords: string
  /** Predict lessons: the question asked before Run. The choices and answer are the shipped ones. */
  guess?: string
  /** Shipped theory sentences that describe the old starter, with the wording that fits the prefill. */
  reword?: readonly [from: string, to: string][]
}

/** Code without comment lines. */
export function body(code: string) {
  return code.split('\n').filter(line => !line.trim().startsWith('//')).join('\n')
}
const filledString = /"[^"\n]*[^"\s][^"\n]*"|'[^'\n]*[^'\s][^'\n]*'/g
const strings = (code: string) => body(code).match(filledString) ?? []

const hello = `// Mila says the words between the quotes.
say("")`
const sign = `// Put the ticket's words in double quotes.
paintSign()`
const order = `// Lines run from top to bottom.
say("All aboard")
`

export const lessonsV7: readonly LessonV7[] = [
  {
    id: 'hello',
    starter: hello,
    caret: hello.indexOf('""') + 1,
    write: 'Type a greeting between the quotes',
    ready: code => strings(code).length > 0,
    ghost(code) {
      const at = code.indexOf('""')
      return at < 0 ? undefined : { offset: at + 1, text: 'type a greeting' }
    },
    checks: ['You gave Mila a greeting', 'Mila says it and waves'],
    camera: { x0: 262, y0: 205, x1: 578, y1: 475 },
    miss: () => 'Nothing happened yet. Write say("…") on its own line, with a greeting between the quotes.',
    learned: [
      { find: /say/, tone: 'gold', label: 'function: a job with a name' },
      { find: /(["']).*\1/, tone: 'mint', label: 'string: words in quotes' },
    ],
    needsWords: 'Mila needs some words.',
    reword: [['Write your instruction below the TODO comment.', 'The line below a comment is your instruction.']],
  },
  {
    id: 'sign-spaces',
    starter: sign,
    caret: sign.indexOf('()') + 1,
    write: 'Copy the ticket name, in "quotes"',
    ready: code => strings(code).length > 0,
    ghost(code) {
      const at = code.indexOf('paintSign()')
      return at < 0 ? undefined : { offset: at + 'paintSign('.length, text: '"name from the ticket"' }
    },
    checks: ['The sign matches the ticket exactly'],
    camera: { x0: 22, y0: 24, x1: 328, y1: 236 },
    miss(world) {
      const made = world.sign, want = 'Moon Ferry'
      if (!made) return 'The sign is still blank. Use paintSign("…") to letter it.'
      const says = 'The sign says “' + made + '”. The ticket says “' + want + '”. '
      if (made.toLowerCase() === want.toLowerCase()) return says + 'Capital letters count.'
      if (made.trim() === want) return says + 'There is an extra space at the start or end.'
      if (made.replace(/\s+/g, '') === want.replace(/\s+/g, '')) return says + 'The space between the words counts.'
      return says + 'Copy it letter for letter.'
    },
    learned: [
      { find: /(["']).*\1/, tone: 'mint', label: 'string: spaces and capitals stay as typed' },
    ],
    needsWords: 'The sign needs some words.',
  },
  {
    id: 'call-order',
    starter: order,
    caret: order.length,
    write: 'Add a second say line',
    ready: code => strings(code).length > 1,
    ghost(code) {
      if ((body(code).match(/\bsay\b/g) ?? []).length !== 1 || !/\n[ \t]*$/.test(code)) return
      return { offset: code.length, text: 'say("…")' }
    },
    checks: ['“All aboard” shows first', 'Your departure message shows second'],
    camera: { x0: 106, y0: 22, x1: 400, y1: 252 },
    miss(world) {
      const said = world.announcements
      if (!said.length) return 'The board is still empty. Each say("…") line adds one message.'
      if (said[0] !== 'All aboard') return '“' + said[0] + '” showed first. The top line runs first, so keep say("All aboard") on top.'
      if (said.length === 1) return 'Only one message showed. Add a second say("…") on the line under it.'
      if (said.length > 2) return 'The board has room for two messages. Keep two say lines.'
      return 'Both messages say “All aboard”. Give the second line its own departure words.'
    },
    learned: [
      { find: /say\([^\n]*\)/, tone: 'gold', label: 'top line: runs first' },
      { find: /say\([^\n]*\)(?![\s\S]*say\()/, tone: 'mint', label: 'next line: runs after it' },
    ],
    needsWords: 'The board needs some words.',
    guess: 'Guess first: which message will the board show on top?',
  },
]

export const lessonV7 = (id: string | null | undefined) => lessonsV7.find(lesson => lesson.id === id)
