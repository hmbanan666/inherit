<script setup lang="ts">
import { apiBook, canTake, declarations, inspectMachine, kettlewick, factoryBricks, machineList, questHold, shopFor, functionUnlocked, freshBrick, triggerUnlocked, type ConsoleLine, type World } from '@inherit/sim/v8'
import ApiBook from './ApiBook.vue'
import PaneSplit from './PaneSplit.vue'
import { CircleAlert, Coins, Cpu, TextCursor, Timer, TriangleAlert, User } from '@lucide/vue'
import { editorKey } from '../lib/editor'
import { archiveFactorySave, recoverFactorySave, type FactoryCommand, type FactoryFrame, type FactorySave } from '../lib/factoryProtocol'
import {
  checksPanePx, clampMapHeight, editorColumns, consoleBody, defaultMapHeight, editorHeaderPx, filesStorageKey, fileTreePx, mapHeightKey,
  readFilesOpen, readMapHeight, readPaneWidth, readSideTab, sideTabKey, sideWidthKey, sideWidthMax, sideWidthMin,
  treeRailPx, treeWidthKey, treeWidthMax, treeWidthMin, worldInsetPx, type SideTab,
} from '../lib/factoryLayout'
import { runnableExports } from '../lib/runGlyph'
import { insertQuestNote, questCard, questComment, questSummary } from '../lib/questNote'
import { cpuTitle, readCpu, steadyCpu, type CpuHold, type CpuMeter } from '../lib/cpuMeter'
import { grantNote, questNextStep, useDroneStatus, type CartCue } from '../lib/questStep'
import { knownLocation, markHostRead, noteHost, type HostNotice } from '../lib/hostNotice'
import { useApiBook, type ApiBookOpener } from '../lib/apiBookState'
import { closeOverlay, openOverlay, overlayLabels, type GameOverlay } from '../lib/gameOverlay'
import { isLevelEvent, pickLevelUp, visibleLevelUp } from '../lib/levelUp'
import { dialogClose } from '../lib/dialogMotion'
import { cardSide } from '../lib/cardPlace'
import type { Point } from '../lib/floorPick'
import { journalRequests, villagerDialog, villagers, villageView } from '../lib/village'
import { questHistory } from '../lib/questJournal'
import { testLabel, testMark } from '../lib/questTracker'
import { dismissToast, emptyToasts, expireToasts, holdToasts, pushToasts } from '../lib/toasts'
import { isCodeJob, questTabNotice, shellLabels, welcomeToast, xpProgress, xpRing } from '../lib/shellBar'
import { worldEvents, type Row, type WorldView } from '../lib/worldEvents'
import { insertTriggerExample } from '../lib/triggerNote'

