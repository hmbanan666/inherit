<script setup lang="ts">
import { Application } from 'pixi.js'
import { Minus, Plus, Maximize, X } from '@lucide/vue'
import { MACHINES, TICK_MS } from '@inherit/sim'
import { useGame } from '../lib/useGame'
import TownPortrait from './town/TownPortrait.vue'
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
const bounds = computed(() => {
  const occupied = world.value.sites.flatMap(site => site.plots.filter(plot =>
    world.value.machines.some(m => m.siteId === site.id && m.x >= plot.x && m.x < plot.x + plot.width &&
      m.y >= plot.y && m.y < plot.y + plot.height),
  ).map(plot => {
    const corner = center(site.id, plot)
    const x = corner.x - tile / 2, y = corner.y - tile / 2
    return { left: x, right: x + plot.width * tile, top: y, bottom: y + plot.height * tile }
  }))
  const left = Math.min(...occupied.map(p => p.left)), right = Math.max(...occupied.map(p => p.right))
  const top = Math.min(...occupied.map(p => p.top)), bottom = Math.max(...occupied.map(p => p.bottom))
  return { x: (left + right) / 2, y: (top + bottom) / 2, w: right - left + .35 * tile, h: bottom - top + tile }
})
const scale = computed(() => Math.min(1.6, size.value.w / bounds.value.w, size.value.h / bounds.value.h) * zoom.value)
const camera = computed(() => ({
  x: size.value.w / 2 - bounds.value.x * scale.value + pan.value.x,
  y: size.value.h * 0.56 - bounds.value.y * scale.value + pan.value.y,
}))
const story = computed(() => g.step.value?.step)
const speaker = computed(() => g.town.value.people.find(p => p.id === story.value?.who))
const travelRail = computed(() => {
  const stops = world.value.machines.map(m => center(m.siteId, m))
  if (!stops.every(stop => stop.y === stops[0]?.y)) return
  const xs = stops.map(stop => stop.x)
  return { left: (Math.min(...xs) - 24) + 'px', width: (Math.max(...xs) - Math.min(...xs) + 48) + 'px', top: (stops[0]!.y + tile * .94) + 'px' }
})
const armPoint = computed(() => {
  const target = world.value.machines.find(m => m.id === g.playback.last.value?.args[0])
  const point = target ? center(target.siteId, target) : bounds.value
  return { x: point.x + (target ? 0 : -tile), y: point.y + tile * .94 }
})
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
    class="floor" data-testid="floor"
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
        :class="{ chosen: selected === m.id || highlighted.includes(m.id), acting: g.playback.call.value?.args[0] === m.id }"
        :style="pos(center(m.siteId, m).x, center(m.siteId, m).y)"
      >
        <button class="machine-hit" :aria-label="'Inspect ' + m.id" @click="inspect(m.id)">
          <span class="machine-label" :data-testid="'place-' + m.id"
            >"{{ m.id }}"<b v-if="m.fault"> · {{ m.fault }}</b></span
          >
        </button>
      </div>
      <div v-if="travelRail" class="travel-rail" :style="travelRail" aria-hidden="true"></div>
      <FloorArm :x="armPoint.x" :y="armPoint.y" :call="g.playback.call.value" :hand="g.hand.value" />
    </div>
    <div v-if="story" class="floor-story" data-testid="speech">
      <TownPortrait v-if="speaker" :person="speaker" />
      <div><strong>{{ speaker?.name ?? story.who }}</strong><p>{{ story.story }}</p></div>
    </div>
    <div v-if="g.button.value === 'deploy'" class="shed-clock" :class="{ running: g.active.value }" aria-label="Factory clock">◷</div>
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
          <template v-if="machine.kind === 'dock' && Object.keys(campaign.town.waiting).length">
            <dt>Nobody ordered these yet</dt>
            <dd>{{ Object.entries(campaign.town.waiting).map(([item,n]) => n + ' ' + item).join(', ') }}</dd>
          </template>
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

<style scoped>
.travel-rail {
  position: absolute; height: 7px; border: solid #242426; border-width: 2px 0;
  background: repeating-linear-gradient(90deg, #756e63 0 4px, #4a4844 4px 12px);
  box-shadow: 0 2px #303033, 0 4px 2px #262629;
}
.floor-story { position: absolute; top: 5%; left: 4%; right: 4%; display: flex; align-items: end; gap: 12px; pointer-events: none; }
.floor-story canvas { width: clamp(48px, 6vw, 86px); image-rendering: pixelated; }
.floor-story > div { max-width: 345px; padding: 12px 16px; border: 1px solid var(--line-strong); border-radius: 12px 12px 12px 1px; background: var(--panel); box-shadow: 0 4px 12px var(--shadow); }
.floor-story strong { color: var(--accent-soft); font-size: 14px; }
.floor-story p { margin: 4px 0 0; line-height: 1.45; font-size: 15px; }
.shed-clock { position: absolute; right: 14px; top: 14px; color: var(--soft); font-size: 28px; }
.shed-clock.running { color: var(--gold); animation: clock-turn 8s linear infinite; }
@keyframes clock-turn { to { transform: rotate(360deg); } }
.acting .machine-label { color: var(--gold); border-color: var(--gold); }
.chosen .machine-hit, .acting .machine-hit { box-shadow: 0 0 14px var(--gold); border-radius: 20%; }
.machine-label { font-size: 13px; }
</style>
