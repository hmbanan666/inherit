<script setup lang="ts">
import { Application } from 'pixi.js'
import { Minus, Plus, Maximize } from '@lucide/vue'
import { FloorScene, tile, type FloorWorld } from '../lib/floor'
import { containPlace } from '../lib/factoryLayout'
import { buildingLabelHit } from '../lib/floorPick'
import { inspectAt } from '@inherit/sim/v8'

const props = defineProps<{ world: FloorWorld; interval: number; paused: boolean; selected?: string }>()
const emit = defineEmits<{ error: [message: string]; select: [id: string] }>()
const host = ref<HTMLElement>(),
  mount = ref<HTMLElement>()
const size = ref({ w: 0, h: 0 }),
  pan = ref({ x: 0, y: 0 }),
  zoom = ref(1)
const renderError = ref('')
let app: Application | undefined,
  scene: FloorScene | undefined,
  observer: ResizeObserver | undefined,
  disposed = false

const pointers = new Map<number, { x: number; y: number }>()
let armed = false
let origin = { x: 0, y: 0 }
const worldSize = computed(() => ({
  w: tile * props.world.grid.width,
  h: tile * props.world.grid.height,
}))
const place = computed(() => containPlace(size.value.w, size.value.h, worldSize.value.w, worldSize.value.h, zoom.value))
const scale = computed(() => place.value.scale)
const camera = computed(() => ({
  x: place.value.x + pan.value.x,
  y: place.value.y + pan.value.y,
}))
function recenter() {
  pan.value = { x: 0, y: 0 }
  zoom.value = 1
}
function zoomBy(ratio: number, px = size.value.w / 2, py = size.value.h / 2) {
  if (size.value.w < 2 || size.value.h < 2) return
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
function sync() {
  if (!app) return
  if (!scene) {
    scene = new FloorScene(props.world)
    app.stage.addChild(scene.root)
  }
  scene.root.scale.set(scale.value)
  scene.root.position.set(camera.value.x, camera.value.y)
  scene.update(props.world)
  scene.select(props.selected ?? '')
}
watch([() => props.world, camera, scale, () => props.selected], sync)
function pick(clientX: number, clientY: number) {
  const rect = host.value?.getBoundingClientRect()
  if (!rect || scale.value === 0) return
  const px = (clientX - rect.left - camera.value.x) / scale.value
  const py = (clientY - rect.top - camera.value.y) / scale.value
  const label = buildingLabelHit(px, py, tile, [
    { id: 'depot', title: 'Depot', pos: props.world.depot.pos },
    { id: 'furnace', title: 'Furnace', pos: props.world.furnace.pos },
    ...props.world.press ? [{ id: 'press', title: 'Press', pos: props.world.press.pos }] : [],
    ...props.world.spare ? [{ id: 'spare', title: 'Spare press', pos: props.world.spare.pos }] : [],
    ...props.world.lathe ? [{ id: 'lathe', title: 'Lathe', pos: props.world.lathe.pos }] : [],
    ...props.world.bench ? [{ id: 'bench', title: 'Assembly table', pos: props.world.bench.pos }] : [],
  ])
  if (label) return label
  const drone = scene?.pickDrone(px, py)
  if (drone) return drone
  const x = Math.floor(px / tile)
  const y = Math.floor(py / tile)
  return inspectAt(props.world, x, y)?.id
}
function down(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button,aside') || e.button !== 0) return
  armed = true
  origin = { x: e.clientX, y: e.clientY }
  host.value!.focus({ preventScroll: true })
  host.value!.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
}
function hover(e: PointerEvent) {
  if (pointers.size) return
  scene?.highlight(pick(e.clientX, e.clientY) ?? '')
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
  if (!armed) return
  armed = false
  if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 5) return
  const hit = pick(e.clientX, e.clientY)
  if (hit) emit('select', hit)
}
function cancel() {
  pointers.clear()
  armed = false
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
      const frame = host.value?.closest<HTMLElement>('.map-frame') ?? host.value
      if (!frame) return
      const w = Math.round(frame.clientWidth)
      const h = Math.round(frame.clientHeight)
      if (w < 2 || h < 2) return
      if (w !== size.value.w || h !== size.value.h) {
        pan.value = { x: 0, y: 0 }
        zoom.value = 1
      }
      size.value = { w, h }
      renderer.renderer.resize(w, h, devicePixelRatio)
      sync()
    }
    resize()
    observer = new ResizeObserver(resize)
    observer.observe(host.value!.closest('.map-frame') ?? host.value!)
    renderer.ticker.maxFPS = 40
    renderer.ticker.add(() => scene?.animate(performance.now(), props.interval, props.paused))
  } catch {
    renderError.value = 'Could not open the floor renderer. Reload to retry.'
    emit('error', renderError.value)
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
    @pointerdown="down"
    @pointermove="hover"
  >
    <div ref="mount" class="pixi-mount"></div>
    <div class="map-controls">
      <button aria-label="Zoom out" @click="zoomBy(0.8)"><Minus /></button
      ><button aria-label="Center map" @click="recenter()"><Maximize /></button
      ><button aria-label="Zoom in" @click="zoomBy(1.25)"><Plus /></button>
    </div>
  </div>
</template>
<style scoped>
.inspect {
  position: absolute;
  z-index: 4;
  width: 156px;
  display: grid;
  gap: 2px;
  padding: 6px 8px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
  font: 11px var(--mono);
  color: var(--text);
}
.inspect b { font-size: 12px }
.inspect p { margin: 0; color: var(--soft) }
.inspect .close {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 22px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: 0;
  color: var(--sub);
}
.inspect .dump {
  margin-top: 4px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  font: 11px var(--mono);
  padding: 2px 8px;
  border-radius: 4px;
}
.pixi-mount {
  position: absolute;
  inset: 0;
}
.pixi-mount :deep(canvas) {
  position: absolute;
  left: 0;
  top: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
