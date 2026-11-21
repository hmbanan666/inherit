<script setup lang="ts">
import { Application, Graphics } from 'pixi.js'
import { Minus, Plus, Maximize, LockKeyhole, Coins, X, Move, Trash2, MapPin, Navigation } from '@lucide/vue'
import {
  autoPath,
  purchaseMachine,
  purchaseBelt,
  MACHINES,
  PRICES,
  TICK_MS,
  type MachineKind,
  type Plot,
  type Tile,
} from '@inherit/sim'
import { useGame } from '../lib/useGame'
import { center, FloorScene, tile, siteX } from '../lib/floor'
import type { BuildTool, BuildGuide } from '../lib/buildGuide'
import { machineArt } from '../lib/machineArt'

const props = defineProps<{ placing?: MachineKind; tool?: BuildTool; guide?: BuildGuide; focusId?: string }>()
const emit = defineEmits<{ placed: [] }>()
const g = useGame(),
  { campaign, selected, paused, speed } = g
const world = computed(() => campaign.value.world)
const host = ref<HTMLElement>(),
  mount = ref<HTMLElement>()
const size = ref({ w: 800, h: 500 }),
  pan = ref({ x: 0, y: 0 }),
  zoom = ref(1)
const site = ref('shed'),
  source = ref(''),
  cursor = shallowRef<Tile>(),
  plotOffer = shallowRef<Plot>()
const renderError = ref('')
let app: Application | undefined,
  scene: FloorScene | undefined,
  observer: ResizeObserver | undefined,
  disposed = false
let ghost: Graphics | undefined,
  ghostKind = '',
  paintKey = ''
const pointers = new Map<number, { x: number; y: number }>()
let moved = false,
  draggingWire = false
