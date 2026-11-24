import { factoryBricks, kettlewick, questList } from '../packages/sim/src/v8'
import { affordances } from './assessment'
import { humanTime, type Pace, type ProfileId } from './human'
import { players, type Stage } from './policy'
import { minutes, type Event, type Run } from './playthrough'

export interface Wait {
  quest: string
  from: number
  to: number
  minutes: number
}

export interface QuestHuman {
  id: string
  bot: number
  reading: number
  writing: number
  debugging: number
  shop: number
  total: number
  cumulative: number
  words: number
  lines: number
  apis: string[]
  concepts: string[]
  debugRuns: number
  listings: number
  decisions: number
  machines: number
  purchases: number
}

export interface ProfileEstimate {
  id: ProfileId
  label: string
  quests: QuestHuman[]
  totals: Pick<QuestHuman, 'bot' | 'reading' | 'writing' | 'debugging' | 'shop' | 'total'>
}

export interface HumanWarning {
  id: string
  text: string
}

export interface HumanEstimate {
  profiles: ProfileEstimate[]
  warnings: HumanWarning[]
  waits: Wait[]
}

const toCents = (n: number) => Math.round(n * 100)
const fromCents = (n: number) => n / 100
const cent = (n: number) => fromCents(toCents(n))

export function countWords(text: string) {
  return text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g)?.length ?? 0
}

/** Comments are removed. Strings stay, so a recipe literal is still visible. */
export function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ')
}

function nonBlank(source: string) {
  return source.split('\n').map(line => line.trim()).filter(line => line !== '')
}

/** Insertions plus deletions of non-blank lines. A changed line counts as one of each. */
export function changedLines(before: Record<string, string>, after: Record<string, string>) {
  const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  let changed = 0
  for (const path of paths) changed += lineEdits(nonBlank(before[path] ?? ''), nonBlank(after[path] ?? ''))
  return changed
}

function lineEdits(before: string[], after: string[]) {
  if (before.length === 0) return after.length
  if (after.length === 0) return before.length
  if (before.length === after.length && before.every((line, index) => line === after[index])) return 0
  const cols = after.length + 1
  let prev = new Array<number>(cols).fill(0)
  let curr = new Array<number>(cols).fill(0)
  for (let i = 1; i <= before.length; i++) {
    const left = before[i - 1]
    curr[0] = 0
    for (let j = 1; j <= after.length; j++)
      curr[j] = left === after[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1])
    ;[prev, curr] = [curr, prev]
  }
  const shared = prev[after.length]
  return before.length + after.length - 2 * shared
}

export function apiCatalog() {
  const names = factoryBricks(kettlewick)
    .filter(brick => brick.signature.includes('('))
    .map(brick => brick.name)
  names.push('on')
  return [...new Set(names)]
}

