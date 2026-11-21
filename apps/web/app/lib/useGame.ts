import {
  apiDeclarations,
  apiReference,
  bramLessons,
  type ApiEntry,
  createCampaign,
  getSurface,
  loadSave,
  onboardingStep,
  requestChecks,
  serializeSave,
  TICK_MS,
  townSnapshot,
  type ProjectFiles,
  type WorkshopSection,
} from '@inherit/sim'
import { sandboxDeclarations } from '@inherit/sandbox/declarations'
import type { CpuStats } from '@inherit/sandbox'
import { appendConsoleLines, type ConsoleRow } from './console-log'
import type { Action, CallSite, Frame, GameLog, MetricSample } from './gameProtocol'
export type { CallSite, GameLog, MetricSample } from './gameProtocol'

const saveKey = 'inherit.workshop.v1' // The sim migrates the old notebook in place.
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
  const logs = shallowRef<ConsoleRow[]>([]),
    metrics = shallowRef<MetricSample[]>([])
  const traces = shallowRef<Record<string, CallSite[]>>({})
  const cpu = shallowRef<CpuStats>({ calls: 0, interrupts: 0, used: 0, budget: 96 })
  const draftExportsOnTick = ref(false)
  const lessonStep = computed(() => onboardingStep(state.value, draftExportsOnTick.value))
  const checks = computed(() => requestChecks(state.value, draftExportsOnTick.value))
  const lessonCheck = computed(() => state.value.town.beat === 1
    ? checks.value.find(check => check.id === bramLessons[lessonStep.value].check)
    : undefined)
  const surface = computed(() => getSurface(state.value))
  const reference = shallowRef<ApiEntry[]>([])
  const api = ref('')
  watch([() => state.value.town.beat, lessonStep], () => {
    reference.value = apiReference(state.value)
    api.value = apiDeclarations(state.value) + '\n' + sandboxDeclarations
  }, { immediate: true })
  const dirty = computed(() => JSON.stringify(files.value) !== JSON.stringify(state.value.project.deployed))
  const queue: Action[] = []
  let worker: Worker | undefined, current: Action | undefined, rollbackDraft: ProjectFiles | undefined
  let timer: ReturnType<typeof setTimeout>,
    watchdog: ReturnType<typeof setTimeout>,
    autosave: ReturnType<typeof setInterval>
  let buildCheck: AbortController | undefined,
    errors = 0
  function persist() {
    if (blockedSave.value) return
    try {
      const save = {
        ...state.value,
        project: { ...state.value.project, working: files.value },
      }
      localStorage.setItem(saveKey, serializeSave(save))
      saved.value = true
    } catch {
      saved.value = false
    }
  }
  function stop() {
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
      timer = setTimeout(() => act({ kind: 'step' }), TICK_MS)
      return
    }
    if (current.kind === 'rollback') rollbackDraft = files.value
    watchdog = setTimeout(
      () => {
        stop()
        error.value = 'Controller worker timed out. Run to retry.'
      },
      current.kind === 'step' ? 3000 : 30000,
    )
    worker.postMessage(current)
  }
  function act(action: Action) {
    if (!worker) return
    queue.push(action)
    pump()
  }
  function receive(frame: Frame) {
    clearTimeout(watchdog)
    const action = current!
    current = undefined
    const c = { ...frame.campaign, project: frame.project ?? state.value.project, seenSections: state.value.seenSections }
    active.value = frame.active
    if (action.kind === 'rollback' && !frame.error && !frame.notice && files.value === rollbackDraft) {
      files.value = c.project.working
      if (!(activeFile.value in files.value)) openFile('main.ts')
    }
    c.project.working = files.value
    state.value = c
    town.value = frame.town
    const tick = c.world.tick
    const lines: GameLog[] = frame.logs.map((text) => ({ tick, text, level: 'log' }))
    if (frame.error && error.value !== frame.error) {
      const loc = /^(?:Deploy failed · )?([\w./-]+\.ts):(\d+)/.exec(frame.error)
      lines.push({
        tick,
        level: 'error',
        text: frame.error,
        file: loc?.[1],
        line: loc ? Number(loc[2]) : undefined,
      })
      errors++
    }
    logs.value = appendConsoleLines(logs.value, lines)
    error.value = frame.error
    if (frame.notice) notice.value = frame.notice
    cpu.value = frame.cpu
    traces.value = frame.traces
    if (action.kind === 'step') {
      const machines = Object.fromEntries(
        c.world.machines.map((m) => {
          const elapsed = Math.max(1, tick - m.builtAt)
          return [
            m.id,
            {
              rate: m.stats.rate,
              idle: m.stats.idleTicks / elapsed,
              blocked: m.stats.blockedTicks / elapsed,
              queue: m.queue.length,
            },
          ]
        }),
      )
      metrics.value = [
        ...metrics.value.slice(-239),
        { tick, money: c.economy.money, cpu: frame.cpu.used, budget: frame.cpu.budget, errors, machines },
      ]
    } else persist()
    ready.value = true
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
      act({ kind: 'init', campaign: state.value })
    } catch {
      void assetFailed(failed)
    }
  }
  function deploy() {
    if (!worker) start()
    act({ kind: 'deploy', files: files.value })
    persist()
  }
  function openFile(file: string, line = 1) {
    if (!Object.hasOwn(files.value, file)) return
    activeFile.value = file
    navigation.value = { file, line }
  }
  function update(next: ProjectFiles) {
    files.value = next
    state.value = { ...state.value, project: { ...state.value.project, working: next } }
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
    if (!surface.value.sections.includes(section) || state.value.seenSections.includes(section)) return
    state.value = { ...state.value, seenSections: [...state.value.seenSections, section] }
    persist()
  }
  function newGame() {
    stop()
    state.value = createCampaign()
    town.value = townSnapshot(state.value)
    files.value = state.value.project.working
    blockedSave.value = false
    logs.value = []
    metrics.value = []
    traces.value = {}
    errors = 0
    error.value = ''
    selected.value = ''
    notice.value = ''
    openFile('main.ts')
    persist()
    start()
  }
  onMounted(() => {
    try {
      state.value = loadSave(localStorage.getItem(saveKey))
      town.value = townSnapshot(state.value)
      files.value = state.value.project.working
    } catch {
      blockedSave.value = true
      saved.value = false
      notice.value = 'Save could not be loaded. New game replaces it.'
    }
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
    deploy,
    rollback: (id: number) => act({ kind: 'rollback', id }),
    snapshot: (name: string) => act({ kind: 'snapshot', name, files: files.value }),
    restoreSnapshot,
    draftExportsOnTick,
    lessonStep,
    lessonCheck,
    checks,
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
    metrics,
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
