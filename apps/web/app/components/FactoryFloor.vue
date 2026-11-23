<script setup lang="ts">
import { Application } from 'pixi.js'
import { Minus, Plus, Maximize } from '@lucide/vue'
import { FloorScene, tile, type FloorWorld } from '../lib/floor'
import { containScale } from '../lib/factoryLayout'

const props = defineProps<{ world: FloorWorld; interval: number; paused: boolean }>()
const emit = defineEmits<{ error: [message: string] }>()
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
const worldSize = computed(() => ({
  w: tile * props.world.grid.width,
  h: tile * props.world.grid.height,
}))
const scale = computed(() => containScale(size.value.w, size.value.h, worldSize.value.w, worldSize.value.h) * zoom.value)
const camera = computed(() => ({
  x: size.value.w / 2 - props.world.grid.width / 2 * tile * scale.value + pan.value.x,
  y: size.value.h / 2 - props.world.grid.height / 2 * tile * scale.value + pan.value.y,
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
}
watch([() => props.world, camera, scale], sync)
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
  >
    <div ref="mount" class="pixi-mount"></div>
    <div class="map-controls">
      <button aria-label="Zoom out" @click="zoomBy(0.8)"><Minus /></button
      ><button aria-label="Center map" @click="recenter()"><Maximize /></button
      ><button aria-label="Zoom in" @click="zoomBy(1.25)"><Plus /></button>
    </div>
  </div>
</template>