useHead({ title: 'Kettlewick Works · Inherit' })
const quests = kettlewick.questList ?? []
const people = villagers(quests)
const bricks = factoryBricks(kettlewick)
const lockedWorld = { questId: undefined, cleared: [] as string[], bought: [] as string[], automation: { run: false, events: false, tick: false } }
const visibleBricks = computed(() => bricks.filter(brick => functionUnlocked(world.value ?? lockedWorld, brick.name)))
const freshNames = computed(() => new Set(bricks.filter(brick => freshBrick(world.value, brick.name)).map(brick => brick.name)))
const droneNames = computed(() => world.value?.drones.map(drone => drone.name) ?? ['drone-1'])
const api = ref(declarations(bricks.filter(brick => functionUnlocked(lockedWorld, brick.name)), new Set(), ['drone-1']))
const bookSections = computed(() => apiBook(bricks, world.value ?? lockedWorld))
const catalog = computed(() => shopFor(world.value ?? { cleared: [], bought: [] }))
const { sectionId, selectSection } = useApiBook()
const overlay = shallowRef<GameOverlay>({ kind: 'none' })
const journalOpen = computed(() => overlay.value.kind === 'journal')
const machinesOpen = computed(() => overlay.value.kind === 'machines')
const shopOpen = computed(() => overlay.value.kind === 'shop')
const bookOpen = computed(() => overlay.value.kind === 'api')
const mapFrame = ref<HTMLElement>()
const focusPoint = shallowRef<Point>()
const journalButton = ref<HTMLButtonElement>()
let opener: ApiBookOpener | undefined
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
const village = computed(() => world.value && villageView(world.value, quests))
const person = computed(() => {
  const current = overlay.value
  return current.kind === 'npc' ? people.find(person => person.who === current.who) : undefined
})
const request = computed(() => world.value && person.value && villagerDialog(world.value, quests, person.value.who))
watch([visibleBricks, freshNames, droneNames], () => { api.value = declarations(visibleBricks.value, freshNames.value, droneNames.value) })
const scriptNotice = ref<HostNotice>()
const saveNotice = ref<HostNotice>()
const floorNotice = ref<HostNotice>()
const pending = ref(true)
const panels = ['Charts'] as const
const tool = ref<typeof panels[number]>()
const side = ref<SideTab>(readSideTab(null))
const pickedTest = ref('')
const consoleFilter = ref<'all' | 'problems'>('all')
const seenSeq = ref(0)
const blankConsole = ref(false)
const selectedId = ref('')
const floor = useTemplateRef('floor')
const cardSprite = ref<string>()
watch([selectedId, floor], async ([id, component], _, onCleanup) => {
  cardSprite.value = undefined
  if (!id || !component) return
  let current = true
  onCleanup(() => { current = false })
  const sprite = await component.snapshot(id)
  if (current) cardSprite.value = sprite
})
const machines = computed(() => world.value ? machineList(world.value) : [])
const inspected = computed(() => {
  const current = world.value
  return current && selectedId.value ? inspectMachine(current, kettlewick, selectedId.value) : undefined
})
const settingsOpen = ref(false)
const levelUp = ref<number>()
const otherModalOpen = computed(() => overlay.value.kind !== 'none' || !!inspected.value)
const shownLevel = computed(() => visibleLevelUp(levelUp.value, otherModalOpen.value || settingsOpen.value))
const modalOpen = computed(() => otherModalOpen.value || shownLevel.value !== undefined)
const machineSide = ref<ReturnType<typeof cardSide>>('center')
function openMachine(id: string, centerX?: number) {
  machineSide.value = cardSide(centerX, window.innerWidth)
  selectedId.value = id
}
function showDialog(next: Exclude<GameOverlay, { kind: 'none' }>, from?: ApiBookOpener) {
  if (!modalOpen.value) opener = from
  selectedId.value = ''
  overlay.value = openOverlay(overlay.value, next)
}
function openMachineApi(id: string) {
  selectSection(id)
  showDialog({ kind: 'api' })
}
function closeSurface() {
  overlay.value = closeOverlay(overlay.value)
  selectedId.value = ''
  if (levelUp.value !== undefined) return
  const from = opener
  opener = undefined
  nextTick(() => {
    if (modalOpen.value || selectedId.value) return
    if (from instanceof HTMLElement && !from.isConnected) journalButton.value?.focus()
    else from?.focus()
  })
}
const { closing: bookClosing, requestClose: closeBook, vDialogMotion } = dialogClose(closeSurface)
function inspectFromFloor(id: string) {
  const from = mapFrame.value?.querySelector<HTMLElement>('[aria-label="Factory map"]') ?? undefined
  if (id.startsWith('npc:')) {
    showDialog({ kind: 'npc', who: id.slice(4) }, from)
    return
  }
  opener = from
  if (id) {
    const rect = floor.value?.anchorRect(id)
    openMachine(id, rect && rect.x + rect.w / 2)
  } else closeSurface()
}
function inspectFromJournal(id: string) {
  overlay.value = closeOverlay(overlay.value)
  openMachine(id)
}
const worldInsetCss = worldInsetPx + 'px'
const headerCss = editorHeaderPx + 'px'
const checksPaneCss = computed(() => sideWidth.value + 'px')
const filesOpen = ref(false)
const mapHeight = ref(defaultMapHeight())
const treeWidth = ref(fileTreePx)
const sideWidth = ref(checksPanePx)
const editorBay = ref<HTMLElement | null>(null)
const bayWidth = ref<number>()
const columns = computed(() => editorColumns(bayWidth.value, filesOpen.value ? treeWidth.value : treeRailPx, sideWidth.value))
const treeColumnCss = computed(() => columns.value.tree + 'px')
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
  const from = filesOpen.value && direction < 0 ? columns.value.tree : treeWidth.value
  filesOpen.value = true
  setTreeWidth(from + direction * 16)
}
function nudgeSide(direction: -1 | 1) {
  setSideWidth(sideWidth.value - direction * 16)
}
const activeQuest = computed(() => quests.find(quest => quest.id === world.value?.questId))
const available = computed(() => world.value ? journalRequests(world.value, quests) : [])
const trackedQuest = computed(() => activeQuest.value ?? available.value[0])
function visitFromTracker(from: HTMLButtonElement) {
  const quest = trackedQuest.value
  if (!quest) return
  showDialog({ kind: 'npc', who: quest.who }, from)
  const npc = village.value?.npcs.find(npc => npc.who === quest.who)
  if (npc) focusPoint.value = { ...npc.spot }
}
const offers = computed(() => available.value.map(quest => ({
  quest,
  hold: world.value ? questHold(world.value, quest) : undefined,
})))
const newRequest = computed(() => !world.value?.questId && offers.value.length > 0)
const history = computed(() => questHistory(world.value?.cleared ?? [], kettlewick.questList ?? []))
const reading = computed(() => journalOpen.value ? available.value[0] : undefined)
const readingHold = computed(() => reading.value && world.value ? questHold(world.value, reading.value) : undefined)
const readingTake = computed(() => !!reading.value && !!world.value && canTake(world.value, reading.value))
const shownQuest = computed(() => activeQuest.value ?? reading.value)
const card = computed(() => shownQuest.value && world.value ? questCard(world.value, shownQuest.value) : undefined)
const journalSummary = computed(() => journalOpen.value && world.value && shownQuest.value && card.value
  ? questSummary(world.value, shownQuest.value, card.value) : undefined)
