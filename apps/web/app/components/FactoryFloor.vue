<script setup lang="ts">
import { Application } from 'pixi.js'
import { Minus, Plus, Maximize } from '@lucide/vue'
import { FloorScene, tile, type FloorWorld } from '../lib/floor'
import { containPlace } from '../lib/factoryLayout'
import { floorCursor, floorPoint, panToPoint, pickFloor, stationsOf, type Point } from '../lib/floorPick'
import { homeView, type VillageView } from '../lib/village'

const props = defineProps<{ world: FloorWorld; village?: VillageView; focusPoint?: Point; interval: number; paused: boolean; selected?: string; frozen?: string }>()
const emit = defineEmits<{ error: [message: string]; select: [id: string] }>()
const host = ref<HTMLElement>(),
  mount = ref<HTMLElement>()
const size = ref({ w: 0, h: 0 }),
  pan = ref({ x: 0, y: 0 }),
  zoom = ref(1),
  pointing = ref(false)
const renderError = ref('')
let app: Application | undefined,
  scene: FloorScene | undefined,
  observer: ResizeObserver | undefined,
  motion: MediaQueryList | undefined,
  disposed = false

async function snapshot(id: string): Promise<string | undefined> {
  try {
    const art = scene?.artFor(id)
    if (art && app?.renderer) return await app.renderer.extract.base64({ target: art, resolution: 2 })
  } catch {
    // The card can also open from Machines before the floor is ready.
  }
}
defineExpose({ snapshot })

const pointers = new Map<number, { x: number; y: number }>()
let hoverPoint: Point | undefined
let armed = false
let origin = { x: 0, y: 0 }
const bounds = computed(() => homeView(props.world.grid))
const place = computed(() => containPlace(size.value.w, size.value.h, bounds.value.width, bounds.value.height, zoom.value))
const scale = computed(() => place.value.scale)
const fitX = computed(() => place.value.x - bounds.value.left * scale.value)
const camera = computed(() => ({
  x: fitX.value + pan.value.x,
  y: place.value.y + pan.value.y,
}))
const measured = computed(() => size.value.w > 0 && size.value.h > 0)
const stations = computed(() => stationsOf(props.world))
watch([() => props.focusPoint, measured], ([point, ready]) => {
  if (point && ready) pan.value = panToPoint(point, size.value, { x: fitX.value, y: place.value.y, scale: scale.value })
})
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
    syncMotion()
    syncVisibility()
    scene.setFrozen(props.frozen)
    app.stage.addChild(scene.root)
  }
  scene.root.scale.set(scale.value)
  scene.root.position.set(camera.value.x, camera.value.y)
  if (props.village) scene.setVillage(props.village)
  scene.update(props.world)
  scene.select(props.selected ?? '')
}
watch([() => props.world, () => props.village, camera, scale, () => props.selected], sync)
watch(() => props.frozen, id => scene?.setFrozen(id))
function syncMotion() {
  scene?.setReducedMotion(motion?.matches ?? false)
}
function syncVisibility() {
  scene?.setVisible(document.visibilityState === 'visible')
}
function pick(clientX: number, clientY: number) {
  const rect = host.value?.getBoundingClientRect()
  if (!rect) return
  const point = floorPoint(clientX, clientY, {
    left: rect.left,
    top: rect.top,
    cameraX: camera.value.x,
    cameraY: camera.value.y,
    scale: scale.value,
  })
  if (!point) return
  return pickFloor(point.x, point.y, tile, stations.value, scene?.cartAnchors() ?? [], scene?.npcAnchors())
}
function aim(clientX: number, clientY: number) {
  const hit = pick(clientX, clientY)
  scene?.highlight(hit ?? '')
  pointing.value = floorCursor(hit) === 'pointer'
}
function down(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button,aside') || e.button !== 0) return
  armed = pointers.size === 0
  origin = { x: e.clientX, y: e.clientY }
  host.value!.focus({ preventScroll: true })
  const hit = pick(e.clientX, e.clientY)
  if (hit?.startsWith('npc:')) scene?.setPressed(hit, e.pointerId)
  hoverPoint = undefined
  host.value!.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
}
function hover(e: PointerEvent) {
  if (pointers.size || e.pointerType === 'touch') return
  if ((e.target as Element).closest('button,aside')) return leave()
  hoverPoint = { x: e.clientX, y: e.clientY }
  aim(e.clientX, e.clientY)
}
function leave() {
  hoverPoint = undefined
  scene?.highlight('')
  pointing.value = false
}
function move(e: PointerEvent) {
  const old = pointers.get(e.pointerId)
  if (!old) return
  if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 5) armed = false
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
  if (!pointers.delete(e.pointerId)) return
  scene?.setPressed(undefined, e.pointerId)
  const clicked = armed && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) <= 5
  armed = false
  // Capture delivers pointerup to the floor even if the pointer was dragged outside.
  const over = document.elementFromPoint(e.clientX, e.clientY)
  if (!pointers.size && e.pointerType !== 'touch' && over && host.value?.contains(over) && !over.closest('button,aside')) {
    hoverPoint = { x: e.clientX, y: e.clientY }
    aim(e.clientX, e.clientY)
  } else leave()
  if (clicked) emit('select', pick(e.clientX, e.clientY) ?? '')
}
function cancel(e: PointerEvent) {
  if (!pointers.delete(e.pointerId)) return
  scene?.setPressed(undefined, e.pointerId)
  armed = false
  leave()
}
onMounted(async () => {
  const renderer = new Application()
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  motion.addEventListener('change', syncMotion)
  document.addEventListener('visibilitychange', syncVisibility)
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
    renderer.ticker.add(() => {
      scene?.animate(performance.now(), props.interval, props.paused)
      if (hoverPoint) aim(hoverPoint.x, hoverPoint.y)
    })
  } catch {
    renderError.value = 'Could not open the floor renderer. Reload to retry.'
    emit('error', renderError.value)
  }
})
onBeforeUnmount(() => {
  disposed = true
  for (const id of pointers.keys()) {
    scene?.setPressed(undefined, id)
    if (host.value?.hasPointerCapture(id)) host.value.releasePointerCapture(id)
  }
  pointers.clear()
  leave()
  motion?.removeEventListener('change', syncMotion)
  document.removeEventListener('visibilitychange', syncVisibility)
  window.removeEventListener('pointermove', move)
  window.removeEventListener('pointerup', up)
  window.removeEventListener('pointercancel', cancel)
  observer?.disconnect()
  app?.destroy(true, { children: true, texture: true, textureSource: true })
})
</script>
<template>
  <div
    ref="host"
    class="floor"
    :class="{ pointing }"
    tabindex="0"
    aria-label="Factory map"
    @wheel.prevent="wheel"
    @pointerdown="down"
    @pointermove="hover"
    @pointerleave="leave"
    @lostpointercapture="cancel"
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
  cursor: inherit;
}
.pointing { cursor: pointer }
</style>
