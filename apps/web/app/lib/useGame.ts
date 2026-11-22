import { isStarterProject } from '../../../../packages/sim/src/packs/workshop/campaign'
import { workshopEdit } from '../../../../packages/sim/src/packs/workshop/starter'
import { workshopLessons } from '../../../../packages/sim/src/packs/workshop/pack'
import {
  createCampaign, currentStep, getSurface, jumpToStep,
  placeNames, primaryButton, revealed,
  TICK_MS,
  townSnapshot,
  type ProjectFiles,
  type WorkshopSection,
} from '@inherit/sim'
import { usePlaybackClock } from './playback-clock'
import { usePlayback } from './usePlayback'
import type { CpuStats } from '@inherit/sandbox'
import { appendConsoleLines, type ConsoleRow } from './console-log'
import type { Action, CallSite, Frame, GameLog } from './gameProtocol'
export type { CallSite, GameLog } from './gameProtocol'

import { readPackSlot } from './pack-storage'
import { packKey, type SolveStats } from '@inherit/sim/save'
import { restoreWorkshop, workshopSave } from '../../../../packages/sim/src/packs/workshop/save'
const saveKey = packKey('workshop')
const reloadKey = 'inherit.workshop.reloadedBuild'
const key: InjectionKey<GameStore> = Symbol('campaign')
export type GameStore = ReturnType<typeof createGameStore>
/** Shared IDE and floor interface. Refs expose detached campaign frames, the editable
 * project, telemetry and story unlocks. Submit mutations with the store methods so the
 * worker applies them in order between simulation ticks. */
