import {
  canConnect,
  canPlace,
  createWorld,
  evaluate,
  levels,
  restoreLayout,
  TICK_MS,
  type Layout,
  type World,
} from '@inherit/sim'
import type { Reply, Request } from './runner.worker'

const SAVE = 'inherit.workshop.v1'
interface Entry {
  code: string
  layout: Layout
  hints: number
}
interface Save {
  current: number
  complete: number[]
  entries: Record<number, Entry>
}
export function useWorkshop() {
  const index = ref(0)
  const level = computed(() => levels[index.value]!)
  const completed = ref<number[]>([])
  const code = ref('')
  const layout = shallowRef<Layout>(structuredClone(levels[0]!.layout))
  const world = shallowRef<World>(createWorld(levels[0]!))
  const checks = computed(() => evaluate(world.value))
  const hints = ref(0)
  const speed = ref(1)
  const running = ref(false)
  const loading = ref(false)
  const dirty = ref(false)
  const error = ref('')
  const selected = ref('')
  const placing = ref(false)
  const notice = ref('')
  const stamped = ref(false)
  const saved = ref(true)
  let entries: Save['entries'] = {}
  let worker: Worker | undefined
  let timer: ReturnType<typeof setTimeout>
  let watchdog: ReturnType<typeof setTimeout>
  let awaiting = false
  let activeCode = ''
  function persist() {
    entries[index.value] = { code: code.value, layout: layout.value, hints: hints.value }
    try {
      localStorage.setItem(SAVE, JSON.stringify({ current: index.value, complete: completed.value, entries }))
      saved.value = true
    } catch {
      saved.value = false
    }
  }
  function stop() {
    clearTimeout(timer)
    clearTimeout(watchdog)
    worker?.terminate()
    worker = undefined
    awaiting = false
    loading.value = false
    running.value = false
  }
  function fail(message: string) {
    stop()
    error.value = message
  }
  function send(message: Request) {
    if (!worker || awaiting) return
    awaiting = true
    watchdog = setTimeout(
      () => fail('Controller worker timed out. Edit the handler and run again.'),
      message.kind === 'init' ? 30_000 : 3000,
    )
    worker.postMessage(message)
  }
  function schedule() {
    clearTimeout(timer)
    if (running.value && !awaiting) timer = setTimeout(() => send({ kind: 'step' }), TICK_MS / speed.value)
  }
  function run(single = false) {
    stop()
    error.value = ''
    notice.value = ''
    stamped.value = false
    activeCode = code.value
    dirty.value = false
    world.value = createWorld(level.value, layout.value)
    const instance = new Worker(new URL('./runner.worker.ts', import.meta.url), { type: 'module' })
    worker = instance
    loading.value = true
    running.value = !single
    instance.onerror = () => {
      if (worker === instance) fail('Could not start the controller worker. Try Run again.')
    }
    instance.onmessage = ({ data }: MessageEvent<Reply>) => {
      if (worker !== instance) return
      clearTimeout(watchdog)
      awaiting = false
      loading.value = false
      if (data.kind === 'error') return fail(data.message)
      if (data.kind === 'ready') {
        send({ kind: 'step' })
        return
      }
      world.value = data.world
      if (!stamped.value && checks.value.every((c) => c.status === 'pass')) {
        stamped.value = true
        if (!completed.value.includes(index.value)) completed.value.push(index.value)
        persist()
      }
      schedule()
    }
    send({ kind: 'init', index: index.value, layout: layout.value, code: code.value })
  }
  function pause() {
    if (!worker) return
    running.value = !running.value
    schedule()
  }
  function oneStep() {
    if (!worker || dirty.value) {
      run(true)
      return
    }
    running.value = false
    clearTimeout(timer)
    send({ kind: 'step' })
  }
  function open(i: number) {
    if (!levels[i] || (i > 0 && !completed.value.includes(i - 1))) return
    index.value = i
    const entry = entries[i]
    code.value = typeof entry?.code === 'string' ? entry.code : level.value.starter
    layout.value = restoreLayout(level.value, entry?.layout)
    hints.value = Math.max(0, Math.min(3, Number(entry?.hints) || 0))
    selected.value = ''
    placing.value = false
    persist()
    run()
  }
  function edit(source: string) {
    code.value = source
    dirty.value = source !== activeCode
    persist()
  }
  function rebuild(next: Layout) {
    layout.value = next
    persist()
    run()
  }
  function place(x: number, y: number) {
    const option = level.value.additions.find((s) => !layout.value.stations.some((m) => m.id === s.id))
    if (!option || !canPlace(level.value, layout.value.stations, x, y)) return
    placing.value = false
    selected.value = option.id
    rebuild({ ...layout.value, stations: [...layout.value.stations, { ...option, x, y }] })
  }
  function connect(from: string, to: string) {
    if (!canConnect(layout.value, from, to)) {
      notice.value = 'That connection cannot carry material.'
      return
    }
    rebuild({ ...layout.value, links: [...layout.value.links, { from, to }] })
  }
  const removable = computed(() => {
    const id = selected.value
    return (
      (layout.value.stations.some((m) => m.id === id) &&
        !level.value.layout.stations.some((m) => m.id === id)) ||
      (layout.value.links.some((b) => b.from + ' → ' + b.to === id) &&
        !level.value.layout.links.some((b) => b.from + ' → ' + b.to === id))
    )
  })
  function remove() {
    if (!removable.value) return
    const id = selected.value
    selected.value = ''
    rebuild({
      stations: layout.value.stations.filter((m) => m.id !== id),
      links: layout.value.links.filter((b) => b.from !== id && b.to !== id && b.from + ' → ' + b.to !== id),
    })
  }
  function hint() {
    hints.value = Math.min(3, hints.value + 1)
    persist()
  }
  function reset() {
    delete entries[index.value]
    open(index.value)
  }
  onMounted(() => {
    let current = 0
    try {
      const stored = JSON.parse(localStorage.getItem(SAVE) ?? '{}') as Partial<Save>
      if (stored?.entries && typeof stored.entries === 'object') entries = stored.entries
      if (Array.isArray(stored?.complete))
        completed.value = levels.map((_, i) => i).filter((i) => stored.complete!.includes(i))
      if (
        Number.isInteger(stored?.current) &&
        levels[stored.current!] &&
        completed.value.includes(stored.current! - 1)
      )
        current = stored.current!
    } catch {
      /* A new notebook also works when browser storage is unavailable. */
    }
    open(current)
  })
  watch(speed, schedule)
  onBeforeUnmount(stop)
  return {
    index,
    level,
    completed,
    code,
    layout,
    world,
    checks,
    hints,
    speed,
    running,
    loading,
    dirty,
    error,
    selected,
    placing,
    notice,
    stamped,
    saved,
    removable,
    run,
    pause,
    oneStep,
    open,
    edit,
    place,
    connect,
    remove,
    hint,
    reset,
  }
}
