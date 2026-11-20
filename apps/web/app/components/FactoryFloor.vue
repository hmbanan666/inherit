<script setup lang="ts">
import { Application, Container, Graphics } from 'pixi.js'
import { BELT_LENGTH, COLUMNS, ROWS, TICK_MS, idlePercent, type World } from '@inherit/sim'
import { animateFloor, drawPlant, HEIGHT, nearBelt, point, WIDTH, type Point } from '../lib/floor'

const props = defineProps<{
  world: World
  selected: string
  placing: boolean
  running: boolean
  speed: number
}>()
const emit = defineEmits<{ select: [string]; place: [number, number]; connect: [string, string] }>()
const host = ref<HTMLElement>()
const stage = ref<HTMLElement>()
const mount = ref<HTMLElement>()
const scale = ref(1)
const drag = ref('')
const pointer = ref<Point>({ x: 0, y: 0 })
const renderError = ref('')
let app: Application | undefined,
  observer: ResizeObserver | undefined,
  disposed = false
let prior: World | undefined,
  arrived = 0,
  animationTime = 0
const layoutKey = computed(() =>
  JSON.stringify([
    props.world.machines.map((m) => [m.id, m.x, m.y]),
    props.world.belts.map((b) => [b.from, b.to]),
    props.selected,
  ]),
)
watch(
  () => props.world,
  (w, prev) => {
    prior = w.tick === prev.tick + 1 ? prev : undefined
    arrived = performance.now()
  },
)
function local(x: number, y: number) {
  const r = stage.value!.getBoundingClientRect()
  return { x: (x - r.left) / scale.value, y: (y - r.top) / scale.value }
}
function dropAt(x: number, y: number) {
  const p = local(x, y)
  emit('place', Math.round((p.x - 60) / 80), Math.round((p.y - 66) / 60))
}
let ignoreClick = false
function floorClick(e: MouseEvent) {
  if (ignoreClick) return
  if (props.placing) {
    dropAt(e.clientX, e.clientY)
    return
  }
  const b = nearBelt(props.world, local(e.clientX, e.clientY))
  emit('select', b ? b.from + ' → ' + b.to : '')
}
function startWire(id: string, e: PointerEvent) {
  e.preventDefault()
  drag.value = id
  pointer.value = local(e.clientX, e.clientY)
}
function moveWire(e: PointerEvent) {
  if (drag.value) pointer.value = local(e.clientX, e.clientY)
}
function endWire(e: PointerEvent) {
  if (!drag.value) return
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-input]')
  if (target?.dataset.input) {
    ignoreClick = true
    setTimeout(() => {
      ignoreClick = false
    }, 0)
    emit('connect', drag.value, target.dataset.input)
  }
  drag.value = ''
}
const cancelWire = () => {
  drag.value = ''
}
onMounted(async () => {
  window.addEventListener('pointermove', moveWire)
  window.addEventListener('pointerup', endWire)
  window.addEventListener('pointercancel', cancelWire)
  const resize = () => {
    const compact = props.world.level.layout.stations.length === 3 && !props.placing
    if (host.value)
      scale.value = Math.min(
        host.value.clientWidth / (compact ? 665 : WIDTH),
        host.value.clientHeight / (compact ? 255 : HEIGHT),
        1.55,
      )
  }
  watch(() => props.world.level.title, resize)
  observer = new ResizeObserver(resize)
  observer.observe(host.value!)
  const renderer = new Application()
  try {
    await renderer.init({
      width: WIDTH,
      height: HEIGHT,
      preference: 'canvas',
      backgroundAlpha: 0,
      antialias: true,
      resolution: 2,
      autoDensity: true,
    })
    if (disposed) {
      renderer.destroy(true, { children: true })
      return
    }
    app = renderer
    mount.value!.appendChild(app.canvas)
    const plant = app.stage.addChild(new Container()),
      moving = app.stage.addChild(new Graphics())
    let painted = ''
    app.ticker.maxFPS = 45
    app.ticker.add((t) => {
      if (painted !== layoutKey.value) {
        drawPlant(plant, props.world, props.selected)
        painted = layoutKey.value
      }
      if (props.running) animationTime += t.deltaMS * props.speed
      const m = props.world.machines.find((m) => m.id === drag.value)
      animateFloor(
        moving,
        props.world,
        prior,
        Math.min(1, (performance.now() - arrived) / (TICK_MS / props.speed)),
        animationTime,
        m ? { from: m, to: pointer.value } : undefined,
      )
    })
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
  app?.destroy(true, { children: true })
})
const belt = computed(() => props.world.belts.find((b) => b.from + ' → ' + b.to === props.selected))
const station = computed(() => props.world.machines.find((m) => m.id === props.selected))
</script>
<template>
  <div
    ref="host"
    class="floor"
    :class="{ placing }"
    @dragover.prevent
    @drop.prevent="dropAt($event.clientX, $event.clientY)"
  >
    <div class="floor-label">PLAN VIEW</div>
    <div class="compass" aria-hidden="true">N ↑</div>
    <div class="floor-cross tl">+</div>
    <div class="floor-cross br">+</div>
    <div
      ref="stage"
      class="floor-stage"
      :style="{
        width: WIDTH + 'px',
        height: HEIGHT + 'px',
        transform: 'translate(-50%, -50%) scale(' + scale + ')',
      }"
      @click="floorClick"
    >
      <div ref="mount" class="pixi-mount" />
      <template v-if="placing"
        ><template v-for="row in ROWS" :key="row"
          ><button
            v-for="col in COLUMNS"
            :key="col"
            class="place-cell"
            :disabled="world.machines.some((m) => m.x === col - 1 && m.y === row - 1)"
            :aria-label="'Place at ' + col + ', ' + row"
            :style="{ left: 60 + (col - 1) * 80 + 'px', top: 66 + (row - 1) * 60 + 'px' }"
            @click.stop="emit('place', col - 1, row - 1)"
          >
            +
          </button></template
        ></template
      >
      <button
        v-for="m in world.machines"
        :key="m.id"
        class="machine-hit"
        :class="{ selected: selected === m.id }"
        :aria-label="'Inspect ' + m.id"
        :style="{ left: point(m).x + 'px', top: point(m).y + 'px' }"
        @click.stop="emit('select', m.id)"
      >
        <span class="machine-label">{{ m.id }}</span
        ><span class="machine-state" :class="m.status"><i />{{ m.status }}</span>
      </button>
      <template v-for="m in world.machines" :key="'ports' + m.id">
        <button
          v-if="m.kind !== 'mine' && m.kind !== 'coal'"
          class="port input"
          :class="{ target: drag }"
          :data-input="m.id"
          :aria-label="m.id + ' input'"
          :style="{ left: point(m).x - 37 + 'px', top: point(m).y + 'px' }"
          @click.stop="emit('select', m.id)"
        />
        <button
          v-if="m.kind !== 'dispatch'"
          class="port output"
          :data-output="m.id"
          :aria-label="m.id + ' output'"
          :style="{ left: point(m).x + 37 + 'px', top: point(m).y + 'px' }"
          @pointerdown.stop="startWire(m.id, $event)"
          @click.stop
        />
      </template>
    </div>
    <span v-if="renderError" class="floor-error">{{ renderError }}</span>
    <span v-if="placing || drag" class="floor-guide">{{
      placing ? 'Click a free grid tile to place the coal mine' : 'Release on an input port to connect'
    }}</span>
    <span v-else-if="station || belt" class="floor-guide">{{
      station
        ? station.id +
          ' · ' +
          station.status +
          ' · ' +
          station.queue.length +
          ' queued · ' +
          idlePercent(world, station) +
          '% idle'
        : 'Belt · ' + belt!.items.length + '/' + BELT_LENGTH + ' slots'
    }}</span>
  </div>
</template>