const ready = computed(() => card.value?.ready ?? false)
const readyNotice = computed(() => questTabNotice(side.value, ready.value))
const testRows = computed(() => card.value?.tests ?? [])
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
const xp = computed(() => xpProgress(world.value?.xp ?? 0))
const ringRadius = 14
const ring = computed(() => xpRing(xp.value.fraction, ringRadius))
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
const toasts = shallowRef(emptyToasts())
const seenToasts = new Set<string>()
let prevView: WorldView | undefined
let prevRows: Row[] = []
let hoverStart: number | undefined
function hoverToasts(over: boolean) {
  const now = performance.now()
  if (over) hoverStart ??= now
  else if (hoverStart !== undefined) {
    toasts.value = holdToasts(toasts.value, now, now - hoverStart)
    hoverStart = undefined
  }
}
function dismiss(id: number) {
  toasts.value = dismissToast(toasts.value, id, hoverStart ?? performance.now())
}
watch(() => toasts.value.visible.length > 0, (visible, _, onCleanup) => {
  if (!visible) {
    hoverStart = undefined
    return
  }
  const timer = window.setInterval(() => {
    if (hoverStart === undefined) toasts.value = expireToasts(toasts.value, performance.now())
  }, 500)
  onCleanup(() => window.clearInterval(timer))
})
let grantNotesReady = false
const grantedNotes = new Set<string>()
watch(world, current => {
  if (!current || resetting) return
  const rows = current.questId ? testRows.value : []
  const events = worldEvents(grantNotesReady ? prevView : undefined, current, kettlewick.questList ?? [], catalog.value, {
    prev: prevRows, next: rows,
  })
  if (!grantNotesReady) {
    const welcome = welcomeToast(current, nextStep.value)
    if (welcome) events.push(welcome)
  }
  prevView = current
  prevRows = rows
  if (events.length) {
    const level = pickLevelUp(events, seenToasts)
    if (level !== undefined) {
      if (!opener && document.activeElement instanceof HTMLElement) opener = document.activeElement
      levelUp.value = level
    }
    const notices = events.filter(event => !isLevelEvent(event))
    toasts.value = pushToasts(toasts.value, notices, hoverStart ?? performance.now(), seenToasts)
  }
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
  if (!current || current.questId || !quest || !canTake(current, quest)) return
  const file = files.value[activeFile.value] !== undefined ? activeFile.value : 'main.ts'
  const note = questComment(quest.from, quest.nudge)
  const example = isCodeJob(quest.id) ? shellLabels.codeExample : undefined
  const next = insertQuestNote(files.value[file] ?? '', note, quest.id, notes.value, example)
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
const droneLine = useDroneStatus(world)
const cpuHold = shallowRef<CpuHold>()
const cpuMeter = shallowRef<CpuMeter>(readCpu({ used: 0, limit: kettlewick.cpuLimit }))
watch(world, (current) => {
  const cpu = current?.cpu ?? { used: 0, limit: kettlewick.cpuLimit }
  const next = steadyCpu(cpuHold.value, { used: cpu.used, limit: cpu.limit, tick: current?.tick })
  cpuHold.value = next.hold
  cpuMeter.value = next.meter
})
const nextStep = computed(() => {
  return questNextStep({
    quest: activeQuest.value ? card.value : undefined,
    available: !activeQuest.value ? (available.value[0] ? { from: available.value[0].from } : undefined) : undefined,
    ready: ready.value,
    shipped: card.value?.shipped ?? 0,
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
function openTests() {
  side.value = 'tests'
}
function showOpenTest() {
  openTests()
  const id = card.value?.remainingTest
  if (id) pickedTest.value = id
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
  levelUp.value = undefined
  closeSurface()
  grantNotesReady = false
  grantedNotes.clear()
  toasts.value = emptyToasts()
  // Quest events repeat in a new game. The welcome belongs to the page session.
  for (const key of seenToasts) if (key !== 'welcome') seenToasts.delete(key)
  hoverStart = undefined
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
  if (modalOpen.value) return
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
    bayWidth.value = entries[0]?.contentRect.width
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
        focusPoint.value = undefined
        closeSurface()
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
      <PackNav v-model:settings="settingsOpen">
        <p v-if="world" class="pill" data-testid="credits" title="Credits. They rise when a quest is handed over, and fall only in the shop.">
          <Coins />
          <b>{{ world.credits }}</b>
          <span v-for="gain in gains.filter(item => item.kind === 'credits')" :key="gain.id" class="float">{{ gain.text }}</span>
        </p>
        <button ref="journalButton" type="button" class="nav-link" aria-haspopup="dialog" :aria-current="journalOpen || undefined"
          :aria-label="newRequest ? overlayLabels.newRequest : overlayLabels.journal" @click="showDialog({ kind: 'journal' }, $event.currentTarget as HTMLButtonElement)">
          {{ overlayLabels.journal }}<i v-if="newRequest" class="dot" aria-hidden="true" />
        </button>
        <button type="button" class="nav-link" aria-haspopup="dialog" :aria-current="machinesOpen || undefined"
          :disabled="!world" @click="showDialog({ kind: 'machines' }, $event.currentTarget as HTMLButtonElement)">
          {{ overlayLabels.machines }}
        </button>
        <button type="button" class="nav-link" aria-haspopup="dialog" :aria-current="shopOpen || undefined"
          :disabled="!world" @click="showDialog({ kind: 'shop' }, $event.currentTarget as HTMLButtonElement)">
          {{ overlayLabels.shop }}
        </button>
        <template #settings="{ close }">
          <button v-for="name in panels" :key="name" :aria-pressed="tool === name"
            @click="tool = tool === name ? undefined : name; close()">{{ name }}</button>
          <button :disabled="pending" @click="close(); startOver()">Start over</button>
        </template>
        <template #account>
          <p v-if="world" class="account" data-testid="level" :title="xp.title" :aria-label="xp.title">
            <span class="account-avatar" aria-hidden="true">
              <svg viewBox="0 0 32 32" class="ring" fill="none" stroke-width="3">
                <circle cx="16" cy="16" :r="ringRadius" stroke="var(--line)" />
                <circle cx="16" cy="16" :r="ringRadius" stroke="var(--gold)" transform="rotate(-90 16 16)"
                  :stroke-dasharray="ring.dashArray" :stroke-dashoffset="ring.dashOffset" />
              </svg>
              <User :size="16" />
            </span>
            <span class="account-text"><b>{{ shellLabels.level(xp.level) }}</b><span>{{ xp.label }}</span></span>
          </p>
        </template>
      </PackNav>
    </template>
    <template #floor>
      <div class="stage">
        <div ref="mapFrame" class="map-frame">
          <LazyFactoryFloor v-if="world" ref="floor" :world="world" :village="village" :focus-point="focusPoint" :frozen="person && 'npc:' + person.who" :paused="false" :selected="person ? 'npc:' + person.who : selectedId" :interval="kettlewick.tickMs" @error="floorNotice = rememberHost(floorNotice, $event)" @select="inspectFromFloor" />
        </div>
        <PaneSplit axis="y" label="Resize map" @move="onMap" @reset="setMapHeight(defaultMapHeight())" @nudge="setMapHeight(mapHeight + $event * 2)" />
        <div ref="editorBay" class="editor-bay" :class="{ 'stack-checks': columns.stackChecks }">
          <FileTree id="project-files" v-model:open="filesOpen" v-model:files="files" v-model:active-file="activeFile" />
          <PaneSplit class="tree-split" axis="x" label="Resize files" @move="onTree" @reset="setTreeWidth(fileTreePx)" @nudge="nudgeTree" />
          <div class="editor-column">
            <div class="editor-pane"><div class="editor-host">
              <LazyCodeEditor :book-open="modalOpen" @reference="showDialog({ kind: 'api' }, $event)">
                <template #actions>
                  <button class="ide" type="button" aria-haspopup="dialog" @click="showDialog({ kind: 'api' }, $event.currentTarget as HTMLButtonElement)">API</button>
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
          <aside class="checks-pane" :aria-label="shellLabels.pane[side]">
            <div class="checks-head" role="tablist" :aria-label="shellLabels.sideTabs">
              <button type="button" role="tab" :aria-selected="side === 'quest'"
                :aria-label="readyNotice" @click="side = 'quest'">
                {{ shellLabels.pane.quest }}<i v-if="readyNotice" class="dot" aria-hidden="true" />
              </button>
              <button type="button" role="tab" :aria-selected="side === 'tests'" @click="side = 'tests'">Tests</button>
              <button type="button" role="tab" :aria-selected="side === 'console'" @click="side = 'console'; consoleFilter = 'all'">
                Console
                <span v-if="unseen.count" class="badge" :class="{ bad: unseen.error }">{{ unseen.count }}</span>
              </button>
              <button v-if="side === 'console'" type="button" class="clear" @click="clearLog">Clear</button>
            </div>
            <p v-if="hostError" class="host-error">{{ hostError }}</p>
            <section v-if="side === 'quest'" class="quest-tab" :aria-label="shellLabels.pane.quest">
              <QuestTracker v-if="world" :quest="activeQuest" :can-visit="!!trackedQuest" :card="activeQuest ? card : undefined" :step="nextStep" :granted="granted" :pulse="pulse"
                @visit="visitFromTracker" @journal="showDialog({ kind: 'journal' }, $event)" @hand-over="send({ kind: 'complete' })"
                @show-test="showOpenTest" @open-tests="openTests" @open-file="activeFile = $event" />
            </section>
            <section v-else-if="side === 'tests'" class="tests" aria-label="Quest tests">
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
          <div class="drone-now" title="What the drone is doing now.">{{ droneLine }}</div>
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
        <span v-if="world" class="item" data-testid="tick" title="The sim tick. The works advance twice a second.">
          <Timer />{{ world.tick }}
        </span>
      </div>
    </template>
    <ToastStack :toasts="toasts.visible" @dismiss="dismiss" @hover="hoverToasts" />
    <Teleport to="body">
      <JournalDialog v-if="journalOpen" :quest="shownQuest" :card="card" :step="nextStep" :summary="journalSummary"
        :reading="!!reading" :can-take="readingTake" :hold="readingHold" :ready="ready" :pulse="pulse"
        :active="!!world?.questId" :offers="offers" :history="history" @close="closeSurface"
        @read="showDialog({ kind: 'npc', who: $event })" @take="take" @hand-over="send({ kind: 'complete' })"
        @show-test="showOpenTest(); closeSurface()" />
      <MachinesDialog v-else-if="machinesOpen && world" :machines="machines" @close="closeSurface" @open-machine="inspectFromJournal" />
      <VillagerDialog v-else-if="person && request" :person="person" :request="request"
        @take="take($event); closeSurface()" @hand-over="send({ kind: 'complete' }); closeSurface()" @close="closeSurface" />
      <ShopDialog v-else-if="shopOpen && world" :catalog="catalog" :credits="world.credits" :bought="world.bought"
        @buy="send({ kind: 'buy', id: $event })" @close="closeSurface" />
      <ApiBook v-else-if="bookOpen" v-dialog-motion class="dialog-motion" :class="{ closing: bookClosing }"
        :sections="bookSections" :section-id="sectionId" @select="selectSection" @close="closeBook" />
      <MachineCard v-else-if="inspected" :inspected="inspected" :sprite="cardSprite" :side="machineSide" @api="openMachineApi" @close="closeSurface"
        @manual="send({ kind: 'manual', action: $event.id, drone: $event.drone, vein: $event.vein })" />
      <LevelUpDialog v-else-if="shownLevel !== undefined" :level="shownLevel" :quests="quests" @close="levelUp = undefined; closeSurface()" />
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
  gap: 0;
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
.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 2px;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: none;
  color: var(--sub);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.nav-link:enabled:hover, .nav-link:focus-visible { color: var(--text); background: none; border-bottom-color: transparent }
.nav-link[aria-current="true"], .nav-link[aria-current="true"]:hover { color: var(--text); border-bottom-color: var(--gold) }
.nav-link:disabled { opacity: 0.5; cursor: default }
.dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--gold) }
.account { display: flex; align-items: center; gap: 8px; margin: 0; white-space: nowrap }
.account-avatar { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: var(--surface-low) }
.account-avatar svg { grid-area: 1 / 1 }
.account-avatar .ring { width: 32px; height: 32px }
.account-avatar .lucide { width: 16px; height: 16px }
.account-text { display: grid; color: var(--sub); font-size: 11px; font-variant-numeric: tabular-nums }
.account-text b { color: var(--text); font-size: 13px; font-weight: 600 }
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
  overflow: hidden;
  white-space: nowrap;
}
.cpu-meter .readout {
  min-width: 9ch;
  flex: none;
  text-align: left;
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
.editor-column {
  container: editor / inline-size;
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
@container editor (width < 520px) {
  .editor-column :deep(.deploy kbd) { display: none }
}
@media (width > 800px) {
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
.quest-tab { flex: 1; min-height: 0; display: flex; flex-direction: column }
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
  padding: 0 6px;
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
  container-type: inline-size;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 6px 8px;
  font: 12px var(--mono);
}
.console .empty { margin: 0; color: var(--sub) }
.console .line {
  display: grid;
  grid-template-columns: 4.6em minmax(0, 1fr) fit-content(40%);
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
.console .where { overflow-wrap: anywhere }
@container (max-width: 360px) {
  .console .line { grid-template-columns: minmax(4ch, max-content) minmax(0, 1fr); row-gap: 2px }
  .console .where { grid-column: 2 }
}
.console .text { display: flex; gap: 6px; align-items: flex-start; min-width: 0 }
.console .body { min-width: 0; white-space: pre-wrap; overflow-wrap: anywhere }
.console .line.warn .text::before { content: '▲' / 'Warning'; color: var(--gold) }
.console .line.error .text::before { content: '!' / 'Error'; color: var(--alert); font-weight: bold }
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
