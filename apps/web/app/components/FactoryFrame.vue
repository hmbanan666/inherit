<script setup lang="ts">
import { apiBook, canTake, chainReady, declarations, inspectMachine, kettlewick, factoryBricks, machineList, questHold, shopFor, levelSpan, readChecks, functionUnlocked, freshBrick, triggerUnlocked, type ConsoleLine, type World } from '@inherit/sim/v8'
import ApiBook from './ApiBook.vue'
import PaneSplit from './PaneSplit.vue'
import { CircleAlert, Coins, Cpu, Sparkles, TextCursor, Timer, TriangleAlert, Unlock } from '@lucide/vue'
import { editorKey } from '../lib/editor'
import { archiveFactorySave, recoverFactorySave, type FactoryCommand, type FactoryFrame, type FactorySave } from '../lib/factoryProtocol'
import {
  checksPanePx, clampMapHeight, codeColumnPx, consoleBody, defaultMapHeight, editorHeaderPx, filesStorageKey, fileTreePx, mapHeightKey,
  questRailPx, readFilesOpen, readMapHeight, readPaneWidth, readSideTab, sideTabKey, sideWidthKey, sideWidthMax, sideWidthMin,
  stackCodeColumn, tightCodeColumn, treeRailPx, treeWidthKey, treeWidthMax, treeWidthMin, worldGapPx, worldInsetPx,
} from '../lib/factoryLayout'
import { runnableExports } from '../lib/runGlyph'
import { deliveryNote, firstOpenTest, quantityLabel, insertQuestNote, questComment } from '../lib/questNote'
import { cpuTitle, readCpu, steadyCpu, type CpuHold, type CpuMeter } from '../lib/cpuMeter'
import { droneStatusLine, grantNote, questNextStep, steadyLine, type CartCue, type SteadyLine } from '../lib/questStep'
import { knownLocation, markHostRead, noteHost, type HostNotice } from '../lib/hostNotice'
import { reduceApiBook } from '../lib/apiBookState'
import { insertTriggerExample } from '../lib/triggerNote'

useHead({ title: 'Kettlewick Works · Inherit' })
const bricks = factoryBricks(kettlewick)
const lockedWorld = { questId: undefined, cleared: [] as string[], bought: [] as string[], automation: { run: false, events: false, tick: false } }
const visibleBricks = computed(() => bricks.filter(brick => functionUnlocked(world.value ?? lockedWorld, brick.name)))
const freshNames = computed(() => new Set(bricks.filter(brick => freshBrick(world.value, brick.name)).map(brick => brick.name)))
const droneNames = computed(() => world.value?.drones.map(drone => drone.name) ?? ['drone-1'])
const api = ref(declarations(bricks.filter(brick => functionUnlocked(lockedWorld, brick.name)), new Set(), ['drone-1']))
const bookSections = computed(() => apiBook(bricks, world.value ?? lockedWorld))
const catalog = computed(() => shopFor(world.value ?? { cleared: [], bought: [] }))
const bookOpen = ref(false)
const files = shallowRef({ ...kettlewick.files })
const deployed = shallowRef(kettlewick.files)
const dirty = computed(() => Object.keys(files.value).length !== Object.keys(deployed.value).length ||
  Object.entries(files.value).some(([path, source]) => source !== deployed.value[path]))
