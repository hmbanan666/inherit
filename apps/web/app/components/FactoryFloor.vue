<script setup lang="ts">
import { Application } from 'pixi.js'
import { Minus, Plus, Maximize, X, MapPin } from '@lucide/vue'
import { MACHINES, TICK_MS } from '@inherit/sim'
import { useGame } from '../lib/useGame'
import { center, FloorScene, tile } from '../lib/floor'

const props = defineProps<{ highlighted: string[] }>()
const g = useGame(),
  { campaign, selected } = g
const world = computed(() => campaign.value.world)
const host = ref<HTMLElement>(),
  mount = ref<HTMLElement>()
const size = ref({ w: 800, h: 500 }),
  pan = ref({ x: 0, y: 0 }),
  zoom = ref(1)
const renderError = ref('')
let app: Application | undefined,
  scene: FloorScene | undefined,
  observer: ResizeObserver | undefined,
  disposed = false
let paintKey = ''
const pointers = new Map<number, { x: number; y: number }>()
const scale = computed(
  () => Math.max(0.38, Math.min(1.6, size.value.w / (tile * 9.5), size.value.h / (tile * 5.9))) * zoom.value,
)
const camera = computed(() => ({
  x: size.value.w / 2 - 4 * tile * scale.value + pan.value.x,
  y: size.value.h / 2 - 2.45 * tile * scale.value + pan.value.y,
}))
function recenter() {
  pan.value = { x: 0, y: 0 }
  zoom.value = 1
}
function zoomBy(ratio: number, px = size.value.w / 2, py = size.value.h / 2) {
  const before = zoom.value
  zoom.value = Math.min(2.8, Math.max(0.32, before * ratio))
  const f = zoom.value / before
  pan.value = {
    x: pan.value.x * f + (px - size.value.w / 2) * (1 - f),
    y: pan.value.y * f + (py - size.value.h / 2) * (1 - f),
  }
}
function wheel(e: WheelEvent) {
  const r = host.value!.getBoundingClientRect()
  zoomBy(Math.exp(-Math.max(-130, Math.min(130, e.deltaY)) * 0.0026), e.clientX - r.left, e.clientY - r.top)
}
const structure = computed(() =>
  JSON.stringify([
    world.value.machines.map((m) => [m.id, m.x, m.y, m.kind, m.siteId]),
    world.value.belts.map((b) => [b.from, b.to, b.path]),
  ]),
)
function sync() {
  if (!app) return
  if (!scene || paintKey !== structure.value) {
    scene?.destroy()
    scene = new FloorScene(world.value, false)
    app.stage.addChild(scene.root)
    paintKey = structure.value
  }
  scene.root.scale.set(scale.value)
  scene.root.position.set(camera.value.x, camera.value.y)
  scene.update(world.value)
}
watch([world, camera, scale], sync)
function highlightLines() {
  for (const id of props.highlighted) scene?.highlightMachine(id)
}
watch(() => props.highlighted, highlightLines)
function inspect(id: string) {
  scene?.highlightMachine(id)
  g.selectMachine(id)
}
function down(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button,aside') || e.button !== 0) return
  host.value!.focus({ preventScroll: true })
  host.value!.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
}
function move(e: PointerEvent) {
  const old = pointers.get(e.pointerId)
  if (!old) return
  const other = [...pointers].find(([id]) => id !== e.pointerId)?.[1]
  if (other) {
    const r = host.value!.getBoundingClientRect()
    zoomBy(
      Math.hypot(e.clientX - other.x, e.clientY - other.y) /
        Math.max(1, Math.hypot(old.x - other.x, old.y - other.y)),
      (e.clientX + other.x) / 2 - r.left,
      (e.clientY + other.y) / 2 - r.top,
    )
  } else {
    const dx = e.clientX - old.x,
      dy = e.clientY - old.y
    if (dx || dy) {
      pan.value = { x: pan.value.x + dx, y: pan.value.y + dy }
    }
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
}
function up(e: PointerEvent) {
  pointers.delete(e.pointerId)
}
function cancel() {
  pointers.clear()
}
const machine = computed(() => world.value.machines.find((m) => m.id === selected.value))
const inspectorOnRight = computed(() => {
  const m = machine.value
  if (!m) return false
  const x = center(m.siteId, m).x * scale.value + camera.value.x
  return x < size.value.w / 2
})
const bins = computed(() =>
  Object.entries(
    machine.value?.queue.reduce<Record<string, number>>((r, i) => {
      r[i.kind] = (r[i.kind] ?? 0) + 1
      return r
    }, {}) ?? {},
  ),
)
function pos(x: number, y: number) {
  return { left: x + 'px', top: y + 'px' }
}
onMounted(async () => {
  const renderer = new Application()
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', cancel)
  try {
    await renderer.init({
      width: 1,
      height: 1,
      preference: 'canvas',
      backgroundAlpha: 0,
      antialias: true,
      resolution: devicePixelRatio,
      autoDensity: true,
    })
    if (disposed) {
      renderer.destroy(true, { children: true })
      return
    }
    app = renderer
    mount.value!.appendChild(app.canvas)
    function resize() {
      const w = host.value!.clientWidth,
        h = host.value!.clientHeight
      size.value = { w, h }
      renderer.renderer.resize(w, h, devicePixelRatio)
      sync()
    }
    resize()
    highlightLines()
    observer = new ResizeObserver(resize)
    observer.observe(host.value!)
    renderer.ticker.maxFPS = 40
    renderer.ticker.add(() => scene?.animate(performance.now(), TICK_MS, false))
  } catch {
    renderError.value = 'Could not open the floor renderer. Reload to retry.'
  }
})
onBeforeUnmount(() => {
  disposed = true
  window.removeEventListener('pointermove', move)
  window.removeEventListener('pointerup', up)
  window.removeEventListener('pointercancel', cancel)
  observer?.disconnect()
  app?.destroy(true, { children: true })
})
</script>
<template>
  <div
    ref="host"
    class="floor"
    tabindex="0"
    aria-label="Factory map"
    @wheel.prevent="wheel"
    @keydown.esc="selected = ''"
    @pointerdown="down"
  >
    <div ref="mount" class="pixi-mount"></div>
    <div
      class="map-overlay"
      :style="{ transform: 'translate(' + camera.x + 'px,' + camera.y + 'px) scale(' + scale + ')' }"
    >
      <div
        v-for="m in world.machines"
        :key="m.id"
        class="station"
        :class="{ chosen: selected === m.id }"
        :style="pos(center(m.siteId, m).x, center(m.siteId, m).y)"
      >
        <button class="machine-hit" :aria-label="'Inspect ' + m.id" @click="inspect(m.id)">
          <span class="machine-label"
            >{{ m.id }}<b v-if="m.fault"> · {{ m.fault }}</b></span
          >
        </button>
      </div>
    </div>
    <div class="map-location"><MapPin :size="13" /> Shed floor</div>
    <div class="map-controls">
      <button aria-label="Zoom out" @click="zoomBy(0.8)"><Minus /></button
      ><button aria-label="Center map" @click="recenter()"><Maximize /></button
      ><button aria-label="Zoom in" @click="zoomBy(1.25)"><Plus /></button>
    </div>
    <div v-if="renderError" class="floor-help">{{ renderError }}</div>
    <aside
      v-if="machine"
      class="inspect"
      :class="{ opposite: inspectorOnRight }"
      role="region"
      aria-label="Machine inspector"
    >
      <header>
        <strong>{{ selected }}</strong
        ><button aria-label="Close inspector" @click="selected = ''"><X /></button>
      </header>
      <template v-if="machine"
        ><p>
          {{ machine.kind === 'dock' ? 'Cart' : MACHINES[machine.kind].name }} ·
          {{ machine.fault ?? machine.status }}
        </p>
        <dl>
          <dt>Bins</dt>
          <dd>{{ bins.map(([k, n]) => n + ' ' + k).join(', ') || 'Empty' }}</dd>
          <dt v-if="machine.recipe">Recipe</dt>
          <dd v-if="machine.recipe">{{ machine.recipe }}</dd>
          <dt>Processed</dt>
          <dd>{{ machine.stats.processed }} · {{ machine.stats.rate }}/min</dd>
        </dl>
        <button
          v-for="s in g.traces.value[machine.id]"
          :key="s.file + s.line"
          @click="g.openFile(s.file, s.line)"
        >
          {{ s.fn }} · {{ s.file }}:{{ s.line }}
        </button>
      </template>
    </aside>
  </div>
</template>
