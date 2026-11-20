<script setup lang="ts">
import { Application, Graphics } from 'pixi.js'
import { X, ScanLine } from '@lucide/vue'
import { BELT_LENGTH, TICK_MS, type World } from '@inherit/sim'
import { fit, FloorScene, point } from '../lib/floor'

const props = defineProps<{
  world: World
  selected: string
  focusedIds: string[]
  commands: Record<string, string>
  placing: boolean
  running: boolean
  speed: number
  shipped: boolean
}>()
const emit = defineEmits<{ select: [string]; place: [number, number]; connect: [string, string] }>()
const host = ref<HTMLElement>()
const mount = ref<HTMLElement>()
const size = shallowRef({ width: 1, height: 1 })
const drag = ref('')
const ready = ref(false)
const renderError = ref('')
let app: Application | undefined, scene: FloorScene | undefined, wire: Graphics | undefined
let observer: ResizeObserver | undefined,
  disposed = false
let previous: World | undefined,
  arrived = 0,
  interval = TICK_MS,
  animationTime = 0,
  shippedAt = 0
let painted = ''
let pressedOutput = false
const layoutKey = computed(() =>
  JSON.stringify([
    props.world.machines.map((m) => [m.id, m.kind, m.x, m.y]),
    props.world.belts.map((b) => [b.from, b.to]),
  ]),
)
const camera = computed(() =>
  fit(
    props.world.machines,
    props.placing ? (props.world.level.buildTiles ?? []) : [],
    size.value.width,
    size.value.height,
  ),
)
function syncScene() {
  if (!app) return
  const c = camera.value
  const key = layoutKey.value + '/' + c.row
  if (painted !== key) {
    scene?.destroy()
    scene = new FloorScene(props.world, c.row)
    app.stage.addChildAt(scene.root, 0)
    painted = key
  }
  scene!.root.position.set(c.x, c.y)
  scene!.root.scale.set(c.scale)
  wire!.position.copyFrom(scene!.root.position)
  wire!.scale.set(c.scale)
  scene!.update(props.world, previous, props.selected)
}
watch(
  () => props.world,
  (world, last) => {
    previous = world.tick === last.tick + 1 ? last : undefined
    arrived = performance.now()
    interval = TICK_MS / props.speed
    syncScene()
  },
)
watch([() => props.placing, () => props.selected], syncScene)
watch(
  () => props.shipped,
  (value) => {
    shippedAt = value ? performance.now() : 0
  },
)
function local(x: number, y: number) {
  const bounds = host.value!.getBoundingClientRect(),
    c = camera.value
  return { x: (x - bounds.left - c.x) / c.scale, y: (y - bounds.top - c.y) / c.scale }
}
function dropAt(x: number, y: number) {
  const p = local(x, y)
  emit('place', Math.round(p.x / 80), Math.round(p.y / camera.value.row))
}
function floorClick(e: MouseEvent) {
  if (pressedOutput) return
  if (props.placing) return dropAt(e.clientX, e.clientY)
  const belt = scene?.beltAt(local(e.clientX, e.clientY))
  emit('select', belt ? belt.from + ' → ' + belt.to : '')
}
function startWire(id: string, e: PointerEvent) {
  e.preventDefault()
  pressedOutput = true
  drag.value = id
  moveWire(e)
}
function moveWire(e: PointerEvent) {
  if (!drag.value || !wire) return
  const pointer = local(e.clientX, e.clientY)
  const m = props.world.machines.find((m) => m.id === drag.value)
  if (!m) return cancelWire()
  const p = point(m, camera.value.row)
  wire
    .clear()
    .moveTo(p.x + 37, p.y)
    .lineTo(pointer.x, p.y)
    .lineTo(pointer.x, pointer.y)
    .stroke({ color: 0xf3c35e, width: 2.5 })
}
function cancelWire() {
  drag.value = ''
  wire?.clear()
}
function endWire(e: PointerEvent) {
  if (!drag.value) return
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-input]')
  if (target?.dataset.input) emit('connect', drag.value, target.dataset.input)
  cancelWire()
}
onMounted(async () => {
  window.addEventListener('pointermove', moveWire)
  window.addEventListener('pointerup', endWire)
  window.addEventListener('pointercancel', cancelWire)
  const renderer = new Application()
  try {
    await renderer.init({
      width: 1,
      height: 1,
      preference: 'canvas',
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio,
      autoDensity: true,
    })
    if (disposed) {
      renderer.destroy(true, { children: true })
      return
    }
    app = renderer
    mount.value!.appendChild(app.canvas)
    wire = app.stage.addChild(new Graphics())
    function resize() {
      const width = host.value!.clientWidth,
        height = host.value!.clientHeight
      size.value = { width, height }
      renderer.renderer.resize(width, height, window.devicePixelRatio)
      syncScene()
    }
    resize()
    observer = new ResizeObserver(resize)
    observer.observe(host.value!)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    app.ticker.maxFPS = 60
    app.ticker.add((ticker) => {
      const now = performance.now()
      const delta = props.running ? ticker.deltaMS * props.speed : 0
      animationTime += delta
      const mix = Math.min(1, (now - arrived) / interval)
      const departure = shippedAt ? Math.min(1, (now - shippedAt) / 1250) : 0
      scene?.frame(
        reduced.matches ? 1 : mix,
        reduced.matches ? 0 : animationTime,
        reduced.matches ? 0 : delta,
        reduced.matches && shippedAt ? 1 : departure,
      )
    })
    ready.value = true
  } catch {
    renderError.value = 'Factory renderer could not start. Reload to retry.'
  }
})
onBeforeUnmount(() => {
  disposed = true
  window.removeEventListener('pointermove', moveWire)
  window.removeEventListener('pointerup', endWire)
  window.removeEventListener('pointercancel', cancelWire)
  observer?.disconnect()
  scene?.destroy()
  app?.destroy(true, { children: true })
})
const belt = computed(() => props.world.belts.find((b) => b.from + ' → ' + b.to === props.selected))
const station = computed(() => props.world.machines.find((m) => m.id === props.selected))
// Dock the inspector in the corner furthest from the equipment and its ports.
const inspectorCorner = computed(() => {
  const { width, height } = size.value
  const c = camera.value
  const w = Math.min(280, width - 28),
    h = 80
  const corners = [
    { left: 14, top: 14 },
    { left: width - w - 14, top: 14 },
    { left: 14, top: height - h - 14 },
    { left: width - w - 14, top: height - h - 14 },
  ]
  function clearance(corner: (typeof corners)[number]) {
    return Math.min(
      ...props.world.machines.map((m) => {
        const x = c.x + m.x * 80 * c.scale,
          y = c.y + (m.y * c.row + 13) * c.scale
        const dx = Math.max(0, corner.left - x, x - corner.left - w)
        const dy = Math.max(0, corner.top - y, y - corner.top - h)
        return Math.hypot(dx, dy)
      }),
    )
  }
  return corners.reduce((best, next) => (clearance(next) > clearance(best) ? next : best))
})
const inventory = computed(() => {
  const m = station.value
  if (!m) return ''
  const stock = [...new Set(m.queue)].map((kind) => m.queue.filter((it) => it === kind).length + ' ' + kind)
  if (m.output) stock.push(m.output + ' ready')
  return stock.join(' · ') || 'Empty'
})
</script>
<template>
  <div
    ref="host"
    class="floor"
    :class="{ placing, frozen: !running }"
    :style="{ '--label-scale': Math.max(1, 0.83 / camera.scale) }"
    @pointerdown="pressedOutput = false"
    @click="floorClick"
    @dragover.prevent
    @drop.prevent="dropAt($event.clientX, $event.clientY)"
  >
    <div ref="mount" class="pixi-mount" />
    <div class="floor-label">SHOP PLAN</div>
    <div class="compass" aria-hidden="true">N ↑</div>
    <div class="floor-cross tl">+</div>
    <div class="floor-cross br">+</div>
    <div
      class="floor-stage"
      :style="{ transform: 'translate(' + camera.x + 'px,' + camera.y + 'px) scale(' + camera.scale + ')' }"
    >
      <template v-if="placing">
        <button
          v-for="[x, y] in world.level.buildTiles"
          :key="x + ',' + y"
          class="place-cell"
          :disabled="world.machines.some((m) => m.x === x && m.y === y)"
          :aria-label="'Place at ' + (x + 1) + ', ' + (y + 1)"
          :style="{ left: x * 80 + 'px', top: y * camera.row + 'px' }"
          @click.stop="emit('place', x, y)"
        >
          +
        </button>
      </template>
      <template v-for="m in world.machines" :key="m.id">
        <div class="station" :style="{ left: m.x * 80 + 'px', top: m.y * camera.row + 'px' }">
          <button
            class="machine-hit"
            :class="[m.status, { selected: selected === m.id, linked: focusedIds.includes(m.id) }]"
            :aria-label="'Inspect ' + m.id"
            :aria-pressed="selected === m.id"
            @click.stop="emit('select', m.id)"
          >
            <span class="machine-label">{{ m.id }}</span>
            <span class="machine-state" :class="m.status"
              ><i />{{
                m.status === 'ready' && (m.kind === 'furnace' || m.kind === 'assembler')
                  ? 'awaiting work'
                  : m.status
              }}</span
            >
          </button>
          <button
            v-if="m.kind !== 'mine' && m.kind !== 'coal'"
            class="port input"
            :class="{ target: drag }"
            :data-input="m.id"
            :aria-label="m.id + ' input'"
            @click.stop="emit('select', m.id)"
          />
          <button
            v-if="m.kind !== 'dispatch'"
            class="port output"
            :data-output="m.id"
            :aria-label="m.id + ' output'"
            @pointerdown.stop="startWire(m.id, $event)"
            @click.stop
          />
        </div>
      </template>
    </div>
    <span v-if="!ready" class="floor-error" role="status">{{
      renderError || 'Lighting the factory floor…'
    }}</span>
    <span v-if="placing || drag" class="floor-guide">{{
      placing ? 'Choose a marked tile' : 'Release on an input port'
    }}</span>
    <section
      v-else-if="station"
      class="inspector"
      :style="{ left: inspectorCorner.left + 'px', top: inspectorCorner.top + 'px' }"
      role="region"
      aria-label="Machine inspector"
      @click.stop
    >
      <div>
        <ScanLine :size="14" /><strong>{{ station.id }}</strong
        ><span :class="station.status">{{ station.status }}</span>
        <button aria-label="Close inspector" @click="emit('select', '')"><X :size="14" /></button>
      </div>
      <dl>
        <dt>Inventory</dt>
        <dd>{{ inventory }}</dd>
        <dt>Tick {{ world.tick }}</dt>
        <dd>{{ commands[station.id] || 'No command' }}</dd>
      </dl>
    </section>
    <span v-else-if="belt" class="floor-guide"
      >{{ belt.from }} → {{ belt.to }} · {{ belt.items.length }}/{{ BELT_LENGTH }} slots</span
    >
  </div>
</template>