/** Works calls in the source. `cart.mine(...)` is `drone.mine` when that method belongs to one brick. */
export function apiCallsIn(source: string, names: readonly string[]) {
  const code = stripComments(source)
  const callPattern = /(?:^|[^\w.])([A-Za-z_][\w]*)(?:\.([A-Za-z_][\w]*))?\s*\(/g
  const known = new Set(names)
  const byMethod = new Map<string, string[]>()
  for (const name of names) {
    const dot = name.lastIndexOf('.')
    if (dot < 0) continue
    const method = name.slice(dot + 1)
    const list = byMethod.get(method) ?? []
    list.push(name)
    byMethod.set(method, list)
  }
  const found = new Set<string>()
  for (const match of code.matchAll(callPattern)) {
    const receiver = match[1]
    const method = match[2]
    if (!receiver) continue
    if (!method) {
      if (known.has(receiver)) found.add(receiver)
      continue
    }
    const qualified = `${receiver}.${method}`
    if (known.has(qualified)) found.add(qualified)
    else {
      const owners = byMethod.get(method) ?? []
      if (owners.length === 1) found.add(owners[0])
    }
  }
  return [...found].sort()
}

export function conceptsIn(source: string) {
  const code = stripComments(source)
  return humanTime.concepts.filter(concept => concept.pattern.test(code)).map(concept => concept.id)
}

function projectSource(files: Record<string, string>) {
  return Object.keys(files).sort().map(path => stripComments(files[path])).join('\n')
}

function isCodeChange(event: Event): event is Extract<Event, { kind: 'code change' }> {
  return event.kind === 'code change'
}

function questWords(quest: (typeof questList)[number]) {
  const parts = [
    quest.from, quest.role, quest.title, quest.ask, quest.goal, quest.need,
    humanTime.reading.deliverySentence, quest.nudge,
    String(quest.pay), String(quest.xp),
  ]
  for (const test of quest.tests) parts.push(test.text, test.explain)
  if (quest.unlock) parts.push(quest.unlock.signature)
  if (quest.trigger) parts.push(humanTime.reading.triggerText[quest.trigger])
  if (quest.gift) parts.push(quest.gift)
  if (quest.install) parts.push(quest.install)
  return countWords(parts.join('\n'))
}

interface QuestFacts {
  id: string
  bot: number
  words: number
  lines: number
  apis: string[]
  concepts: string[]
  debugRuns: number
  shopSeconds: number
  listings: number
  decisions: number
  machines: number
  purchases: number
}

function owner(event: Event, first: string) {
  return event.quest ?? first
}

function shopFacts(run: Run, questId: string, first: string) {
  const onQuest = (event: Event) => owner(event, first) === questId
  const listings = run.events.filter(event => onQuest(event) && event.kind === 'unlock' && event.detail.startsWith('Shop · ')).length
  const machines = run.events.filter(event => onQuest(event) && event.kind === 'unlock' && event.detail.startsWith('Machine · ')).length
  const decisions = affordances.filter(([, quest]) => quest === questId).length
  const purchases = run.events.filter(event => onQuest(event) && event.kind === 'purchase').length
  const { secondsPerListing, secondsPerDecision, secondsPerMachine } = humanTime.shop
  return {
    listings, machines, decisions, purchases,
    shopSeconds: listings * secondsPerListing + (decisions + purchases) * secondsPerDecision + machines * secondsPerMachine,
  }
}

function debugRuns(changed: boolean, apis: number, concepts: number) {
  if (!changed) return 0
  const { baseRuns, runsPerApi, runsPerConcept, maxRuns } = humanTime.debugging
  const expected = baseRuns + concepts * runsPerConcept + apis * runsPerApi
  return Math.min(maxRuns, expected)
}

function factsFor(run: Run): QuestFacts[] {
  const catalog = apiCatalog()
  const edits = run.events.filter(isCodeChange)
  let stage: Stage = edits[0]?.from ?? run.quests[0]?.stage ?? 'manual'
  const seenApis = new Set(apiCallsIn(projectSource(players[stage]), catalog))
  const seenConcepts = new Set(conceptsIn(projectSource(players[stage])))
  const first = run.quests[0]?.id ?? ''
  const facts: QuestFacts[] = []
  for (const quest of run.quests) {
    let edit: Extract<Event, { kind: 'code change' }> | undefined
    for (let i = edits.length - 1; i >= 0; i--) {
      if (edits[i]?.quest === quest.id) {
        edit = edits[i]
        break
      }
    }
    const next = edit?.to ?? quest.stage
    const source = projectSource(players[next])
    const apis = apiCallsIn(source, catalog).filter(name => !seenApis.has(name))
    const concepts = conceptsIn(source).filter(id => !seenConcepts.has(id))
    apis.forEach(name => seenApis.add(name))
    concepts.forEach(id => seenConcepts.add(id))
    const def = questList.find(item => item.id === quest.id)
    facts.push({
      id: quest.id,
      bot: minutes(quest.finish.tick - quest.start.tick),
      words: def ? questWords(def) : 0,
      lines: changedLines(players[stage], players[next]),
      apis, concepts,
      debugRuns: debugRuns(!!edit, apis.length, concepts.length),
      ...shopFacts(run, quest.id, first),
    })
    stage = next
  }
  return facts
}

function scale(facts: QuestFacts, pace: Pace) {
  const { reading, writing, debugging } = humanTime
  const readingMin = facts.words / reading.wordsPerMinute * pace.reading
  const writingMin = (
    facts.lines * writing.secondsPerLine * pace.writing
    + (facts.apis.length * writing.secondsPerApi + facts.concepts.length * writing.secondsPerConcept) * pace.learning
  ) / 60
  const debuggingMin = facts.debugRuns * debugging.secondsPerRun * pace.debug / 60
  const shopMin = facts.shopSeconds * pace.shop / 60
  const bot = toCents(facts.bot)
  const readingC = toCents(readingMin)
  const writingC = toCents(writingMin)
  const debuggingC = toCents(debuggingMin)
  const shopC = toCents(shopMin)
  const total = bot + readingC + writingC + debuggingC + shopC
  return {
    bot: fromCents(bot),
    reading: fromCents(readingC),
    writing: fromCents(writingC),
    debugging: fromCents(debuggingC),
    shop: fromCents(shopC),
    total: fromCents(total),
    totalCents: total,
  }
}

/** Machine time from one code change to the next, and from the start until the first edit. */
export function waitingStretches(run: Run): Wait[] {
  const end = run.quests.at(-1)?.finish.tick ?? 0
  const marks = [...new Set([0, ...run.events.filter(event => event.kind === 'code change').map(event => event.tick), end])]
    .sort((a, b) => a - b)
  const waits: Wait[] = []
  for (let i = 0; i < marks.length - 1; i++) {
    const from = marks[i]
    const to = marks[i + 1]
    if (to <= from) continue
    const covered = run.quests.filter(quest => quest.finish.tick > from && quest.start.tick < to).map(quest => quest.id)
    waits.push({ quest: covered.join('+') || run.quests.at(-1)?.id || 'run', from, to, minutes: minutes(to - from) })
  }
  return waits
}

export function humanWarnings(quests: { id: string; total: number }[], waits: Wait[]): HumanWarning[] {
  const warnings: HumanWarning[] = []
  for (const quest of quests) {
    if (quest.total > humanTime.maxQuestMinutes)
      warnings.push({
        id: `human/quest/${quest.id}`,
        text: `${quest.total.toFixed(2)} min for the average player, above ${humanTime.maxQuestMinutes} min.`,
      })
  }
  for (const wait of waits) {
    if (cent(wait.minutes) > humanTime.maxWaitMinutes)
      warnings.push({
        id: `human/wait/${wait.quest}`,
        text: `${cent(wait.minutes).toFixed(2)} min of machine time with no code change (ticks ${wait.from}–${wait.to}) on ${wait.quest}, above ${humanTime.maxWaitMinutes} min.`,
      })
  }
  return warnings
}

export function estimateHuman(run: Run): HumanEstimate {
  const facts = factsFor(run)
  const waits = waitingStretches(run)
  const profiles = humanTime.profileOrder.map(id => {
    const profile = humanTime.profiles[id]
    let spent = 0
    const quests = facts.map(fact => {
      const cost = scale(fact, profile.pace)
      spent += cost.totalCents
      const { totalCents, ...shown } = cost
      return { ...fact, ...shown, cumulative: fromCents(spent) }
    })
    const totals = quests.reduce((sum, quest) => ({
      bot: sum.bot + toCents(quest.bot),
      reading: sum.reading + toCents(quest.reading),
      writing: sum.writing + toCents(quest.writing),
      debugging: sum.debugging + toCents(quest.debugging),
      shop: sum.shop + toCents(quest.shop),
      total: sum.total + toCents(quest.total),
    }), { bot: 0, reading: 0, writing: 0, debugging: 0, shop: 0, total: 0 })
    const shown = {
      bot: fromCents(totals.bot),
      reading: fromCents(totals.reading),
      writing: fromCents(totals.writing),
      debugging: fromCents(totals.debugging),
      shop: fromCents(totals.shop),
      total: fromCents(totals.total),
    }
    return { id, label: profile.label, quests, totals: shown }
  })
  const average = profiles.find(profile => profile.id === humanTime.defaultProfile) ?? profiles[0]
  return { profiles, waits, warnings: humanWarnings(average?.quests ?? [], waits) }
}

function fmt(n: number) {
  return n.toFixed(2)
}

function formatRuns(n: number) {
  const shown = Math.round(n * 10) / 10
  return Number.isInteger(shown) ? String(shown) : shown.toFixed(1)
}

function conceptLabel(id: string) {
  return humanTime.concepts.find(concept => concept.id === id)?.label ?? id
}

function profileTable(profile: ProfileEstimate) {
  const rows = [
    `### ${profile.label}`, '',
    '| Quest | Bot | Reading | Writing | Debugging | Shop | Human | Cumulative |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
  ]
  for (const quest of profile.quests)
    rows.push(`| ${quest.id} | ${fmt(quest.bot)} | ${fmt(quest.reading)} | ${fmt(quest.writing)} | ${fmt(quest.debugging)} | ${fmt(quest.shop)} | ${fmt(quest.total)} | ${fmt(quest.cumulative)} |`)
  const totals = profile.totals
  rows.push(`| **Total** | **${fmt(totals.bot)}** | **${fmt(totals.reading)}** | **${fmt(totals.writing)}** | **${fmt(totals.debugging)}** | **${fmt(totals.shop)}** | **${fmt(totals.total)}** | **${fmt(totals.total)}** |`)
  return rows
}

export function humanMarkdown(run: Run) {
  const estimate = estimateHuman(run)
  const average = estimate.profiles.find(profile => profile.id === humanTime.defaultProfile) ?? estimate.profiles[0]
  const longest = estimate.waits.reduce<Wait | undefined>((best, wait) => !best || wait.minutes > best.minutes ? wait : best, undefined)
  const rows = [
    '## Human time', '',
    `The tick clock is the works. These minutes add reading, writing, debugging, and the shop. The rates and the profiles are [sim/human.ts](../../sim/human.ts). ${humanTime.profiles[humanTime.defaultProfile].label} is the default. A warning here does not fail the balance gate.`, '',
    'Writing counts non-blank lines inserted or deleted between the previous reference project and the next, plus a one-time cost for each works API call and each concept the first time it appears. A library is charged on the quest that deploys it. Debugging is the expected failed runs, higher when a concept is new, times the time to run and inspect. The successful run is the bot column.', '',
  ]
  if (average) rows.push(...profileTable(average), '')
  rows.push(
    '### Profiles', '',
    'Bot minutes are the same run. The other columns scale with the profile.', '',
    '| Profile | Bot | Reading | Writing | Debugging | Shop | Human |',
    '|---|---:|---:|---:|---:|---:|---:|',
  )
  for (const profile of estimate.profiles) {
    const totals = profile.totals
    rows.push(`| ${profile.label} | ${fmt(totals.bot)} | ${fmt(totals.reading)} | ${fmt(totals.writing)} | ${fmt(totals.debugging)} | ${fmt(totals.shop)} | ${fmt(totals.total)} |`)
  }
  rows.push('', '### Warnings', '')
  if (estimate.warnings.length === 0) rows.push('None.')
  else {
    rows.push('| Warning | Measurement |', '|---|---|')
    for (const warning of estimate.warnings) rows.push(`| \`${warning.id}\` | ${warning.text} |`)
  }
  if (longest)
    rows.push('', `Longest machine stretch with no code change was ${fmt(cent(longest.minutes))} min on ${longest.quest} (ticks ${longest.from}–${longest.to}). The warning line is ${humanTime.maxWaitMinutes} min.`)
  rows.push('', '<details>', '<summary>Fast, new to TypeScript, and the counts behind the minutes</summary>', '')
  for (const profile of estimate.profiles) {
    if (profile.id === humanTime.defaultProfile) continue
    rows.push(...profileTable(profile), '')
  }
  rows.push(
    'Counts are shared by every profile. Debug runs are the expectation before a profile scales the minutes.', '',
    '| Quest | Words | Lines | New APIs | New concepts | Debug runs | Listings | Decisions | Machines |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  )
  for (const quest of average?.quests ?? [])
    rows.push(`| ${quest.id} | ${quest.words} | ${quest.lines} | ${quest.apis.length} | ${quest.concepts.length} | ${formatRuns(quest.debugRuns)} | ${quest.listings} | ${quest.decisions} | ${quest.machines} |`)
  rows.push('', 'First-time API calls and concepts:')
  for (const quest of average?.quests ?? []) {
    const apis = quest.apis.join(', ') || 'none'
    const concepts = quest.concepts.map(conceptLabel).join(', ') || 'none'
    rows.push(`- ${quest.id}: ${apis}. Concepts: ${concepts}.`)
  }
  rows.push('', '</details>')
  return rows
}