const activeFile = ref('main.ts')
const navigation = ref({ file: 'main.ts', line: 1 })
const cursor = ref({ line: 1, column: 1 })
const notesKey = 'inherit.v8.notes'
const notes = ref<string[]>([])
const world = shallowRef<World>()
watch([visibleBricks, freshNames, droneNames], () => { api.value = declarations(visibleBricks.value, freshNames.value, droneNames.value) })
const scriptNotice = ref<HostNotice>()
const saveNotice = ref<HostNotice>()
const floorNotice = ref<HostNotice>()
const pending = ref(true)
const panels = ['Charts'] as const
const tool = ref<typeof panels[number]>()
const side = ref<'tests' | 'console'>('tests')
const pickedTest = ref('')
const consoleFilter = ref<'all' | 'problems'>('all')
const seenSeq = ref(0)
const blankConsole = ref(false)
const zone = ref<'quests' | 'shop' | 'machines'>('quests')
const selectedId = ref('')
const machines = computed(() => world.value ? machineList(world.value) : [])
const inspected = computed(() => {
  const current = world.value
  return current && selectedId.value ? inspectMachine(current, kettlewick, selectedId.value) : undefined
})
function openMachine(id: string) {
  selectedId.value = id
  zone.value = 'machines'
}
const triggerLabel: Record<string, string> = {
  run: 'Run',
  events: 'on(event, fn)',
  tick: 'Loop',
}
const questRailCss = questRailPx + 'px'
const worldGapCss = worldGapPx + 'px'
const worldInsetCss = worldInsetPx + 'px'
const headerCss = editorHeaderPx + 'px'
const checksPaneCss = computed(() => sideWidth.value + 'px')
const filesOpen = ref(false)
const mapHeight = ref(defaultMapHeight())
const treeWidth = ref(fileTreePx)
const sideWidth = ref(checksPanePx)
const editorBay = ref<HTMLElement | null>(null)
const bayWidth = ref(0)
const treeColumnCss = computed(() => (filesOpen.value ? treeWidth.value : treeRailPx) + 'px')
const mapRowCss = computed(() => mapHeight.value + '%')
let filesReady = false
let sideReady = false
watch(filesOpen, (open) => {
  if (!filesReady) return
  try { localStorage.setItem(filesStorageKey, open ? 'open' : 'closed') }
  catch { /* Keep the choice for this session. */ }
})
watch(side, (tab) => {
  if (!sideReady) return
  try { localStorage.setItem(sideTabKey, tab) }
  catch { /* Keep the choice for this session. */ }
})
function setMapHeight(value: number) {
  mapHeight.value = clampMapHeight(value)
  try { localStorage.setItem(mapHeightKey, String(Math.round(mapHeight.value * 10) / 10)) }
  catch { /* Keep the height for this session. */ }
}
function rememberWidth(key: string, value: number) {
  try { localStorage.setItem(key, String(value)) }
  catch { /* Keep the width for this session. */ }
}
function setTreeWidth(value: number) {
  treeWidth.value = readPaneWidth(String(value), treeWidthMin, treeWidthMax, fileTreePx)
  rememberWidth(treeWidthKey, treeWidth.value)
}
function setSideWidth(value: number) {
  sideWidth.value = readPaneWidth(String(value), sideWidthMin, sideWidthMax, checksPanePx)
  rememberWidth(sideWidthKey, sideWidth.value)
}
function onMap(event: PointerEvent) {
  const stage = (event.currentTarget as HTMLElement).parentElement
  const rect = stage?.getBoundingClientRect()
  if (!rect || rect.height < 1) return
  setMapHeight(((event.clientY - rect.top) / rect.height) * 100)
}
function onTree(event: PointerEvent) {
  const rect = editorBay.value?.getBoundingClientRect()
  if (!rect) return
  filesOpen.value = true
  setTreeWidth(event.clientX - rect.left)
}
function onSide(event: PointerEvent) {
  const rect = editorBay.value?.getBoundingClientRect()
  if (!rect) return
  setSideWidth(rect.right - event.clientX)
}
function nudgeTree(direction: -1 | 1) {
  filesOpen.value = true
  setTreeWidth(treeWidth.value + direction * 16)
}
function nudgeSide(direction: -1 | 1) {
  setSideWidth(sideWidth.value - direction * 16)
}
const codeRoom = computed(() => codeColumnPx(
  bayWidth.value,
  filesOpen.value ? treeWidth.value : treeRailPx,
  sideWidth.value,
))
const stackChecks = computed(() => stackCodeColumn(codeRoom.value))
const tightEditor = computed(() => tightCodeColumn(codeRoom.value))
const activeQuest = computed(() => kettlewick.questList?.find(quest => quest.id === world.value?.questId))
const available = computed(() => {
  const current = world.value
  if (!current || current.questId) return []
  return kettlewick.questList?.filter(quest => !current.cleared.includes(quest.id) && current.level >= quest.needLevel && chainReady(current, quest)) ?? []
})
const offers = computed(() => available.value.map(quest => ({
  quest,
  hold: world.value ? questHold(world.value, quest) : undefined,
})))
const readingId = ref<string>()
const reading = computed(() => available.value.find(quest => quest.id === readingId.value))
const readingHold = computed(() => reading.value && world.value ? questHold(world.value, reading.value) : undefined)
const readingTake = computed(() => !!reading.value && !!world.value && canTake(world.value, reading.value))
const shownQuest = computed(() => activeQuest.value ?? reading.value)
const ready = computed(() => !!activeQuest.value && !!world.value?.checks.length && world.value.checks.every(check => check.status === 'green'))
const shippedCount = computed(() => {
  const quest = shownQuest.value
  const current = world.value
  if (!quest || !current) return 0
  return current.orders.find(order => order.id === quest.id)?.shipped ?? 0
})
const quantity = computed(() => {
  const quest = shownQuest.value
  if (!quest) return undefined
  const order = world.value?.orders.find(item => item.id === quest.id)
  const lines = order?.lines ?? quest.lines?.map(line => ({ ...line, shipped: 0 }))
  return quantityLabel(quest.from, quest.item, quest.qty, shippedCount.value, lines)
})
const needText = computed(() => shownQuest.value ? deliveryNote(shownQuest.value.need) : '')
const testRows = computed(() => {
  const quest = shownQuest.value
  const current = world.value
  if (!quest) return []
  const live = current && current.questId === quest.id ? readChecks(current, quest) : undefined
  return quest.tests.map(test => {
    const reading = live?.find(item => item.id === test.id)
    return {
      id: test.id,
      text: reading?.text ?? test.text,
      explain: test.explain,
      state: reading?.state ?? 'pending' as const,
      reason: reading?.reason,
    }
  })
})
function grantCall(signature: string) {
  return signature.split(':')[0] ?? signature
}
function initial(name: string) {
  return name.replace(/^Mayor /, '').slice(0, 1)
}
const pulse = ref(false)
let pulseTimer = 0
watch(ready, (value, previous) => {
  if (!value || previous) return
  pulse.value = true
  window.clearTimeout(pulseTimer)
  pulseTimer = window.setTimeout(() => { pulse.value = false }, 700)
})
const gains = ref<{ id: number; text: string; kind: 'credits' | 'xp' }[]>([])
let gainSerial = 0
let gainTimer = 0
watch(world, (next, previous) => {
  if (!next || !previous || !previous.questId || next.questId) return
  const earned = next.credits - previous.credits
  const xpGain = next.xp - previous.xp
  if (earned <= 0 && xpGain <= 0) return
  const batch: { id: number; text: string; kind: 'credits' | 'xp' }[] = []
  if (earned > 0) batch.push({ id: ++gainSerial, text: `+${earned} credits`, kind: 'credits' })
  if (xpGain > 0) batch.push({ id: ++gainSerial, text: `+${xpGain} XP`, kind: 'xp' })
  gains.value = batch
  window.clearTimeout(gainTimer)
  gainTimer = window.setTimeout(() => { gains.value = [] }, 1200)
})
const hostError = computed(() => [saveNotice.value?.text, floorNotice.value?.text].filter(Boolean).join(' '))
function hostLine(notice: HostNotice | undefined, seq: number): ConsoleLine | undefined {
  if (!notice) return
  return {
    seq, tick: notice.tick, text: notice.text, level: 'error', count: 1,
    file: notice.file, line: notice.line,
  }
}
const hostLines = computed((): ConsoleLine[] => {
  return [hostLine(scriptNotice.value, -1), hostLine(saveNotice.value, -2), hostLine(floorNotice.value, -3)]
    .filter((line): line is ConsoleLine => !!line)
})
function rememberHost(current: HostNotice | undefined, text: string, file?: string, line?: number) {
  return noteHost(current, { text, tick: world.value?.tick ?? 0, file, line })
}
function readHostNotices() {
  scriptNotice.value = markHostRead(scriptNotice.value)
  saveNotice.value = markHostRead(saveNotice.value)
  floorNotice.value = markHostRead(floorNotice.value)
}
const consoleLines = computed(() => [...hostLines.value, ...(blankConsole.value ? [] : (world.value?.console ?? []))])
const unseen = computed(() => {
  if (side.value === 'console') return { count: 0, error: false }
  const fresh = blankConsole.value ? [] : (world.value?.console ?? []).filter(line => line.seq > seenSeq.value)
  const unread = [scriptNotice.value, saveNotice.value, floorNotice.value].filter(notice => notice && !notice.read)
  return { count: fresh.length + unread.length, error: unread.length > 0 || fresh.some(line => line.level === 'error') }
})
watch([side, world, scriptNotice, saveNotice, floorNotice], () => {
  if (blankConsole.value && (world.value?.console.length ?? 0) === 0) blankConsole.value = false
  if (side.value !== 'console') return
  readHostNotices()
  const last = world.value?.console?.at(-1)?.seq ?? 0
  if (last > seenSeq.value) seenSeq.value = last
})
function clearLog() {
  blankConsole.value = true
  seenSeq.value = 0
  send({ kind: 'clear-console' })
}
function openLine(entry: { file: string; line: number }) {
  activeFile.value = entry.file
  navigation.value = { file: entry.file, line: entry.line }
}
const xp = computed(() => {
  const value = world.value?.xp ?? 0
  const span = levelSpan(value)
  if (span.next === null) return { width: '100%', label: `XP ${value}`, title: `Level ${span.level}. ${value} XP.` }
  const into = value - span.start
  const size = span.next - span.start
  return { width: `${Math.min(100, (into / size) * 100)}%`, label: `XP ${into}/${size}`, title: `Level ${span.level}. ${into} / ${size} XP.` }
})
function notesFromBrowser() {
  try {
    const raw = localStorage.getItem(notesKey)
    const parsed = raw ? JSON.parse(raw) as unknown : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch { return [] }
}
function rememberNotes(ids: string[]) {
  notes.value = ids
  try { localStorage.setItem(notesKey, JSON.stringify(ids)) } catch { /* The save still carries the ids. */ }
}
function cartCue(current: World | undefined): CartCue | undefined {
  const drone = current?.drones.find(item => item.task) ?? current?.drones.find(item => item.cargo > 0) ?? current?.drones[0]
  if (!drone) return
  const task = drone.task
  return {
    name: drone.name,
    cargo: drone.cargo,
    capacity: drone.capacity,
    carrying: drone.carrying,
    task: task?.kind ?? null,
    vein: task?.kind === 'mine' ? task.vein : undefined,
    at: task?.kind === 'unload' ? task.at : undefined,
    phase: task?.kind === 'pickup' ? task.phase : undefined,
  }
}
function exportsOnTick(source: string) {
  return runnableExports(source).some(item => item.name === 'onTick')
}
function runCommand(name: string, file: string, line: number) {
  send({ kind: 'run-fn', name, file, line, files: dirty.value ? files.value : undefined })
}
function toggleLoop() {
  const hit = runnableExports(files.value['main.ts'] ?? '').find(item => item.name === 'onTick')
  send({
    kind: 'loop', on: !loopOn.value, name: 'onTick', file: 'main.ts', line: hit?.line ?? 1,
    files: !loopOn.value && dirty.value ? files.value : undefined,
  })
}
function offerTrigger(trigger: 'run' | 'events' | 'tick') {
  const file = files.value[activeFile.value] !== undefined ? activeFile.value : 'main.ts'
  const added = insertTriggerExample(files.value[file] ?? '', trigger, notes.value)
  rememberNotes(added.remembered)
  if (added.source !== (files.value[file] ?? '')) files.value = { ...files.value, [file]: added.source }
}
let grantNotesReady = false
const grantedNotes = new Set<string>()
watch(world, current => {
  if (!current) return
  if (!grantNotesReady) {
    for (const id of current.cleared) grantedNotes.add(id)
    grantNotesReady = true
    return
  }
  for (const quest of kettlewick.questList ?? []) {
    if (!quest.trigger || !current.cleared.includes(quest.id) || grantedNotes.has(quest.id)) continue
    grantedNotes.add(quest.id)
    offerTrigger(quest.trigger)
  }
})
function take(id: string) {
  const current = world.value
  const quest = kettlewick.questList?.find(item => item.id === id)
  if (!current || !quest || !canTake(current, quest)) return
  const file = files.value[activeFile.value] !== undefined ? activeFile.value : 'main.ts'
  const note = questComment(quest.from, quest.nudge)
  const next = insertQuestNote(files.value[file] ?? '', note, quest.id, notes.value)
  rememberNotes(next.remembered)
  if (next.source !== (files.value[file] ?? '')) files.value = { ...files.value, [file]: next.source }
  send({ kind: 'accept', id })
}
const shownConsole = computed(() => {
  const lines = consoleLines.value
  return consoleFilter.value === 'all' ? lines : lines.filter(line => line.level === 'error' || line.level === 'warn')
})
const problems = computed(() => {
  let errors = hostLines.value.reduce((sum, line) => sum + (line.count ?? 1), 0)
  let warnings = 0
  if (!blankConsole.value) {
    for (const line of world.value?.console ?? []) {
      const count = line.count ?? 1
      if (line.level === 'error') errors += count
      else if (line.level === 'warn') warnings += count
    }
  }
  return { errors, warnings }
})
const canRun = computed(() => !!world.value && triggerUnlocked(world.value, 'run'))
const canLoop = computed(() => !!world.value && triggerUnlocked(world.value, 'tick'))
const loopOn = computed(() => !!world.value?.loop)
const loopable = computed(() => runnableExports(files.value['main.ts'] ?? '').some(item => item.name === 'onTick'))
const runName = computed(() => runnableExports(files.value['main.ts'] ?? '')[0]?.name)
const droneLive = computed(() => droneStatusLine((world.value?.drones ?? []).map(drone => ({
  name: drone.name,
  task: drone.task?.kind ?? null,
  vein: drone.task?.kind === 'mine' ? drone.task.vein : undefined,
}))))
const droneHold = shallowRef<SteadyLine>({ shown: '', pending: '', ticks: 0 })
watch(droneLive, line => { droneHold.value = steadyLine(droneHold.value, line) }, { immediate: true })
const cpuHold = shallowRef<CpuHold>()
const cpuMeter = shallowRef<CpuMeter>(readCpu({ used: 0, limit: kettlewick.cpuLimit }))
watch(world, (current) => {
  const cpu = current?.cpu ?? { used: 0, limit: kettlewick.cpuLimit }
  const next = steadyCpu(cpuHold.value, { used: cpu.used, limit: cpu.limit, tick: current?.tick })
  cpuHold.value = next.hold
  cpuMeter.value = next.meter
})
const nextStep = computed(() => {
  if (!activeQuest.value && readingHold.value) return readingHold.value
  return questNextStep({
  quest: activeQuest.value ? {
    from: activeQuest.value.from, goal: activeQuest.value.goal, item: activeQuest.value.item,
    qty: activeQuest.value.qty, trigger: activeQuest.value.trigger,
  } : undefined,
  reading: !activeQuest.value && reading.value ? { from: reading.value.from } : undefined,
  available: !activeQuest.value ? (available.value[0] ? { from: available.value[0].from } : undefined) : undefined,
  ready: ready.value,
  shipped: shippedCount.value,
  loop: !!world.value?.loop,
  furnace: {
    input: world.value?.furnace.input ?? 0,
    coal: world.value?.furnace.coal ?? 0,
    output: world.value?.furnace.output ?? 0,
    steel: world.value?.furnace.steel ?? 0,
  },
  made: { ingots: world.value?.ingotsMade ?? 0, steel: world.value?.steelMade ?? 0 },
  runName: runName.value,
  cart: cartCue(world.value),
  oreNeed: kettlewick.recipe.ore,
  smelting: world.value?.furnace.readyAt != null,
  triggerReady: !!activeQuest.value?.trigger && !!world.value && triggerUnlocked(world.value, activeQuest.value.trigger),
})
})
const loopReady = computed(() => ({
  on: loopOn.value,
  deployed: exportsOnTick(deployed.value['main.ts'] ?? ''),
  draft: exportsOnTick(files.value['main.ts'] ?? ''),
  helper: Object.keys(files.value).find(file => file !== 'main.ts' && exportsOnTick(files.value[file] ?? '')),
}))
const granted = computed(() => {
  const trigger = activeQuest.value?.trigger
  if (!trigger || !world.value || !triggerUnlocked(world.value, trigger)) return
  const note = grantNote(trigger, trigger === 'tick' ? loopReady.value : undefined)
  if (!note || note.text === nextStep.value) return
  return note
})
const shipmentFull = computed(() => {
  const quest = activeQuest.value
  return !!quest && shippedCount.value >= quest.qty && !ready.value
})
function showOpenTest() {
  side.value = 'tests'
  const id = firstOpenTest(testRows.value)
  if (id) pickedTest.value = id
}
function testMark(state: string) {
  if (state === 'passing') return '✓'
  if (state === 'failed') return '!'
  return '·'
}
function testLabel(state: string, text: string) {
  const name = state === 'passing' ? 'Passing' : state === 'failed' ? 'Failed' : 'Open'
  return `${name}: ${text}`
}
const scriptState = computed<'running' | 'error' | 'stopped'>(() => {
  if (!world.value) return 'stopped'
  if (scriptNotice.value || world.value.status.startsWith('CPU')) return 'error'
  if (world.value.pace.mode === 'idle') return 'stopped'
  return 'running'
})
const scriptTip = computed(() => {
  if (scriptState.value === 'stopped') return 'The script is stopped.'
  if (scriptState.value === 'error') return 'The script hit an error.'
  return 'The script is running.'
})
function openProblems() {
  side.value = 'console'
  consoleFilter.value = 'problems'
}
const saveKey = 'inherit.v8.' + kettlewick.id
let worker: Worker | undefined
let resetting = false
let bayObserver: ResizeObserver | undefined

provide(editorKey, {
  id: kettlewick.id, label: 'Player TypeScript', files, deployed, activeFile, api,
  apiNames: shallowRef(new Set(bricks.map(b => b.name.split('.').at(-1)!))),
  dirty, multiFile: ref(true), navigation, watching: ref(false), call: ref(), tickCalls: ref([]),
  canRun,
  runAt(name, file, line) { runCommand(name, file, line) },
  setFile(file, code) { files.value = { ...files.value, [file]: code } },
  openFile(file) { activeFile.value = file },
  cursor,
})

function send(command: FactoryCommand) { worker?.postMessage(command) }
function visibility() { send({ kind: 'visibility', visible: !document.hidden }) }
let preserveSlot = false
function persist() {
  if (preserveSlot || !world.value || resetting) return
  try {
    localStorage.setItem(saveKey, JSON.stringify({
      version: 3, world: world.value, deployed: deployed.value, files: files.value, activeFile: activeFile.value, notes: notes.value,
    } satisfies FactorySave))
    saveNotice.value = undefined
  } catch { saveNotice.value = rememberHost(saveNotice.value, 'Could not save the works in this browser.') }
}
watch([files, activeFile, world, deployed], persist)

function deploy() {
  if (!world.value || pending.value || !dirty.value) return
  pending.value = true
  scriptNotice.value = undefined
  send({ kind: 'run', files: files.value })
}
function startOver() {
  if (!window.confirm('Start over at Kettlewick? This replaces your saved works and all project files.')) return
  grantNotesReady = false
  grantedNotes.clear()
  preserveSlot = false
  rememberNotes([])
  resetting = true
  pending.value = true
  scriptNotice.value = undefined
  saveNotice.value = undefined
  floorNotice.value = undefined
  send({ kind: 'restart', files: kettlewick.files, fresh: true })
}
function shortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    event.stopPropagation()
    if (!event.repeat) deploy()
  }
}

