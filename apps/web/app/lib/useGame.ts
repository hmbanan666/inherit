import { workshopEdit } from '../../../../packages/sim/src/packs/workshop/starter'
import { workshopLessons } from '../../../../packages/sim/src/packs/workshop/pack'
import {
  createCampaign, currentStep, getSurface, jumpToStep,
  loadSave, placeNames, primaryButton, revealed, serializeSave,
  TICK_MS,
  townSnapshot,
  type ProjectFiles,
  type WorkshopSection,
} from '@inherit/sim'
import { usePlayback } from './usePlayback'
import type { CpuStats } from '@inherit/sandbox'
import { appendConsoleLines, type ConsoleRow } from './console-log'
import type { Action, CallSite, Frame, GameLog } from './gameProtocol'
export type { CallSite, GameLog } from './gameProtocol'

import { packKey } from '@inherit/sim/save'
import { importWorkshop, restoreWorkshop, workshopSave } from '../../../../packages/sim/src/packs/workshop/save'
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
  const playback = usePlayback()
  const hand = computed(() => (playback.watching.value || playback.call.value)
    ? playback.hand.value
    : state.value.world.hand?.item ?? null)
  const busy = ref(false)
  let speed = 1
  let resumeClock = true
  let storageKey = saveKey
  const dirty = computed(() => JSON.stringify(files.value) !== JSON.stringify(state.value.project.deployed))
  const queue: Action[] = []
  let worker: Worker | undefined, current: Action | undefined, rollbackDraft: ProjectFiles | undefined
  let nextTickAt = 0
  let timer: ReturnType<typeof setTimeout>,
    watchdog: ReturnType<typeof setTimeout>,
    autosave: ReturnType<typeof setInterval>
  let buildCheck: AbortController | undefined
  let acknowledged: Frame | undefined
  function persist() {
    if (blockedSave.value) return
    try {
      const save = {
        ...state.value, ...acknowledged?.campaign,
        project: { ...(acknowledged?.project ?? state.value.project), working: files.value },
      }
      localStorage.setItem(storageKey, JSON.stringify(workshopSave(save, activeFile.value, acknowledged?.active ?? active.value)))
      saved.value = true
    } catch {
      saved.value = false
    }
  }
  function stop() {
    playback.clear()
    busy.value = false
    buildCheck?.abort()
    clearTimeout(timer)
    clearTimeout(watchdog)
    worker?.terminate()
    worker = undefined
    current = undefined
    queue.length = 0
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
      timer = setTimeout(() => act({ type: 'step' }), Math.max(0, nextTickAt - performance.now()))
      return
    }
    if (current.type === 'step') nextTickAt = performance.now() + TICK_MS / speed
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
    await playback.play(frame.calls, mode, speed, returned)
    if (worker !== instance) return
    current = undefined
    if (frame.api !== undefined) api.value = frame.api
    if (frame.reference) reference.value = frame.reference
    const c = {
      ...frame.campaign,
      project: frame.project ?? state.value.project,
      seenSections: state.value.seenSections,
    }
    active.value = frame.active
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
    ready.value = true
    if (['run', 'deploy', 'continue'].includes(action.type)) busy.value = false
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
    if (busy.value || (!ready.value && !error.value)) return
    if (!worker) start()
    busy.value = true
    playback.messages.value = []
    act({ type, files: files.value })
    persist()
  }
  function advance() {
    if (busy.value || step.value?.phase !== 'solved') return
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
  function restoreSnapshot(id: number) {
    const r = state.value.project.snapshots.find((s) => s.id === id)
    if (r) {
      update({ ...r.files })
      openFile('main.ts')
      persist()
    }
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
    openFile(file, line)
  }
  function newGame() {
    stop()
    acknowledged = undefined
    state.value = createCampaign()
    town.value = townSnapshot(state.value)
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
  onMounted(() => {
    try {
      const local = import.meta.dev || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
      const query = new URLSearchParams(local ? location.search : '')
      const id = query.get('lesson') ?? query.get('step')
      if (id) storageKey = saveKey + '.preview.' + id
      speed = Math.min(32, Math.max(1, Number(query.get('speed')) || 1))
      let stored = localStorage.getItem(storageKey)
      const legacy = !id && !stored && localStorage.getItem('inherit.workshop.v1')
      if (legacy) {
        stored = JSON.stringify(importWorkshop(legacy))
        restoreWorkshop(stored)
        localStorage.setItem(storageKey, stored)
      }
      const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      const resumePreview = entry?.type === 'reload' || entry?.type === 'back_forward'
      if (id && !(stored && resumePreview)) {
        state.value = jumpToStep(createCampaign(), id)
        const starter = workshopLessons[state.value.lesson.index]?.starter(state.value.project.working)
        if (starter) state.value.project.working = starter.files
      }
      else if (stored) {
        const restored = restoreWorkshop(stored)
        state.value = restored.campaign
        activeFile.value = restored.activeFile
        resumeClock = restored.clockActive
      }
      town.value = townSnapshot(state.value)
      files.value = state.value.project.working
    } catch {
      blockedSave.value = true
      saved.value = false
      notice.value = 'Save could not be loaded. New game replaces it.'
    }
    openDraft()
    start()
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
    rollback: (id: number) => act({ type: 'rollback', id }),
    snapshot: (name: string) => act({ type: 'snapshot', name, files: files.value }),
    restoreSnapshot,
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
    visitSection,
    error,
    notice,
    saved,
    act,
    newGame,
  }
}