const sites = computed(() => world.value.sites.filter((s) => s.id === 'shed' || campaign.value.economy.road))
const scale = computed(
  () => Math.max(0.38, Math.min(1.6, size.value.w / (tile * 9.5), size.value.h / (tile * 5.9))) * zoom.value,
)
const camera = computed(() => ({
  x: size.value.w / 2 - (siteX(site.value) + 4) * tile * scale.value + pan.value.x,
  y: size.value.h / 2 - 2.45 * tile * scale.value + pan.value.y,
}))
function goSite(id: string) {
  site.value = id
  pan.value = { x: 0, y: 0 }
  zoom.value = 1
}
function local(clientX: number, clientY: number) {
  const r = host.value!.getBoundingClientRect()
  return {
    x: (clientX - r.left - camera.value.x) / scale.value,
    y: (clientY - r.top - camera.value.y) / scale.value,
  }
}
function here(p: Tile) {
  return campaign.value.economy.road && p.x >= 18 ? 'yard' : 'shed'
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
function readCursor(e: PointerEvent) {
  const r = host.value!.getBoundingClientRect()
  if (e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom) {
    cursor.value = undefined
    return
  }
  const p = local(e.clientX, e.clientY),
    x = Math.floor(p.x / tile),
    y = Math.floor(p.y / tile)
  if (cursor.value?.x !== x || cursor.value.y !== y) cursor.value = { x, y }
}
const at = computed(() => {
  if (!cursor.value) return
  const id = here(cursor.value)
  return { site: id, x: cursor.value.x - siteX(id), y: cursor.value.y }
})
const target = computed(() =>
  world.value.machines.find((m) => m.siteId === at.value?.site && m.x === at.value?.x && m.y === at.value?.y),
)
const route = computed(() => {
  const from = world.value.machines.find((m) => m.id === source.value),
    p = at.value
  if (!from || !p || from.siteId !== p.site) return
  return autoPath(world.value.sites.find((s) => s.id === from.siteId)!, from, p)
})
// Sim purchase functions write to the ledger and equipment lists. Copy those for a dry run.
function constructionPreview() {
  const c = campaign.value
  return {
    ...c,
    economy: { ...c.economy },
    world: { ...c.world, machines: [...c.world.machines], belts: [...c.world.belts] },
  }
}
const valid = computed(() => {
  const p = at.value
  if (!p) return false
  if (props.placing) return !!purchaseMachine(constructionPreview(), props.placing, p.site, p.x, p.y)
  return !!(
    source.value &&
    target.value &&
    purchaseBelt(constructionPreview(), source.value, target.value.id)
  )
})
const receivers = computed(
  () =>
    new Set(
      source.value
        ? world.value.machines
            .filter((m) => purchaseBelt(constructionPreview(), source.value, m.id))
            .map((m) => m.id)
        : [],
    ),
)
interface BuildCell extends Tile {
  site: string
  valid: boolean
}
const cells = shallowRef<BuildCell[]>([])
function planGrid() {
  const result: BuildCell[] = []
  if (props.placing)
    for (const s of sites.value)
      for (const p of s.plots)
        for (let x = p.x; x < p.x + p.width; x++)
          for (let y = p.y; y < p.y + p.height; y++) {
            const valid =
              p.status === 'owned' && !!purchaseMachine(constructionPreview(), props.placing, s.id, x, y)
            result.push({ site: s.id, x, y, valid })
          }
  cells.value = result
}
const suggested = computed(() => {
  const a = props.guide
  if (a?.[0] !== 'machine' || props.placing !== a[1]) return
  const deposits = world.value.sites.find((s) => s.id === a[2])?.deposits
  const seam = (x: number, y: number) => deposits?.find((d) => d.x === x && d.y === y)?.kind
  return cells.value
    .filter((c) => c.valid && c.site === a[2] && (a[1] !== 'miner' || seam(c.x, c.y) === seam(a[3], a[4])))
    .sort(
      (l, r) => Math.abs(l.x - a[3]) + Math.abs(l.y - a[4]) - Math.abs(r.x - a[3]) - Math.abs(r.y - a[4]),
    )[0]
})
function keyboardPlace(c: BuildCell) {
  cursor.value = { x: c.x + siteX(c.site), y: c.y }
  place()
}
function reveal(x: number, y: number) {
  const px = x * scale.value + camera.value.x,
    py = y * scale.value + camera.value.y
  if (px < 48 || px > size.value.w - 48 || py < 48 || py > size.value.h - 48)
    pan.value = { x: pan.value.x + size.value.w / 2 - px, y: pan.value.y + size.value.h / 2 - py }
}
function revealGuide(switchSites = true) {
  function focus(id: string, x: number, y: number) {
    if (site.value !== id) {
      if (!switchSites) return
      goSite(id)
    }
    reveal(x, y)
  }
  const a = props.guide
  if (a?.[0] === 'plot') {
    const p = plots.value.find((p) => p.id === a[2] && p.site === a[1])
    if (p) focus(p.site, (siteX(p.site) + p.x + 1.05) * tile, (p.y + 0.68) * tile)
  } else if (a?.[0] === 'machine' && suggested.value) {
    const p = center(suggested.value.site, suggested.value)
    focus(suggested.value.site, p.x, p.y)
  } else if (a?.[0] === 'belt' || a?.[0] === 'unbelt') {
    const m = world.value.machines.find((m) => m.id === a[source.value ? 2 : 1])
    if (m) {
      const p = center(m.siteId, m)
      focus(m.siteId, p.x, p.y)
    }
  }
}
defineExpose({ revealGuide })
const guidedId = computed(() =>
  props.guide?.[0] === 'belt' && props.tool === 'belt'
    ? props.guide[source.value ? 2 : 1]
    : !props.guide
      ? props.focusId
      : undefined,
)
function preview() {
  if (!scene || !cursor.value || !props.placing) {
    if (ghost) ghost.visible = false
    return
  }
  if (ghostKind !== props.placing || !ghost) {
    ghost?.destroy()
    ghost = scene.root.addChild(machineArt(props.placing))
    ghostKind = props.placing
  }
  ghost.visible = true
  ghost.position.set((cursor.value.x + 0.5) * tile, (cursor.value.y + 0.5) * tile)
  ghost.tint = valid.value ? 0xa4edab : 0xef806d
  ghost.alpha = 0.64
}
const structure = computed(() =>
  JSON.stringify([
    sites.value.map((s) => s.plots.map((p) => p.status)),
    world.value.machines.map((m) => [m.id, m.x, m.y, m.kind, m.siteId]),
    world.value.belts.map((b) => [b.from, b.to, b.path]),
  ]),
)
watch(
  [
    () => props.placing,
    structure,
    () => props.placing && campaign.value.economy.money >= PRICES.machines[props.placing],
    () => campaign.value.economy.research.join('/'),
  ],
  planGrid,
  { immediate: true },
)
watch([() => JSON.stringify(props.guide), () => props.tool], async () => {
  source.value = ''
  await nextTick()
  if (props.guide?.[0] === 'plot' || props.tool) revealGuide(false)
})
watch(source, () => {
  if (props.tool === 'belt') revealGuide(false)
})
function sync() {
  if (!app) return
  if (!scene || paintKey !== structure.value) {
    scene?.destroy()
    scene = new FloorScene(world.value, campaign.value.economy.road)
    app.stage.addChild(scene.root)
    ghost = undefined
    paintKey = structure.value
  }
  scene.root.scale.set(scale.value)
  scene.root.position.set(camera.value.x, camera.value.y)
  scene.update(world.value)
  preview()
}
watch([world, camera, scale], sync)
watch([() => props.placing, cursor, valid], preview)
function down(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button,aside') || source.value || props.placing || e.button !== 0)
    return
  host.value!.focus({ preventScroll: true })
  host.value!.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  moved = false
}
function move(e: PointerEvent) {
  if (props.placing || source.value) readCursor(e)
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
    moved = true
  } else {
    const dx = e.clientX - old.x,
      dy = e.clientY - old.y
    if (dx || dy) {
      pan.value = { x: pan.value.x + dx, y: pan.value.y + dy }
      moved = true
    }
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
}
function place() {
  const p = at.value
  if (p && props.placing && valid.value) {
    g.act({ kind: 'machine', machine: props.placing, ...p })
    emit('placed')
  }
}
function up(e: PointerEvent) {
  const wasPanning = pointers.delete(e.pointerId)
  if (props.placing || source.value) {
    const hit = document.elementFromPoint(e.clientX, e.clientY)
    if (!hit || !host.value?.contains(hit) || hit.closest('.map-controls,.inspect,.deed,.floor-help')) return
    readCursor(e)
    if (props.placing) place()
    else if (draggingWire && target.value && source.value !== target.value.id) {
      g.act({ kind: 'belt', from: source.value, to: target.value.id })
      source.value = ''
      emit('placed')
    }
    draggingWire = false
    return
  }
  if (wasPanning && !moved) {
    const p = local(e.clientX, e.clientY)
    const b = world.value.belts.find((b) =>
      b.path.slice(1).some((end, i) => {
        const a = center(b.siteId, b.path[i]!),
          z = center(b.siteId, end)
        const dx = z.x - a.x,
          dy = z.y - a.y,
          f = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
        return Math.hypot(p.x - a.x - f * dx, p.y - a.y - f * dy) < 13
      }),
    )
    selected.value = b ? b.from + ' → ' + b.to : ''
    plotOffer.value = undefined
  }
}
function cancel() {
  pointers.clear()
  source.value = ''
  emit('placed')
  cursor.value = undefined
}
function key(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    cancel()
    selected.value = ''
    plotOffer.value = undefined
    return
  }
  if (e.key === 'Delete' && (machine.value || belt.value)) {
    sell()
    return
  }
  const d: Record<string, number[]> = { w: [0, 42], a: [42, 0], s: [0, -42], d: [-42, 0] }
  const delta = d[e.key.toLowerCase()]
  if (delta && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    pan.value = { x: pan.value.x + delta[0]!, y: pan.value.y + delta[1]! }
  }
}
function beginWire(id: string, e: PointerEvent) {
  if (props.placing || props.tool === 'remove') return
  draggingWire = true
  host.value?.focus({ preventScroll: true })
  source.value = id
  selected.value = ''
  readCursor(e)
}
function choose(id: string) {
  if (source.value && source.value !== id) {
    g.act({ kind: 'belt', from: source.value, to: id })
    source.value = ''
    emit('placed')
  } else if (props.tool === 'belt') {
    const m = world.value.machines.find((m) => m.id === id)
    if (m && m.kind !== 'dock' && m.kind !== 'truck') source.value = id
  } else if (!props.placing) g.selectMachine(id)
}
const belt = computed(() => world.value.belts.find((b) => b.from + ' → ' + b.to === selected.value))
const machine = computed(() => world.value.machines.find((m) => m.id === selected.value))
const bins = computed(() =>
  Object.entries(
    machine.value?.queue.reduce<Record<string, number>>((r, i) => {
      r[i.kind] = (r[i.kind] ?? 0) + 1
      return r
    }, {}) ?? {},
  ),
)
const refund = computed(
  () =>
    belt.value?.paid ??
    (machine.value
      ? machine.value.paid +
        world.value.belts
          .filter((b) => b.from === selected.value || b.to === selected.value)
          .reduce((n, b) => n + b.paid, 0)
      : 0),
)
function sell() {
  if (belt.value) g.act({ kind: 'sellBelt', from: belt.value.from, to: belt.value.to })
  else if (machine.value) g.act({ kind: 'sellMachine', id: machine.value.id })
  selected.value = ''
  emit('placed')
}
function pos(x: number, y: number) {
  return { left: x + 'px', top: y + 'px' }
}
const plots = computed(() => sites.value.flatMap((s) => s.plots.map((p) => ({ ...p, site: s.id }))))
const offerSite = ref('shed')
function offer(p: Plot, id: string) {
  plotOffer.value = p
  offerSite.value = id
  selected.value = ''
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
    observer = new ResizeObserver(resize)
    observer.observe(host.value!)
    renderer.ticker.maxFPS = 40
    renderer.ticker.add(() => scene?.animate(performance.now(), TICK_MS / speed.value, paused.value))
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
function buyPlot() {
  if (!plotOffer.value) return
  g.act({ kind: 'plot', site: offerSite.value, id: plotOffer.value.id })
  plotOffer.value = undefined
}
</script>
<template>
  <div
    ref="host"
    class="floor"
    tabindex="0"
    aria-label="Factory map"
    @wheel.prevent="wheel"
    @keydown="key"
    @pointerdown="down"
  >
    <div ref="mount" class="pixi-mount"></div>
    <div
      class="map-overlay"
      :style="{ transform: 'translate(' + camera.x + 'px,' + camera.y + 'px) scale(' + scale + ')' }"
    >
      <button
        v-for="cell in cells"
        :key="cell.site + cell.x + ',' + cell.y"
        class="build-cell"
        :class="{ valid: cell.valid, 'target-cell': cell === suggested }"
        :disabled="!cell.valid"
        :aria-label="'Place ' + MACHINES[placing!].name + ' at ' + cell.site + ' ' + cell.x + ', ' + cell.y"
        :style="pos((siteX(cell.site) + cell.x) * tile, cell.y * tile)"
        @click="$event.detail === 0 && keyboardPlace(cell)"
      >
        <b v-if="cell === suggested">Build here ↓</b>
      </button>
      <template v-for="p in plots" :key="p.site + p.id">
        <button
          v-if="p.status === 'sale'"
          class="deed"
          :class="{ 'guide-pulse': guide?.[0] === 'plot' && guide[2] === p.id }"
          :aria-label="'Buy ' + p.id"
          :style="pos((siteX(p.site) + p.x + 1.05) * tile, (p.y + 0.68) * tile)"
          @click="offer(p, p.site)"
        >
          <Coins :size="15" />{{ p.price }} <small>{{ p.id.replaceAll('-', ' ') }}</small>
        </button>
        <span
          v-if="p.status === 'locked'"
          class="fog-label"
          :style="pos((siteX(p.site) + p.x + 1.3) * tile, (p.y + 0.7) * tile)"
          ><LockKeyhole :size="14" /> {{ p.id.replaceAll('-', ' ') }}</span
        >
      </template>
      <template v-for="s in sites" :key="s.id"
        ><small
          v-for="d in s.deposits.filter(
            (d) => !world.machines.some((m) => m.siteId === s.id && m.x === d.x && m.y === d.y),
          )"
          :key="d.x + ',' + d.y"
          class="vein"
          :style="pos(center(s.id, d).x, center(s.id, d).y + 19)"
          >{{ d.kind }} seam</small
        ></template
      >
      <svg v-if="source && route?.length" class="wire-preview">
        <defs>
          <marker
            id="wire-arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto"
          >
            <path d="M0 1 L9 5 L0 9 Z" fill="#ffe194" />
          </marker>
        </defs>
        <polyline
          class="flow-arrow"
          marker-mid="url(#wire-arrow)"
          marker-end="url(#wire-arrow)"
          :points="
            route
              .map((p) => {
                const q = center(at!.site, p)
                return q.x + ',' + q.y
              })
              .join(' ')
          "
          :stroke="valid ? '#b5e1a2' : '#e4ab58'"
          stroke-width="7"
          fill="none"
          stroke-dasharray="10 5"
        />
      </svg>
      <div
        v-for="m in world.machines"
        :key="m.id"
        class="station"
        :class="{
          chosen: selected === m.id,
          'station-guide': guidedId === m.id,
          'source-station': source === m.id,
          'can-connect': source && receivers.has(m.id),
          'cannot-connect': source && source !== m.id && !receivers.has(m.id),
        }"
        :style="pos(center(m.siteId, m).x, center(m.siteId, m).y)"
      >
        <button class="machine-hit" :aria-label="'Inspect ' + m.id" @click="choose(m.id)">
          <span class="machine-label">{{ m.id }}</span>
        </button>
        <button
          v-if="MACHINES[m.kind].bin"
          class="port input"
          :aria-label="m.id + ' input'"
          @click="source && choose(m.id)"
        >
          ‹
        </button>
        <button
          v-if="!['truck', 'dock'].includes(m.kind)"
          class="port output"
          :aria-label="m.id + ' output'"
          @pointerdown.stop.prevent="beginWire(m.id, $event)"
          @keydown.enter.prevent="source = m.id"
        >
          ›
        </button>
      </div>
      <div
        v-if="(placing || source) && cursor"
        class="tile-preview"
        :class="{ valid }"
        :style="pos(cursor.x * tile, cursor.y * tile)"
      >
        <b>{{ placing ? PRICES.machines[placing] : (route?.length ?? 0) * PRICES.beltPerTile }} coins</b>
      </div>
    </div>
    <div class="map-location">
      <MapPin :size="13" /> {{ site === 'shed' ? 'Shed floor' : 'Freight yard' }}
    </div>
    <div class="map-controls">
      <button aria-label="Zoom out" @click="zoomBy(0.8)"><Minus /></button
      ><button aria-label="Center map" @click="goSite(site)"><Maximize /></button
      ><button aria-label="Zoom in" @click="zoomBy(1.25)"><Plus /></button
      ><button v-if="campaign.economy.road" @click="goSite(site === 'shed' ? 'yard' : 'shed')">
        <Navigation /> {{ site === 'shed' ? 'Yard' : 'Shed' }}
      </button>
    </div>
    <div v-if="renderError" class="floor-help">{{ renderError }}</div>
    <div v-else-if="tool || source" class="floor-help">
      <Move :size="15" />{{
        placing
          ? 'Place ' + MACHINES[placing].name
          : source
            ? 'Click the destination for ' + source
            : tool === 'remove'
              ? 'Select equipment or a belt to sell'
              : 'Click the machine that sends items'
      }}
      <button aria-label="Cancel build" @click="cancel"><X :size="14" /></button>
    </div>
    <aside v-if="plotOffer" class="inspect" role="dialog" aria-label="Buy land">
      <header>
        <strong>{{ plotOffer.id.replaceAll('-', ' ') }}</strong
        ><button aria-label="Close offer" @click="plotOffer = undefined"><X /></button>
      </header>
      <p>{{ plotOffer.width * plotOffer.height }} tiles · {{ plotOffer.price }} coins</p>
      <button
        class="gold"
        :disabled="!campaign.economy.research.includes('survey') || campaign.economy.money < plotOffer.price"
        @click="buyPlot"
      >
        {{ campaign.economy.research.includes('survey') ? 'Buy plot' : 'Research Tape measure' }}
      </button>
    </aside>
    <aside v-else-if="machine || belt" class="inspect" role="region" aria-label="Machine inspector">
      <header>
        <strong>{{ selected }}</strong
        ><button aria-label="Close inspector" @click="selected = ''"><X /></button>
      </header>
      <template v-if="machine"
        ><p>{{ MACHINES[machine.kind].name }} · {{ machine.status }}</p>
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
      <p v-else>{{ belt!.path.length }} belt tiles · {{ belt!.items.length }} in transit</p>
      <div v-if="machine" class="links">
        <button
          v-for="b in world.belts.filter((b) => b.from === selected || b.to === selected)"
          :key="b.from + ' → ' + b.to"
          @click="selected = b.from + ' → ' + b.to"
        >
          {{ b.from }} → {{ b.to }}
        </button>
      </div>
      <button class="sell" @click="sell"><Trash2 :size="13" /> Sell · +{{ refund }} coins</button>
    </aside>
  </div>
</template>