export function useGame() {
  const game = inject(key)
  if (!game) throw new Error('Mount this component inside the workshop.')
  return game
}
export function provideGame() {
  const store = createGameStore()
  provide(key, store)
  return store
}
function createGameStore() {
  const { buildId } = useRuntimeConfig().app
  const state = shallowRef(createCampaign())
  const town = shallowRef(townSnapshot(state.value))
  const files = shallowRef(state.value.project.working)
  const activeFile = ref('main.ts'),
    selected = ref(''),
    navigation = shallowRef({ file: 'main.ts', line: 1 })
  const ready = ref(false),
    error = ref(''),
    notice = ref('')
  const active = ref(false)
  const saved = ref(true),
    blockedSave = ref(false)
  const logs = shallowRef<ConsoleRow[]>([])
  const traces = shallowRef<Record<string, CallSite[]>>({})
  const cpu = shallowRef<CpuStats>({ calls: 0, interrupts: 0, used: 0, budget: 96 })
  const step = computed(() => currentStep(state.value))
  const button = computed(() => primaryButton(state.value))
  const places = computed(() => placeNames(state.value))
  const reveals = computed(() => revealed(state.value))
  const sections = computed(() => surface.value.sections)
  const letters = computed(() => state.value.progress.messages.filter(m =>
    reveals.value.some(r => r.kind === 'letter' && r.id === m.id),
  ))
  const surface = computed(() => getSurface(state.value))
  const reference = shallowRef<import('@inherit/sim').ApiEntry[]>([])
  const api = ref('')
  const clock = usePlaybackClock()
  const playback = usePlayback(clock)
  const tickCalls = shallowRef<Frame['calls']>([])
  const tickCount = ref(0)
  const stoppingLoop = ref(false)
  const hand = computed(() => (playback.watching.value || playback.call.value)
    ? playback.hand.value
    : state.value.world.hand?.item ?? null)
  const busy = ref(false)
  const { speed, paused } = clock
  const tickInterval = computed(() => TICK_MS / speed.value)
  let resumeClock = true
  const query = new URLSearchParams(location.search)
  const local = import.meta.dev || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
  const preview = query.get('lesson') ?? (local ? query.get('step') : null)
  const frontier = shallowRef<string>()
  const checkpoints: Record<string, string> = {}
  const drafts: Record<string, ProjectFiles> = {}
  const hints = ref<Record<string, number>>({})
  const awards = ref<Record<string, SolveStats>>({})
  const attempts = ref<Record<string, number>>({})
  const savedFrontierIndex = computed(() => frontier.value ? restoreWorkshop(frontier.value).campaign.lesson.index : undefined)
  const completed = computed(() => {
    const index = savedFrontierIndex.value ?? state.value.lesson.index
    return workshopLessons.slice(0, index).map(l => l.id)
  })
  function snapshot() {
    return JSON.stringify(workshopSave(state.value, activeFile.value, active.value))
  }
  function rememberEntry() {
    const id = step.value?.step.id
    if (id && !checkpoints[id]) checkpoints[id] = snapshot()
  }
  function restore(raw: string) {
    const saved = restoreWorkshop(raw)
    stop()
    acknowledged = undefined
    state.value = saved.campaign
    files.value = state.value.project.working
    activeFile.value = saved.activeFile
    town.value = townSnapshot(state.value)
    logs.value = []
    error.value = ''
    resumeClock = false
    openDraft()
    start()
  }
  function selectLesson(id: string) {
    if (busy.value || step.value?.step.id === id) return
    if (frontier.value && JSON.parse(frontier.value).lessonId === id) return returnToFrontier()
    if (!completed.value.includes(id)) return
    const before = snapshot()
    if (step.value) drafts[step.value.step.id] = files.value
    frontier.value ??= before
    const entry = checkpoints[id] ?? JSON.stringify(workshopSave(jumpToStep(createCampaign(), id)))
    restore(entry)
    if (drafts[id]) update(drafts[id])
    persist()
  }
  function returnToFrontier() {
    if (!frontier.value) return
    if (step.value) drafts[step.value.step.id] = files.value
    const raw = frontier.value
    frontier.value = undefined
    restore(raw)
    persist()
  }
  const dirty = computed(() => JSON.stringify(files.value) !== JSON.stringify(state.value.project.deployed))
  const queue: Action[] = []
  let worker: Worker | undefined, current: Action | undefined, rollbackDraft: ProjectFiles | undefined
  let nextTickAt = 0
  let timer: ReturnType<typeof setTimeout>,
    watchdog: ReturnType<typeof setTimeout>,
    autosave: ReturnType<typeof setInterval>
  let buildCheck: AbortController | undefined
  let continueBoundary: string | undefined
  let acknowledged: Frame | undefined
  function persist() {
    if (blockedSave.value || preview !== null) return
    try {
      const save = {
        ...state.value, ...acknowledged?.campaign,
        project: { ...(acknowledged?.project ?? state.value.project), working: files.value },
      }
      if (current?.type === 'continue' && acknowledged) return
      const clockActive = !stoppingLoop.value && (acknowledged?.active ?? active.value)
      localStorage.setItem(saveKey, JSON.stringify({
        ...workshopSave(save, activeFile.value, clockActive), frontier: frontier.value,
        checkpoints, drafts, hints: hints.value, attempts: attempts.value, awards: awards.value,
      }))
      saved.value = true
    } catch {
      saved.value = false
    }
  }
  function stop() {
    playback.clear()
    tickCalls.value = []
    stoppingLoop.value = false
    busy.value = false
    buildCheck?.abort()
    clearTimeout(timer)
    clearTimeout(watchdog)
    worker?.terminate()
    worker = undefined
    current = undefined
    queue.length = 0
    paused.value = false
    ready.value = false
    active.value = false
  }
  async function assetFailed(message: string) {
    stop()
    error.value = message
    const check = new AbortController()
    buildCheck = check
    try {
      const response = await fetch('/_nuxt/builds/latest.json', { cache: 'no-store', signal: check.signal })
      if (!response.ok) return
      const { id } = await response.json()
      if (
        check.signal.aborted ||
        typeof id !== 'string' ||
        !id ||
        id === buildId ||
        sessionStorage.getItem(reloadKey) === id
      )
        return
      persist()
      if (saved.value && !blockedSave.value) {
        sessionStorage.setItem(reloadKey, id)
        window.location.reload()
      }
    } catch {
      /* Run stays available when the manifest is offline. */
    }
  }
  const chunkErrors = new WeakSet<Error>()
  useRuntimeHook('app:chunkError', ({ error }) => {
    if (error instanceof Error) chunkErrors.add(error)
    onNuxtReady(() => assetFailed('Could not load part of the workshop. Reload the page.'))
  })
  onErrorCaptured((e) => {
    if (e instanceof Error && chunkErrors.has(e)) return false
  })
  function pump() {
    clearTimeout(timer)
    if (!worker || current) return
    current = queue.shift()
    if (!current) {
      if (!paused.value && step.value?.phase !== 'solved') {
        const delay = Math.max(0, (nextTickAt - clock.now()) / speed.value)
        timer = setTimeout(() => act({ type: 'step' }), delay)
      }
      return
    }
    if (current.type === 'step') nextTickAt = clock.now() + TICK_MS
    if (current.type === 'rollback') rollbackDraft = files.value
    watchdog = setTimeout(
      () => {
        stop()
        error.value = 'Controller worker timed out. Run to retry.'
      },
      current.type === 'step' ? 3000 : 30000,
    )
    worker.postMessage(current)
  }
  watch([paused, speed], pump)
  function act(action: Action) {
    if (!worker) return
    queue.push(action)
    pump()
  }
  async function receive(frame: Frame) {
    clearTimeout(watchdog)
    const action = current!
    const instance = worker
    const mode = action.type === 'run' ? 'run' : action.type === 'step' ? 'tick' : 'setup'
    // A Run that fails before executing leaves the previous hand in place.
    const returned = mode === 'run' && frame.campaign.world.tick !== state.value.world.tick
      ? state.value.world.hand : undefined
    acknowledged = frame
    const tickStarted = action.type === 'step' ? nextTickAt - TICK_MS : undefined
    await playback.play(frame.calls, mode, returned, tickStarted)
    if (worker !== instance) return
    current = undefined
    if (frame.api !== undefined) api.value = frame.api
    if (frame.reference) reference.value = frame.reference
    const c = {
      ...frame.campaign,
      project: frame.project ?? state.value.project,
      seenSections: state.value.seenSections,
    }
    if (action.type === 'stopLoop') stoppingLoop.value = false
    active.value = frame.active
    tickCount.value = frame.tickCount
    if (action.type === 'step' || !frame.active || action.type === 'deploy' || action.type === 'continue') {
      tickCalls.value = action.type === 'step' && frame.active ? frame.calls : []
    }
    playback.hand.value = c.world.hand?.item ?? null
    if (!frame.active) paused.value = false
    if (action.type === 'rollback' && !frame.error && !frame.notice && files.value === rollbackDraft) {
      files.value = c.project.working
      if (!(activeFile.value in files.value)) openFile('main.ts')
    }
    if (action.type === 'continue') {
      const next = workshopLessons[c.lesson.index]
      if (next && next.id !== step.value?.step.id) {
        const starter = next.starter(files.value)
        files.value = starter.files
        openFile(starter.edit.file,starter.edit.line)
      }
    }
    c.project.working = files.value
    state.value = c
    acknowledged = undefined
    if (action.type === 'continue') rememberEntry()
    town.value = frame.town
    const tick = c.world.tick
    const lines: GameLog[] = frame.logs.map((text) => ({ tick, text, level: 'log' }))
    for (const record of frame.calls) {
      if (record.message) lines.push({ tick, level: 'log', text: record.message, file: record.file, line: record.line })
    }
    if (frame.error && error.value !== frame.error) {
      const loc = /^(?:Deploy failed · )?([\w./-]+\.ts):(\d+)/.exec(frame.error)
      lines.push({
        tick,
        level: 'error',
        text: frame.error,
        file: loc?.[1],
        line: loc ? Number(loc[2]) : undefined,
      })
    }
    logs.value = appendConsoleLines(logs.value, lines)
    error.value = frame.error
    if (frame.notice) notice.value = frame.notice
    cpu.value = frame.cpu
    traces.value = frame.traces
    if (action.type !== 'step') persist()
    if (action.type === 'continue' && continueBoundary && !saved.value) {
      restore(continueBoundary)
      continueBoundary = undefined
      notice.value = 'Could not save progress. Free space and try again.'
      return
    }
    if (action.type === 'continue') continueBoundary = undefined
    ready.value = true
    if (!stoppingLoop.value && ['run', 'deploy', 'continue', 'stopLoop'].includes(action.type)) busy.value = false
    pump()
  }
  function start() {
    stop()
    const failed = 'Could not start the controller worker. Reload the page or run again.'
    try {
      const instance = new Worker(new URL('./runner.worker.ts', import.meta.url), { type: 'module' })
      worker = instance
      instance.onerror = () => {
        if (worker === instance) void assetFailed(failed)
      }
      instance.onmessage = ({ data }: MessageEvent<Frame>) => {
        if (worker === instance) receive(data)
      }
      act({ type: 'init', campaign: state.value, resumeClock })
    } catch {
      void assetFailed(failed)
    }
  }
  function submit(type: 'deploy' | 'run' = button.value) {
    if (busy.value || blockedSave.value || (!ready.value && !error.value)) return
    if (step.value) attempts.value[step.value.step.id] = (attempts.value[step.value.step.id] ?? 0) + 1
    if (!worker) start()
    paused.value = false
    busy.value = true
    playback.messages.value = []
    act({ type, files: files.value })
    persist()
  }
  function stopLoop() {
    if (!active.value || stoppingLoop.value) return
    stoppingLoop.value = true
    busy.value = true
    paused.value = false
    act({ type: 'stopLoop' })
    persist()
  }
  function advance() {
    if (busy.value || step.value?.phase !== 'solved') return
    if (frontier.value) return returnToFrontier()
    drafts[step.value.step.id] = files.value
    const id = step.value.step.id
    awards.value[id] = { firstTry: attempts.value[id] === 1, noHints: !hints.value[id] }
    continueBoundary = snapshot()
    busy.value = true
    playback.clear()
    act({ type: 'continue' })
  }
  function openFile(file: string, line = 1) {
    if (!Object.hasOwn(files.value, file)) return
    activeFile.value = file
    navigation.value = { file, line }
  }
  function update(next: ProjectFiles) {
    files.value = next
    state.value = { ...state.value, project: { ...state.value.project, working: next } }
    persist()
    return true
  }
  function valid(path: string) {
    return path.length <= 128 && /^(?:[\w-][\w.-]*\/)*[\w-][\w.-]*\.ts$/.test(path) && !path.endsWith('.d.ts')
  }
  function createFile(path: string, source = '') {
    return (
      valid(path) &&
      !Object.hasOwn(files.value, path) &&
      Object.keys(files.value).length < 32 &&
      update({ ...files.value, [path]: source })
    )
  }
  function setFile(path: string, source: string) {
    return Object.hasOwn(files.value, path) && update({ ...files.value, [path]: source })
  }
  function deleteFile(path: string) {
    if (path === 'main.ts' || !Object.hasOwn(files.value, path)) return false
    const next = { ...files.value }
    delete next[path]
    update(next)
    if (activeFile.value === path) openFile('main.ts')
    return true
  }
  function renameFile(from: string, to: string) {
    if (
      from === 'main.ts' ||
      !Object.hasOwn(files.value, from) ||
      !valid(to) ||
      Object.hasOwn(files.value, to)
    )
      return false
    const next = { ...files.value, [to]: files.value[from]! }
    delete next[from]
    update(next)
    if (activeFile.value === from) openFile(to)
    return true
  }
  function selectMachine(id: string) {
    selected.value = id
    const site = traces.value[id]?.at(-1)
    if (site) openFile(site.file, site.line)
  }
  // Visits belong to the browser. Persist them even if the next worker frame is still in flight.
  function visitSection(section: WorkshopSection) {
    if (!sections.value.includes(section) || state.value.seenSections.includes(section)) return
    state.value = { ...state.value, seenSections: [...state.value.seenSections, section] }
    persist()
  }
  function openDraft() {
    const lesson = workshopLessons[state.value.lesson.index]
    if (!lesson) return
    const { file, line } = workshopEdit(lesson.id, files.value)
    if (activeFile.value !== file && Object.hasOwn(files.value, activeFile.value)) openFile(activeFile.value)
    else openFile(file, line)
  }
  function newGame() {
    stop()
    acknowledged = undefined
    frontier.value = undefined
    for (const id of Object.keys(checkpoints)) delete checkpoints[id]
    for (const id of Object.keys(drafts)) delete drafts[id]
    awards.value = {}
    hints.value = {}
    attempts.value = {}
    state.value = createCampaign()
    town.value = townSnapshot(state.value)
    state.value.project.working = workshopLessons[0].starter(state.value.project.working).files
    files.value = state.value.project.working
    blockedSave.value = false
    logs.value = []
    traces.value = {}
    error.value = ''
    selected.value = ''
    notice.value = ''
    openDraft()
    persist()
    start()
  }
  onMounted(async () => {
    try {
      const id = preview
      speed.value = local ? Math.min(32, Math.max(1, Number(query.get('speed')) || 1)) : 1
      const stored = preview !== null ? null : await readPackSlot('workshop')
      if (id !== null) {
        if (!workshopLessons.some(l => l.id === id)) throw new Error('Unknown lesson.')
        state.value = jumpToStep(createCampaign(), id)
        const starter = workshopLessons[state.value.lesson.index].starter(state.value.project.working)
        state.value.project.working = starter.files
      } else if (!stored) {
        state.value.project.working = workshopLessons[0].starter(state.value.project.working).files
      } else if (stored) {
        const restored = restoreWorkshop(stored)
        const data = JSON.parse(stored)
        Object.assign(checkpoints, data.checkpoints)
        Object.assign(drafts, data.drafts)
        frontier.value = data.frontier
        awards.value = data.awards ?? {}
        hints.value = data.hints ?? {}
        attempts.value = data.attempts ?? {}
        state.value = restored.campaign
        activeFile.value = restored.activeFile
        resumeClock = restored.clockActive
        paused.value = resumeClock
      }
      town.value = townSnapshot(state.value)
      files.value = state.value.project.working
    } catch (cause) {
      blockedSave.value = true
      saved.value = false
      error.value = cause instanceof Error ? cause.message : 'Save could not be loaded.'
      return
    }
    openDraft()
    rememberEntry()
    start()
    if (resumeClock && state.value.lesson.phase !== 'solved' && !isStarterProject(state.value.project.deployed)) paused.value = true
    autosave = setInterval(persist, 3000)
    window.addEventListener('pagehide', persist)
  })
  onBeforeUnmount(() => {
    persist()
    stop()
    clearInterval(autosave)
    window.removeEventListener('pagehide', persist)
  })
  return {
    town,
    campaign: computed(() => state.value),
    files: computed(() => files.value),
    activeFile,
    navigation,
    selected,
    selectMachine,
    openFile,
    setFile,
    createFile,
    renameFile,
    deleteFile,
    submit, advance, busy, playback, hand,
    stopLoop, stoppingLoop, tickCount, tickCalls,
    awards, hints, attempts, completed, selectLesson, persist, blockedSave, preview,
    step, button, places, reveals, sections, letters,
    surface,
    reference,
    api,
    dirty,
    cpu,
    logs,
    clearLogs: () => {
      logs.value = []
    },
    traces,
    ready,
    active,
    paused,
    speed,
    tickInterval,
    visitSection,
    error,
    notice,
    saved,
    act,
    newGame,
  }
}