onMounted(async () => {
  let storedFiles: string | null = null
  let storedMap: string | null = null
  let storedSide: string | null = null
  let storedTree: string | null = null
  let storedChecks: string | null = null
  try {
    storedFiles = localStorage.getItem(filesStorageKey)
    storedMap = localStorage.getItem(mapHeightKey)
    storedSide = localStorage.getItem(sideTabKey)
    storedTree = localStorage.getItem(treeWidthKey)
    storedChecks = localStorage.getItem(sideWidthKey)
  } catch { /* Use the defaults. */ }
  filesOpen.value = readFilesOpen(storedFiles, window.innerWidth)
  mapHeight.value = readMapHeight(storedMap)
  side.value = readSideTab(storedSide)
  treeWidth.value = readPaneWidth(storedTree, treeWidthMin, treeWidthMax, fileTreePx)
  sideWidth.value = readPaneWidth(storedChecks, sideWidthMin, sideWidthMax, checksPanePx)
  filesReady = true
  sideReady = true
  bayObserver = new ResizeObserver(entries => {
    bayWidth.value = entries[0]?.contentRect.width ?? 0
  })
  if (editorBay.value) bayObserver.observe(editorBay.value)
  worker = new Worker(new URL('../lib/factory.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }: MessageEvent<FactoryFrame>) => {
    if ('error' in data) {
      const place = knownLocation(files.value, data.file, data.line)
      scriptNotice.value = rememberHost(scriptNotice.value, data.error, place?.file, place?.line)
      pending.value = resetting = false
      return
    }
    world.value = data.world
    if (data.deployed) {
      deployed.value = data.deployed
      if (resetting) {
        files.value = { ...data.deployed }
        activeFile.value = 'main.ts'
        tool.value = undefined
        zone.value = 'quests'
        resetting = false
      }
      pending.value = false
    }
  }
  worker.onerror = () => {
    pending.value = false
    scriptNotice.value = rememberHost(scriptNotice.value, 'Could not load the factory. Reload to try again.')
  }
  try {
    const stored = localStorage.getItem(saveKey)
    const recovery = recoverFactorySave(stored)
    if (recovery.kind === 'resume') {
      files.value = recovery.save.files
      deployed.value = recovery.save.deployed
      rememberNotes(Array.isArray(recovery.save.notes) ? recovery.save.notes.filter(id => typeof id === 'string') : notesFromBrowser())
      activeFile.value = Object.hasOwn(recovery.save.files, recovery.save.activeFile) ? recovery.save.activeFile : 'main.ts'
      navigation.value = { file: activeFile.value, line: 1 }
      send({ kind: 'restart', files: recovery.save.deployed, saved: recovery.save.world })
    } else if (recovery.kind === 'missing') send({ kind: 'restart', files: kettlewick.files, fresh: true })
    else {
      await archiveFactorySave(localStorage, stored!)
      if (recovery.kind === 'files') {
        files.value = recovery.files
        deployed.value = recovery.deployed
        rememberNotes(notesFromBrowser())
        activeFile.value = recovery.activeFile
        navigation.value = { file: activeFile.value, line: 1 }
        saveNotice.value = rememberHost(saveNotice.value, 'The saved works could not be restored. Your files are still here.')
        send({ kind: 'restart', files: recovery.deployed })
      } else {
        preserveSlot = true
        saveNotice.value = rememberHost(saveNotice.value, 'Could not restore the saved works. Use Start over in Settings to reset them.')
        pending.value = false
      }
    }
  } catch {
    preserveSlot = true
    saveNotice.value = rememberHost(saveNotice.value, 'Could not restore the saved works. Use Start over in Settings to reset them.')
    pending.value = false
  }
  visibility()
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('pagehide', persist)
  window.addEventListener('keydown', shortcut, true)
})
onBeforeUnmount(() => {
  persist()
  worker?.terminate()
  document.removeEventListener('visibilitychange', visibility)
  window.removeEventListener('pagehide', persist)
  window.removeEventListener('keydown', shortcut, true)
  bayObserver?.disconnect()
})
</script>

<template>
  <StudioShell class="factory">
    <template #nav>
      <PackNav>
        <strong class="pack-switch">Kettlewick Works</strong>
        <template #clock>
          <div v-if="world" class="pills">
            <p class="pill" data-testid="credits" title="Credits. They rise when a quest is handed over, and fall only in the shop.">
              <Coins />
              <b>{{ world.credits }}</b>
              <span v-for="gain in gains.filter(item => item.kind === 'credits')" :key="gain.id" class="float">{{ gain.text }}</span>
            </p>
            <p class="pill" data-testid="level" :title="xp.title">
              <span class="badge">{{ world.level }}</span>
              <i class="bar" aria-hidden="true"><i :style="{ width: xp.width }" /></i>
            </p>
          </div>
        </template>
        <template #settings="{ close }">
          <button v-for="name in panels" :key="name" :aria-pressed="tool === name"
            @click="tool = tool === name ? undefined : name; close()">{{ name }}</button>
          <button :disabled="pending" @click="close(); startOver()">Start over</button>
        </template>
      </PackNav>
    </template>
    <template #floor>
      <section class="quest-zone" aria-label="Current request">
        <nav class="zone-tabs" aria-label="Quest, shop, and machines">
          <button type="button" :aria-pressed="zone === 'quests'" @click="zone = 'quests'">Quests</button>
          <button type="button" :aria-pressed="zone === 'shop'" @click="zone = 'shop'">Shop</button>
          <button type="button" :aria-pressed="zone === 'machines'" @click="zone = 'machines'">Machines</button>
        </nav>
        <div class="quest-scroll">
          <template v-if="zone === 'quests'">
            <p v-if="!shownQuest" class="goal">{{ nextStep }}</p>
            <ul v-if="!shownQuest && offers.length" class="requests">
              <li v-for="offer in offers" :key="offer.quest.id">
                <button type="button" @click="readingId = offer.quest.id">
                  <span class="initial" aria-hidden="true">{{ initial(offer.quest.from) }}</span>
                  <span>
                    <b>{{ offer.quest.from.replace(/^Mayor /, '') }}</b>
                    <small>{{ offer.quest.ask }}</small>
                    <small v-if="offer.hold">{{ offer.hold }}</small>
                  </span>
                </button>
              </li>
            </ul>
            <article v-else-if="shownQuest" class="quest">
              <button v-if="reading" type="button" class="hint" @click="readingId = undefined">All requests</button>
              <h2>{{ shownQuest.title }}</h2>
              <p class="goal step">{{ nextStep }}</p>
              <p v-if="granted" class="goal">
                {{ granted.text }}
                <button v-if="granted.file" type="button" class="hint" @click="activeFile = granted.file">{{ granted.file }}</button>
              </p>
              <VillageAsk :who="shownQuest.who" :name="shownQuest.from.replace(/^Mayor /, '')" :role="shownQuest.role" :building-id="shownQuest.building" :line="shownQuest.ask" />
              <div v-if="quantity" class="need">
                <p>{{ needText }}</p>
                <span class="goal-line">{{ quantity.text }}</span>
                <progress :value="quantity.value" :max="quantity.max" :aria-label="quantity.text" />
              </div>
              <ul class="rewards">
                <li title="Credits paid when you hand this over."><Coins />{{ shownQuest.pay }}</li>
                <li v-if="shownQuest.xp" title="XP paid when you hand this over."><Sparkles />{{ shownQuest.xp }}</li>
                <li v-if="shownQuest.unlock" :title="shownQuest.unlock.signature"><Unlock />{{ grantCall(shownQuest.unlock.signature) }}<span class="when">On Take</span></li>
                <li v-if="shownQuest.trigger" :title="triggerLabel[shownQuest.trigger]"><Unlock />{{ triggerLabel[shownQuest.trigger] }}<span class="when">On hand-over</span></li>
                <li v-if="shownQuest.gift" title="Granted when you hand this over."><Unlock />{{ shownQuest.gift }}<span class="when">On hand-over</span></li>
                <li v-if="shownQuest.install" title="Installed when you hand this over."><Unlock />{{ shownQuest.install }}<span class="when">On hand-over</span></li>
              </ul>
            </article>
            <div v-else class="quest">
              <h2>{{ world?.cleared.length ? 'More is coming' : 'Kettlewick Works' }}</h2>
              <p v-if="!world" class="goal">Uncle Ambrose left you the works.</p>
            </div>
          </template>
          <ul v-else-if="zone === 'shop'" class="shop-list">
            <li v-for="item in catalog" :key="item.id">
              <button type="button" :disabled="!world || world.bought.includes(item.id) || world.credits < item.price"
                @click="send({ kind: 'buy', id: item.id })">
                <b>{{ item.name }}</b>
                <span>{{ world?.bought.includes(item.id) ? 'Owned' : item.price + ' credits' }}</span>
                <small>{{ item.detail }}</small>
              </button>
            </li>
          </ul>
          <div v-else>
            <article v-if="inspected" class="quest">
              <button type="button" class="hint" @click="selectedId = ''">My machines</button>
              <h2>{{ inspected.name }}</h2>
              <p>{{ inspected.description }}</p>
              <ul class="facts">
                <li v-for="line in inspected.lines" :key="line.label"><b>{{ line.label }}</b> {{ line.value }}</li>
                <li v-for="recipe in inspected.recipes" :key="recipe.id">
                  <b>{{ recipe.input }} → {{ recipe.output }}</b>
                  <template v-if="recipe.missing"> Missing {{ recipe.missing }}.</template>
                  <template v-if="recipe.locked"> {{ recipe.locked }}</template>
                </li>
              </ul>
              <div v-if="inspected.progress" class="xp">
                <span>{{ inspected.progress.label }}</span>
                <span class="bar"><i :style="{ width: inspected.progress.pct + '%' }" /></span>
              </div>
              <ul v-if="inspected.actions.length" class="shop-list">
                <li v-for="action in inspected.actions" :key="action.id">
                  <button type="button" :disabled="!action.enabled" @click="send({ kind: 'manual', action: action.id, drone: action.drone, vein: action.vein })">
                    <b>{{ action.label }}</b>
                    <span v-if="action.api">{{ action.api }}</span>
                    <small v-if="action.reason">{{ action.reason }}</small>
                  </button>
                </li>
              </ul>
            </article>
            <ul v-else class="shop-list">
              <li v-for="row in machines" :key="row.id">
                <button type="button" @click="openMachine(row.id)">
                  <b>{{ row.name }}</b>
                  <small>{{ row.detail }}</small>
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div v-if="zone === 'quests' && (activeQuest || reading)" class="quest-action">
          <template v-if="reading">
            <button class="gold" type="button" data-testid="take-quest" :disabled="!readingTake" @click="take(reading.id)">Take quest</button>
            <p v-if="readingHold" class="calm">{{ readingHold }}</p>
          </template>
          <button v-else-if="shipmentFull" type="button" class="calm link" @click="showOpenTest">View remaining test</button>
          <p v-else-if="!ready" class="calm">In progress</p>
          <button v-else class="gold" :class="{ pulse }" type="button" data-testid="complete-quest" @click="send({ kind: 'complete' })">Hand over</button>
        </div>
      </section>
      <div class="stage">
        <div class="map-frame">
          <LazyFactoryFloor v-if="world" :world="world" :paused="false" :selected="selectedId" :interval="kettlewick.tickMs" @error="floorNotice = rememberHost(floorNotice, $event)" @select="openMachine" />
        </div>
        <PaneSplit axis="y" label="Resize map" @move="onMap" @reset="setMapHeight(defaultMapHeight())" @nudge="setMapHeight(mapHeight + $event * 2)" />
        <div ref="editorBay" class="editor-bay" :class="{ 'stack-checks': stackChecks }">
          <FileTree id="project-files" v-model:open="filesOpen" v-model:files="files" v-model:active-file="activeFile" />
          <PaneSplit class="tree-split" axis="x" label="Resize files" @move="onTree" @reset="setTreeWidth(fileTreePx)" @nudge="nudgeTree" />
          <div class="editor-column" :class="{ tight: tightEditor }">
            <div class="editor-pane"><div class="editor-host">
              <LazyCodeEditor @reference="bookOpen = true">
                <template #actions>
                  <button class="ide" type="button" @click="bookOpen = reduceApiBook(bookOpen, 'api')">API</button>
                  <button v-if="canLoop" class="ide" type="button" :aria-pressed="loopOn" :data-state="loopOn ? 'running' : 'idle'"
                    :disabled="pending || !world || (!loopOn && !loopable)"
                    :title="loopable || loopOn ? 'calls onTick every tick' : 'Export onTick in main.ts to loop it.'"
                    @click="toggleLoop">Loop: onTick {{ loopOn ? '■' : '▶' }}</button>
                  <button class="deploy" type="button" :aria-label="dirty ? 'Deploy' : 'Deployed'" :data-dirty="dirty ? 'true' : 'false'"
                    :disabled="pending || !world || !dirty" :title="dirty ? 'Deploying clears current drone tasks.' : 'Deployed'" @click="deploy">
                    {{ dirty ? 'Deploy' : 'Deployed' }} <kbd v-if="dirty">Ctrl+Enter</kbd>
                  </button>
                </template>
              </LazyCodeEditor>
            </div></div>
            <div v-if="tool === 'Charts' && world" class="tool-slot">
              <MetricsPanel :world="world" />
            </div>
          </div>
          <PaneSplit class="side-split" axis="x" label="Resize checks" @move="onSide" @reset="setSideWidth(checksPanePx)" @nudge="nudgeSide" />
          <aside class="checks-pane" :aria-label="side === 'tests' ? 'Quest tests' : 'Console'">
            <div class="checks-head" role="tablist" aria-label="Tests and console">
              <button type="button" role="tab" :aria-selected="side === 'tests'" @click="side = 'tests'">Tests</button>
              <button type="button" role="tab" :aria-selected="side === 'console'" @click="side = 'console'; consoleFilter = 'all'">
                Console
                <span v-if="unseen.count" class="badge" :class="{ bad: unseen.error }">{{ unseen.count }}</span>
              </button>
              <template v-if="side === 'console'">
                <button type="button" class="clear" @click="clearLog">Clear</button>
                <span class="tick-now"><span>Tick</span><b data-testid="tick">{{ world?.tick ?? 0 }}</b></span>
              </template>
            </div>
            <p v-if="hostError" class="host-error">{{ hostError }}</p>
            <section v-if="side === 'tests'" class="tests" aria-label="Quest tests">
              <p v-if="!testRows.length" class="empty">Take a quest to see its tests.</p>
              <button v-for="row in testRows" :key="row.id" type="button" class="test" :data-mark="row.state" :aria-pressed="pickedTest === row.id" :aria-label="testLabel(row.state, row.text)" @click="pickedTest = row.id">
                <b><span class="state-mark" aria-hidden="true">{{ testMark(row.state) }}</span> {{ row.text }}</b>
                <span>{{ row.explain }}</span>
                <small v-if="row.reason">{{ row.reason }}</small>
              </button>
            </section>
            <section v-else class="console" aria-label="Console">
              <p v-if="consoleFilter === 'problems'" class="filter">Errors and warnings. <button type="button" @click="consoleFilter = 'all'">Show all</button></p>
              <p v-if="!shownConsole.length" class="empty">Nothing logged yet.</p>
              <template v-for="line in shownConsole" :key="line.seq">
                <button v-if="line.file && line.line" type="button" class="line" :class="line.level" @click="openLine({ file: line.file, line: line.line })">
                  <span class="when">{{ line.tick }}</span>
                  <span class="text"><span class="body">{{ consoleBody(line.text, true) }}</span><span v-if="(line.count ?? 1) > 1" class="count">x {{ line.count }}</span></span>
                  <span class="where">{{ line.file }}:{{ line.line }}</span>
                </button>
                <p v-else class="line" :class="line.level">
                  <span class="when">{{ line.tick }}</span>
                  <span class="text"><span class="body">{{ consoleBody(line.text, false) }}</span><span v-if="(line.count ?? 1) > 1" class="count">x {{ line.count }}</span></span>
                </p>
              </template>
            </section>
          </aside>
        </div>
      </div>
    </template>
    <template #status>
      <div class="context">
        <span class="item" role="status" :data-state="scriptState" :title="scriptTip" :aria-label="scriptTip">
          <i class="lamp" aria-hidden="true" />
          Script
        </span>
        <button type="button" class="item" title="Errors and warnings in the console. Click to open that list." @click="openProblems">
          <CircleAlert />{{ problems.errors }}
          <TriangleAlert />{{ problems.warnings }}
        </button>
        <span class="grow">
          <div class="drone-now" title="What the drone is doing now.">{{ droneHold.shown }}</div>
        </span>
        <span
          class="item cpu-meter"
          role="meter"
          data-testid="cpu"
          :data-tone="cpuMeter.tone"
          :aria-valuenow="cpuMeter.used"
          aria-valuemin="0"
          :aria-valuemax="cpuMeter.limit"
          :aria-label="cpuTitle(cpuMeter)"
          :title="cpuTitle(cpuMeter)"
        >
          <Cpu />
          <b class="readout">{{ cpuMeter.label }}</b>
          <i class="bar" aria-hidden="true"><i :style="{ width: cpuMeter.fill }" /></i>
        </span>
        <span class="item" title="The caret in the open file.">
          <TextCursor />Ln {{ cursor.line }}, Col {{ cursor.column }}
        </span>
        <span v-if="world" class="item" title="The sim tick. The works advance twice a second.">
          <Timer />{{ world.tick }}
        </span>
      </div>
    </template>
    <Teleport to="body">
      <ApiBook v-if="bookOpen" :sections="bookSections" @close="bookOpen = reduceApiBook(true, 'close')" />
    </Teleport>
  </StudioShell>
</template>

<style scoped>
.factory :deep(.desk) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.factory :deep(.desk > .resizer),
.factory :deep(.desk > .editor-dock) {
  display: none;
}
.factory :deep(.world-shell) {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  flex: 1 1 auto;
  gap: v-bind(worldGapCss);
  padding: v-bind(worldInsetCss);
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.stage {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.map-frame {
  position: relative;
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: v-bind(mapRowCss);
  min-width: 0;
  min-height: 0;
  border-radius: 7px;
  overflow: hidden;
}
.editor-bay {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: v-bind(treeColumnCss) 0 minmax(0, 1fr) 0 v-bind(checksPaneCss);
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
  background: var(--surface-low);
  border: 1px solid var(--line);
  border-radius: 7px;
}
.editor-bay :deep(.tree-split) { grid-column: 2; grid-row: 1 }
.editor-bay :deep(.side-split) { grid-column: 4; grid-row: 1 }
.editor-bay :deep(.tree) { grid-column: 1; grid-row: 1; height: 100%; min-height: 0 }
.quest-zone {
  width: v-bind(questRailCss);
  flex: 0 0 v-bind(questRailCss);
  align-self: stretch;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 7px;
}
.zone-tabs {
  display: flex;
  gap: 4px;
  flex: none;
  padding: 12px 12px 0;
}
.zone-tabs button {
  flex: 1;
  min-height: 28px;
  background: transparent;
  color: var(--soft);
  border-color: var(--line);
  font: 12px var(--mono);
}
.zone-tabs button[aria-pressed='true'] {
  background: var(--surface-low);
  color: var(--text);
  border-color: var(--line-strong, var(--line));
}
.quest-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 10px 12px;
}
.quest { display: grid; gap: 12px; min-width: 0 }
.quest-zone h2 {
  font-size: 15px;
  line-height: 1.2;
  letter-spacing: -0.4px;
  margin: 0;
}
.goal { font-size: 13px; line-height: 1.4 }
.quest > .goal.step { min-height: calc(2 * 1.4em) }
.lesson {
  border-top: 1px solid var(--accent-line);
  padding-top: 9px;
  display: grid;
  gap: 8px;
  justify-items: start;
}
.lesson ol {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
  font-size: 13px;
  line-height: 1.45;
}
.reward, .progress { margin: 0; font: 13px var(--mono); color: var(--accent-soft) }
.reward b, .progress b { color: var(--text); letter-spacing: 0.5px }
.quest-action {
  flex: none;
  margin-top: auto;
  padding: 10px 12px 12px;
  border-top: 1px solid var(--line);
}
.need { display: grid; gap: 6px; min-width: 0 }
.need p { margin: 0; font-size: 13px; line-height: 1.4 }
.need progress { width: 100%; height: 4px; margin: 0; border: 0; background: var(--line); accent-color: var(--mint) }
.need progress::-webkit-progress-bar { background: var(--line) }
.quest-action .gold { width: 100%; height: 34px }
.quest-action .gold.pulse { animation: quest-ready 0.7s ease-out 1 }
.quest-action .calm {
  margin: 0;
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--sub);
  font-size: 13px;
}
.quest-action .link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  background: transparent;
  border: 0;
  color: var(--text);
  text-decoration: underline;
  cursor: pointer;
}
@keyframes quest-ready {
  0% { transform: scale(1) }
  40% { transform: scale(1.04) }
  100% { transform: scale(1) }
}
.requests { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px }
.requests button {
  width: 100%;
  display: flex;
  gap: 8px;
  align-items: center;
  text-align: left;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 8px;
  color: var(--text);
}
.requests b { display: block; font-size: 14px }
.requests small { display: block; color: var(--soft); font-size: 12px; line-height: 1.35 }
.initial {
  width: 28px;
  height: 28px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-low);
  color: var(--gold);
  font: 700 13px var(--mono);
}
.goals { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px }
.goals li { display: grid; gap: 3px; min-width: 0 }
.goal-line {
  min-width: 0;
  min-height: 1.3em;
  font-size: 13px;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.goals progress { width: 100%; height: 4px; border: 0; background: var(--line); accent-color: var(--mint) }
.goals progress::-webkit-progress-bar { background: var(--line) }
.goals [data-mark=passing] { color: var(--mint) }
.goals [data-mark=pending] { color: var(--text) }
.goals [data-mark=failed] { color: var(--alert) }
.goals [data-mark=failed] progress { accent-color: var(--alert) }
.goals small { color: var(--soft); font-size: 12px; line-height: 1.35 }
.rewards { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px }
.rewards li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-low);
  font: 12px var(--mono);
  color: var(--text);
}
.rewards svg { width: 13px; height: 13px; color: var(--gold) }
.rewards .when { color: var(--soft); font-size: 10px }
.pills { display: flex; align-items: center; gap: 8px; margin-inline: auto }
.pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  margin: 0;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-low);
  color: var(--text);
}
.pill svg { width: 14px; height: 14px; color: var(--gold) }
.pill b { font: 600 13px var(--mono) }
.badge {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--gold);
  color: var(--base);
  font: 700 11px var(--mono);
}
.bar { width: 48px; height: 3px; border-radius: 2px; background: var(--line); overflow: hidden }
.bar i { display: block; height: 100%; background: var(--gold) }
.float {
  position: absolute;
  top: -2px;
  right: 8px;
  color: var(--gold);
  font: 700 12px var(--mono);
  pointer-events: none;
  animation: rise 1.1s ease-out;
}
@keyframes rise { to { transform: translateY(-14px); opacity: 0 } }
@media (prefers-reduced-motion: reduce) { .float { animation: none } }
.context { display: flex; align-items: center; width: 100%; height: 100%; gap: 2px }
.context .grow { flex: 1; min-width: 0; overflow: hidden }
.drone-now {
  flex: 1;
  min-width: 0;
  height: 22px;
  padding-left: 8px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  line-height: 22px;
  font-variant-numeric: tabular-nums;
}
.context .item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 6px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--sub);
  font: 11px var(--mono);
  font-variant-numeric: tabular-nums;
}
.context button.item { cursor: pointer }
.context button.item:hover { background: var(--surface-low); color: var(--text) }
.cpu-meter {
  flex: none;
  width: 148px;
  overflow: hidden;
  white-space: nowrap;
}
.cpu-meter .readout {
  width: 10ch;
  flex: none;
  text-align: right;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}
