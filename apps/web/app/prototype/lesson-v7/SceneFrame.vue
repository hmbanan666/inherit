<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, type Component } from 'vue'
import type { Call } from '@inherit/sim/pack'
import type { Village } from '../../../../../packages/sim/src/packs/beginner/world'
import { lessonV7 } from './content'

// The pack's scene components are loaded the way app.vue loads WorldView.vue. A direct
// import would put them in the web type program, where they do not pass vue-tsc.
const art = import.meta.glob<Component>([
  '../../../../../packages/sim/src/packs/beginner/scenes/{VillagePanorama,SceneStage}.vue',
  '../../../../../packages/sim/src/visuals/Villager.vue',
], { eager: true, import: 'default' })
const part = (name: string) => Object.entries(art).find(([path]) => path.endsWith('/' + name + '.vue'))![1]
const VillagePanorama = part('VillagePanorama'), SceneStage = part('SceneStage'), Villager = part('Villager')

/**
 * The shipped scene art behind a camera. The camera keeps the lesson's actor large,
 * and each scene shows an empty slot where the result of Run will land.
 */
const props = defineProps<{
  world: Village
  calls: Call[]
  /** The last run stopped on an error. */
  confused?: boolean
  /** A drawer covers the right edge of the scene. */
  covered?: boolean
}>()
const host = ref<HTMLElement>()
const size = reactive({ w: 0, h: 0 })
const narrow = ref(false)
const inset = computed(() => props.covered && !narrow.value ? Math.min(340, size.w * .46) : 0)
let observer: ResizeObserver | undefined
onMounted(() => {
  const query = window.matchMedia('(max-width: 800px)')
  narrow.value = query.matches
  query.addEventListener('change', event => narrow.value = event.matches)
  observer = new ResizeObserver(([entry]) => {
    size.w = entry.contentRect.width
    size.h = entry.contentRect.height
  })
  observer.observe(host.value!)
})
onBeforeUnmount(() => { observer?.disconnect(); clearTimeout(settle) })
// Glide only when a drawer moves the free area. Resizing follows the pointer.
const gliding = ref(false)
let settle: ReturnType<typeof setTimeout> | undefined
watch(inset, () => {
  gliding.value = true
  clearTimeout(settle)
  settle = setTimeout(() => gliding.value = false, 500)
})

const village = computed(() => props.world.scene === 'village')
const view = computed(() => village.value ? { w: 760, h: 555 } : { w: 560, h: 300 })
const camera = computed(() => {
  const box = lessonV7(props.world.lessonId)?.camera ?? { x0: 0, y0: 0, x1: view.value.w, y1: view.value.h }
  const { w, h } = view.value
  const free = Math.max(120, size.w - inset.value)
  const cover = Math.max(size.w / w, size.h / h)
  const scale = Math.max(cover, Math.min(free / (box.x1 - box.x0), size.h / (box.y1 - box.y0)))
  const clamp = (value: number, low: number) => Math.min(0, Math.max(low, value))
  return {
    scale,
    x: clamp(free / 2 - (box.x0 + box.x1) / 2 * scale, size.w - w * scale),
    y: clamp(size.h / 2 - (box.y0 + box.y1) / 2 * scale, size.h - h * scale),
  }
})
const camStyle = computed(() => ({
  width: view.value.w + 'px',
  height: view.value.h + 'px',
  transform: `translate(${camera.value.x}px, ${camera.value.y}px) scale(${camera.value.scale})`,
}))
/** Place screen-space overlays on a point of the scene. */
function at(x: number, y: number) {
  return { left: camera.value.x + x * camera.value.scale + 'px', top: camera.value.y + y * camera.value.scale + 'px' }
}
function box(x: number, y: number, w: number, h: number) {
  return { ...at(x, y), width: w * camera.value.scale + 'px', height: h * camera.value.scale + 'px' }
}
const said = computed(() => props.world.bubble)
const board = computed(() => [0, 1].map(i => props.world.announcements[i] ?? ''))
</script>

<template>
  <div ref="host" class="scene" :data-scene="world.scene" :class="{ ready: size.w > 0, gliding }">
    <div :key="world.lessonId" class="cut">
      <div class="cam" :style="camStyle">
        <VillagePanorama v-if="village" :world="world" :calls="calls" />
        <SceneStage v-else :world="world" />
        <svg v-if="world.lessonId === 'hello'" class="extras" viewBox="0 0 760 555" aria-hidden="true">
          <g transform="translate(468 411) scale(-1 1)">
            <Villager :key="said" coat="#aa7458" scarf="#8fb3a4" hair="#4a4140" :waving="!!said" />
          </g>
        </svg>
      </div>

      <template v-if="world.lessonId === 'hello'">
        <p v-if="!said" class="bubble small" :style="at(468, 350)" data-testid="visitor-bubble">Hello?</p>
        <p class="bubble" :class="{ empty: !said, confused: confused && !said }" :style="at(407, 331)"
          data-testid="speech" :aria-label="said ? 'Mila says: ' + said : 'Mila has nothing to say yet'">
          <template v-if="said">{{ said }}</template>
          <template v-else-if="confused">?</template>
          <span v-else class="dots" aria-hidden="true"><i /><i /><i /></span>
        </p>
      </template>

      <template v-else-if="world.lessonId === 'sign-spaces'">
        <div v-if="!world.sign" class="slot" :class="{ confused }" :style="box(45, 107, 126, 35)" aria-hidden="true">
          <span v-if="confused">?</span>
        </div>
        <span class="sr-only" data-testid="signs">{{ world.sign || 'Blank sign' }}</span>
        <div class="ticket" :style="at(176, 64)" aria-label="Boat ticket: Moon Ferry">
          <small>Boat ticket</small>
          <strong>Moon Ferry</strong>
        </div>
      </template>

      <template v-else-if="world.lessonId === 'call-order'">
        <ol class="board" :style="at(246, 86)" data-testid="speech" aria-label="Departure board">
          <li class="head" aria-hidden="true">Departures</li>
          <li v-for="(text, i) in board" :key="i" :class="{ empty: !text, confused: confused && !text }">
            <b>{{ i + 1 }}</b><span :key="text">{{ text || (confused ? '?' : '· · ·') }}</span>
          </li>
        </ol>
      </template>
    </div>
  </div>
