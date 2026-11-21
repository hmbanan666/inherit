import { apiDeclarations, createCampaign, getSurface, loadSave, serializeSave, TICK_MS, type ProjectFiles } from '@inherit/sim'
import type { CpuStats } from '@inherit/sandbox'
import type { Action, CallSite, Frame, GameLog, MetricSample } from './gameProtocol'
export type { CallSite, GameLog, MetricSample } from './gameProtocol'

const saveKey = 'inherit.workshop.v1' // The sim migrates the old notebook in place.
const reloadKey = 'inherit.workshop.reloadedBuild'
const key: InjectionKey<GameStore> = Symbol('campaign')
export type GameStore = ReturnType<typeof createGameStore>
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
  const files = shallowRef(state.value.project.working)
  const activeFile = ref('main.ts'), selected = ref(''), navigation = shallowRef({file: 'main.ts', line: 1})
  const speed = ref(1), paused = ref(false), ready = ref(false), error = ref(''), notice = ref('')
  const saved = ref(true), blockedSave = ref(false)
  const logs = shallowRef<GameLog[]>([]), metrics = shallowRef<MetricSample[]>([])
  const traces = shallowRef<Record<string, CallSite[]>>({})
  const cpu = shallowRef<CpuStats>({calls: 0, interrupts: 0, used: 0, budget: 96})
  const surface = computed(() => getSurface(state.value)), api = computed(() => apiDeclarations(state.value))
  const dirty = computed(() => JSON.stringify(files.value) !== JSON.stringify(state.value.project.deployed))
  const queue: Action[] = []
  let worker: Worker | undefined, current: Action | undefined, rollbackDraft: ProjectFiles | undefined
  let timer: ReturnType<typeof setTimeout>, watchdog: ReturnType<typeof setTimeout>, autosave: ReturnType<typeof setInterval>
  let buildCheck: AbortController | undefined, errors = 0
  function persist() {
    if (blockedSave.value) return
    try {
      localStorage.setItem(saveKey, serializeSave({ ...state.value, project: {...state.value.project, working: files.value} }))
      saved.value = true
    } catch { saved.value = false }
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
  }
  async function assetFailed(message: string) {
    stop()
    error.value = message
    const check = new AbortController()
    buildCheck = check
    try {
      const response = await fetch('/_nuxt/builds/latest.json', {cache:'no-store', signal:check.signal})
      if (!response.ok) return
      const {id} = await response.json()
      if (check.signal.aborted || typeof id !== 'string' || !id || id === buildId || sessionStorage.getItem(reloadKey) === id) return
      persist()
      if (saved.value && !blockedSave.value) {
        sessionStorage.setItem(reloadKey, id)
        window.location.reload()
      }
    } catch { /* Run stays available when the manifest is offline. */ }
  }
  const chunkErrors = new WeakSet<Error>()
  useRuntimeHook('app:chunkError', ({ error }) => {
    if (error instanceof Error) chunkErrors.add(error)
    onNuxtReady(() => assetFailed('Could not load part of the workshop. Reload the page.'))
  })
  onErrorCaptured(e => { if (e instanceof Error && chunkErrors.has(e)) return false })
  function pump() {
    clearTimeout(timer)
    if (!worker || current) return
    current = queue.shift()
    if (!current) {
      if (!paused.value) timer = setTimeout(() => act({ kind: 'step' }), TICK_MS / speed.value)
      return
    }
    if (current.kind === 'rollback') rollbackDraft = files.value
    watchdog = setTimeout(() => {
      stop()
      error.value = 'Controller worker timed out. Run to retry.'
    }, current.kind === 'step' ? 3000 : 30000)
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
    const c = frame.campaign
    if (action.kind === 'rollback' && !frame.error && !frame.notice && files.value === rollbackDraft) {
      files.value = c.project.working
      if (!(activeFile.value in files.value)) openFile('main.ts')
    }
    c.project.working = files.value
    state.value = c
    const tick = c.world.tick
    const lines: GameLog[] = frame.logs.map(text => ({tick, text, level: 'log'}))
    if (frame.error && error.value !== frame.error) {
      const loc = /^(.+\.ts):(\d+)/.exec(frame.error)
      lines.push({tick, level:'error', text:frame.error, file:loc?.[1], line:loc ? Number(loc[2]) : undefined})
      errors++
    }
    if (lines.length) logs.value = [...logs.value, ...lines].slice(-256)
    error.value = frame.error
    if (frame.notice) notice.value = frame.notice
    cpu.value = frame.cpu
    traces.value = frame.traces
    if (action.kind === 'step') {
      const machines = Object.fromEntries(c.world.machines.map(m => {
        const elapsed = Math.max(1, tick - m.builtAt)
        return [m.id, {rate:m.stats.rate, idle:m.stats.idleTicks/elapsed, blocked:m.stats.blockedTicks/elapsed, queue:m.queue.length}]
      }))
      metrics.value = [...metrics.value.slice(-239), {tick, money:c.economy.money, cpu:frame.cpu.used, budget:frame.cpu.budget, errors, machines}]
    } else persist()
    ready.value = true
    pump()
  }
  function start() {
    stop()
    const failed = 'Could not start the controller worker. Reload the page or run again.'
    try {
      const instance = new Worker(new URL('./runner.worker.ts', import.meta.url), {type:'module'})
      worker = instance
      instance.onerror = () => { if (worker === instance) void assetFailed(failed) }
      instance.onmessage = ({data}: MessageEvent<Frame>) => { if (worker === instance) receive(data) }
      act({kind:'init', campaign:state.value})
    } catch { void assetFailed(failed) }
  }
  function deploy() {
    if (!worker) start()
    act({kind:'deploy', files:files.value})
    persist()
  }
  function openFile(file: string, line = 1) {
    if (!Object.hasOwn(files.value, file)) return
    activeFile.value = file
    navigation.value = {file, line}
  }
  function update(next: ProjectFiles) {
    files.value = next
    state.value = {...state.value, project:{...state.value.project, working:next}}
    return true
  }
  function valid(path: string) {
    return path.length <= 128 && /^(?:[\w-][\w.-]*\/)*[\w-][\w.-]*\.ts$/.test(path) && !path.endsWith('.d.ts')
  }
  function createFile(path: string, source = '') {
    return valid(path) && !Object.hasOwn(files.value,path) && Object.keys(files.value).length < 32 && update({...files.value,[path]:source})
  }
  function setFile(path: string, source: string) {
    return Object.hasOwn(files.value,path) && update({...files.value,[path]:source})
  }
  function deleteFile(path: string) {
    if (path === 'main.ts' || !Object.hasOwn(files.value,path)) return false
    const next = {...files.value}
    delete next[path]
    update(next)
    if (activeFile.value === path) openFile('main.ts')
    return true
  }
  function renameFile(from: string, to: string) {
    if (from === 'main.ts' || !Object.hasOwn(files.value,from) || !valid(to) || Object.hasOwn(files.value,to)) return false
    const next = {...files.value, [to]:files.value[from]!}
    delete next[from]
    update(next)
    if (activeFile.value === from) openFile(to)
    return true
  }
  function restoreSnapshot(id: number) {
    const r = state.value.project.snapshots.find(s => s.id === id)
    if (r) { update({...r.files}); openFile('main.ts'); persist() }
  }
  function selectMachine(id: string) {
    selected.value = id
    const site = traces.value[id]?.at(-1)
    if (site) openFile(site.file, site.line)
  }
  function newGame() {
    stop()
    state.value = createCampaign()
    files.value = state.value.project.working
    blockedSave.value = false
    logs.value = []; metrics.value = []; traces.value = {}; errors = 0
    error.value = ''; selected.value = ''; notice.value = ''; speed.value = 1; paused.value = false
    openFile('main.ts')
    persist()
    start()
  }
  onMounted(() => {
    try {
      state.value = loadSave(localStorage.getItem(saveKey))
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
  watch([speed, paused], pump)
  onBeforeUnmount(() => { persist(); stop(); clearInterval(autosave); window.removeEventListener('pagehide',persist) })
  return {
    campaign: computed(() => state.value), files: computed(() => files.value), activeFile, navigation, selected,
    selectMachine, openFile, setFile, createFile, renameFile, deleteFile, deploy, rollback: (id:number) => act({kind:'rollback', id}),
    snapshot:(name:string) => act({kind:'snapshot', name, files:files.value}), restoreSnapshot,
    surface, api, dirty, cpu, logs, clearLogs:() => {logs.value = []}, traces, metrics,
    ready, speed, paused, error, notice, saved, act, newGame,
  }
}