.cpu-meter .bar { width: 36px; flex: none }
.cpu-meter .bar i { background: var(--mint) }
.cpu-meter[data-tone="near"] { color: var(--gold) }
.cpu-meter[data-tone="near"] .bar i { background: var(--gold) }
.cpu-meter[data-tone="over"] { color: var(--alert); background: var(--alert-surface) }
.cpu-meter[data-tone="over"] .bar i { background: var(--alert) }
.cpu-meter[data-tone="near"] :deep(svg),
.cpu-meter[data-tone="over"] :deep(svg) { color: currentColor }
.context svg { width: 12px; height: 12px }
.lamp { width: 8px; height: 8px; border-radius: 50%; background: var(--mint) }
.context [data-state=error] .lamp { background: var(--alert) }
.context [data-state=stopped] .lamp { background: var(--sub) }
.filter { margin: 0; padding: 6px 8px 0; color: var(--sub); font: 11px var(--mono) }
.filter button { border: 0; background: transparent; color: var(--text); font: inherit; text-decoration: underline }
.shop-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px }
.shop-list button {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  justify-content: stretch;
  justify-items: start;
  gap: 2px 8px;
  text-align: left;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 6px 8px;
}
.shop-list button span { justify-self: end; color: var(--accent-soft); font: 13px var(--mono) }
.shop-list button small { grid-column: 1 / -1; color: var(--soft); font-size: 12px; font-weight: 400 }
.shop-list button:disabled, .shop-list button.locked { opacity: 0.45 }
.facts { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; font: 12px var(--mono); color: var(--soft) }
.facts li {
  height: 1.45em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}