</template>

<style scoped>
.scene { position: absolute; inset: 0; overflow: hidden; background: #6a7856; visibility: hidden }
.scene.ready { visibility: visible }
.cut { position: absolute; inset: 0; animation: cut .45s ease-out }
.cam { position: absolute; top: 0; left: 0; display: flex; transform-origin: 0 0 }
.gliding .cam { transition: transform .45s cubic-bezier(.3, .7, .2, 1) }
.cam :deep([data-testid='mila-bubble']) { display: none }
.extras { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none }

.bubble, .slot, .ticket, .board { position: absolute; margin: 0 }
.gliding :is(.bubble, .slot, .ticket, .board) { transition: left .45s cubic-bezier(.3, .7, .2, 1), top .45s cubic-bezier(.3, .7, .2, 1), width .45s, height .45s }
.bubble { transform: translate(-50%, -100%); max-width: min(270px, 62%); padding: 10px 16px; border-radius: 14px; background: #f6e8ca; color: #463e31; font-size: 19px; font-weight: 700; line-height: 1.25; text-align: center; overflow-wrap: anywhere; box-shadow: 0 3px 0 #493c3033; animation: pop .32s cubic-bezier(.3, 1.5, .5, 1) }
.bubble::after { content: ''; position: absolute; left: 50%; top: 100%; width: 14px; height: 14px; background: inherit; transform: translate(-50%, -8px) rotate(45deg); border-radius: 0 0 3px }
.bubble.small { padding: 5px 11px; font-size: 14px; font-weight: 500; animation: none }
.bubble.empty { background: #4b4a4266; color: #fff5dc; border: 2px dashed #fff5dc; box-shadow: none; animation: none }
.bubble.empty::after { display: none }
.bubble.confused { border-color: #f1b9a4; color: #f8d2c3; background: #6b3c3080; font-size: 22px; padding: 4px 18px; animation: nudge .35s ease-out }
.dots { display: flex; gap: 6px; padding: 7px 4px }
.dots i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: wait 1.4s ease-in-out infinite }
.dots i:nth-child(2) { animation-delay: .2s }
.dots i:nth-child(3) { animation-delay: .4s }

.slot { display: grid; place-items: center; border: 2px dashed #f6e8cacc; border-radius: 6px; color: #f8d2c3; font-size: 22px; font-weight: 700; animation: breathe 1.8s ease-in-out infinite }
.slot.confused { border-color: #f1b9a4; background: #6b3c3066; animation: nudge .35s ease-out }
.ticket { transform: translate(-50%, -50%) rotate(-3deg); display: grid; gap: 2px; padding: 9px 18px 11px; border-radius: 4px; background: #f6e8c9; color: #403c31; box-shadow: 1px 3px 0 #493c3040; text-align: center; border-left: 2px dashed #b9a47d; border-right: 2px dashed #b9a47d }
.ticket small { font: 10px var(--mono); letter-spacing: .12em; text-transform: uppercase; color: #7a6a4d }
.ticket strong { font: 600 24px Georgia, serif; white-space: nowrap }

.board { transform: translate(-50%, -50%); display: grid; gap: 5px; min-width: 250px; max-width: 80%; margin: 0; padding: 10px; list-style: none; border-radius: 6px; background: #2b3936; box-shadow: 0 4px 0 #1f2a2880, inset 0 0 0 2px #46595a }
.board li { display: flex; align-items: center; gap: 10px; min-height: 32px; padding: 4px 10px; border-radius: 3px; background: #1d2725; color: #f3d487; font: 500 15px var(--mono); overflow-wrap: anywhere }
.board b { color: #8fa39b; font-weight: 500 }
.board li.head { min-height: 0; padding: 0 2px 2px; background: none; color: #8fa39b; font-size: 10px; letter-spacing: .14em; text-transform: uppercase }
.board li.empty { color: #62766f; box-shadow: inset 0 0 0 1px #46595a }
.board li.confused { color: #f1b9a4 }
.board li:not(.empty, .head) span { animation: flip .35s ease-out }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%) }
@keyframes cut { from { opacity: 0 } }
@keyframes pop { from { transform: translate(-50%, -100%) scale(.6); opacity: 0 } }
@keyframes wait { 0%, 60%, 100% { opacity: .35 } 30% { opacity: 1 } }
@keyframes breathe { 50% { border-color: #f6e8ca66 } }
@keyframes nudge { 30% { translate: -4px 0 } 60% { translate: 4px 0 } }
@keyframes flip { from { transform: rotateX(90deg); opacity: 0 } }
@media (prefers-reduced-motion: reduce) {
  .cut, .bubble, .dots i, .slot, .board li span { animation: none }
  .gliding .cam, .gliding :is(.bubble, .slot, .ticket, .board) { transition: none }
}
</style>