.facts b { color: var(--text); font-weight: 600 }
.quest .bar { display: block; height: 5px; border-radius: 3px; background: var(--accent-shadow); overflow: hidden }
.quest .bar i { display: block; height: 100%; background: var(--gold) }
.balance b { font-variant-numeric: tabular-nums }
.xp { display: grid; gap: 4px; min-width: 92px }
.xp-bar {
  display: block;
  height: 5px;
  border-radius: 3px;
  background: var(--accent-shadow);
  overflow: hidden;
}
.xp-bar i { display: block; height: 100%; background: var(--gold) }
.editor-column {
  --editor-header: v-bind(headerCss);
  grid-column: 3;
  grid-row: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.editor-column :deep(.project-tabs) {
  height: v-bind(headerCss);
  min-height: v-bind(headerCss);
  align-items: center;
  padding: 0 6px 0 0;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
  flex-wrap: nowrap;
}
.editor-column :deep(.project-tabs .tab) { min-width: 0 }
.editor-column :deep(.project-tabs .tab button) {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
.editor-column :deep(.ide) {
  height: 26px;
  flex: none;
  margin-left: 6px;
  padding: 0 8px;
  border-radius: 5px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--line);
  font: 12px var(--mono);
}
.editor-column :deep(.ide[aria-pressed='true']) {
  border-color: var(--gold);
  color: var(--gold);
}
.editor-column :deep(.running) {
  flex: none;
  margin-left: 6px;
  color: var(--mint);
  font: 11px var(--mono);
}
.editor-column :deep(.deploy) {
  height: 26px;
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  padding: 0 10px;
  border-radius: 5px;
  white-space: nowrap;
}
.editor-column :deep(.deploy kbd) {
  font: 10px var(--mono);
  padding: 1px 4px;
  border: 1px solid currentColor;
  border-radius: 3px;
}
.editor-column.tight :deep(.deploy kbd) { display: none }
@media (min-width: 801px) {
  .editor-bay.stack-checks {
    grid-template-columns: v-bind(treeColumnCss) 0 minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(72px, 28%);
  }
  .editor-bay.stack-checks :deep(.side-split) { display: none }
  .editor-bay.stack-checks .editor-column { grid-column: 3; grid-row: 1 }
  .editor-bay.stack-checks .checks-pane {
    grid-column: 1 / -1;
    grid-row: 2;
    border-left: 0;
    border-top: 1px solid var(--line);
  }
}
.editor-column :deep(.finder) { top: v-bind(headerCss) }
.checks-pane {
  grid-column: 5;
  grid-row: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--panel);
}
.checks-head {
  flex: none;
  height: v-bind(headerCss);
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--line);
  font: 700 12px var(--mono);
  color: var(--text);
}
.checks-head button[role="tab"] {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--sub);
  font: inherit;
  padding: 0 10px;
}
.checks-head button[aria-selected="true"] {
  color: var(--text);
  border-bottom-color: var(--gold);
}
.checks-head .badge {
  margin-left: 4px;
  min-width: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--sub);
  color: var(--panel);
  font: 700 10px var(--mono);
}
.checks-head .badge.bad { background: var(--alert); color: #fff }
.checks-head .clear {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--sub);
  font: 11px var(--mono);
  padding: 0 8px;
}
.checks-head .tick-now {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
  color: var(--sub);
  font: 11px var(--mono);
  font-weight: 500;
}
.checks-pane :deep(.checks) {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 10px;
}
.tool-slot {
  flex: none;
  max-height: 30%;
  overflow: auto;
  border-top: 1px solid var(--line);
  background: var(--surface-low);
  padding: 6px 12px;
}
.tool-slot :deep(.bench) { padding: 0; max-height: none }
.host-error { margin: 0; padding: 8px 10px 0; color: var(--alert); font: 12px var(--mono) }
.tests {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
}
.tests .empty { margin: 0; color: var(--sub); font: 12px var(--mono) }
.tests .test {
  display: grid;
  gap: 3px;
  width: 100%;
  text-align: left;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: transparent;
  color: var(--text);
}
.tests .test[aria-pressed='true'] { border-color: var(--gold) }
.tests .test b { font: 12px var(--mono); font-weight: 600 }
.tests .test span, .tests .test small { color: var(--soft); font: 12px/1.4 var(--mono) }
.tests .test .state-mark { display: inline-block; width: 1em }
.tests .test[data-mark='passing'] b { color: var(--mint) }
.tests .test[data-mark='failed'] b { color: var(--alert) }
.console {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 6px 8px;
  font: 12px var(--mono);
}
.console .empty { margin: 0; color: var(--sub) }
.console .line {
  display: grid;
  grid-template-columns: 4.6em minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
  width: 100%;
  margin: 0;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
}
.console .when, .console .where { color: var(--sub) }
.console .where { white-space: nowrap }
.console .text { display: flex; gap: 6px; align-items: flex-start; min-width: 0 }
.console .body { min-width: 0; white-space: pre-wrap; overflow-wrap: anywhere }
.console .line.error .body, .console .line.warn .body { color: var(--alert) }
.console .count {
  flex: none;
  margin-top: 1px;
  padding: 0 5px;
  border-radius: 8px;
  background: var(--accent-shadow);
  color: var(--sub);
  font-size: 10px;
  line-height: 16px;
}
.notice { display: block; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.notice.bad { color: var(--alert) }
@media (max-width: 800px) {
  .factory :deep(.hud) {
    display: flex;
    flex-wrap: wrap;
    height: auto;
    gap: 8px 12px;
  }
  .factory :deep(.world-shell) {
    flex-direction: column;
    height: auto;
    min-height: clamp(480px, 66dvh, 720px);
  }
  .quest-zone { flex: none; width: auto; max-height: 42% }
  .stage { width: 100%; min-height: 320px; flex: 1 1 auto; }
  .map-frame { min-height: 140px; }
  .editor-bay {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) minmax(72px, 28%);
  }
  .tree-split, .side-split { display: none }
  .editor-bay :deep(.tree) {
    grid-column: 1;
    grid-row: 1;
    max-height: 140px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .editor-bay :deep(.tree.shut) { max-height: none; }
  .editor-column { grid-column: 1; grid-row: 2 }
  .checks-pane {
    grid-column: 1;
    grid-row: 3;
    border-left: 0;
    border-top: 1px solid var(--line);
  }
}
</style>
