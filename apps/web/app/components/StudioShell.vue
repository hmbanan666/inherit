<script setup lang="ts">
import { clampDockPercent } from '../lib/factoryLayout'

const props = withDefaults(defineProps<{
  dock?: number
  min?: number
  max?: number
  storageKey?: string
  prefer?: (viewport: number) => number
}>(), {
  min: 30,
  max: 70,
})

const width = ref(clampDockPercent(props.dock ?? 45, props.min, props.max))
const custom = ref(false)

function clamp(value: number) {
  return clampDockPercent(value, props.min, props.max)
}
function persist() {
  if (!props.storageKey) return
  try { localStorage.setItem(props.storageKey, String(Math.round(width.value * 10) / 10)) }
  catch { /* This browser can keep the width for the session. */ }
}
function applySaved() {
  let next = props.prefer ? props.prefer(window.innerWidth) : (props.dock ?? 45)
  if (props.storageKey) {
    try {
      const raw = localStorage.getItem(props.storageKey)
      if (raw !== null && Number.isFinite(Number(raw))) {
        next = Number(raw)
        custom.value = true
      }
    } catch { /* Use the fitted width. */ }
  }
  width.value = clamp(next)
}
function onWindowResize() {
  if (custom.value || !props.prefer) return
  width.value = clamp(props.prefer(window.innerWidth))
}
onMounted(() => {
  if (!props.storageKey && !props.prefer) return
  applySaved()
  if (props.prefer) window.addEventListener('resize', onWindowResize)
})
onBeforeUnmount(() => window.removeEventListener('resize', onWindowResize))

function setWidth(value: number) {
  custom.value = true
  width.value = clamp(value)
  persist()
}
function resize(event: PointerEvent) {
  const el = event.currentTarget as HTMLElement
  el.setPointerCapture(event.pointerId)
  const move = (e: PointerEvent) => setWidth(100 - e.clientX / innerWidth * 100)
  el.addEventListener('pointermove', move)
  el.addEventListener('lostpointercapture', () => el.removeEventListener('pointermove', move), { once: true })
}
</script>
<template>
  <div class="workshop pack-studio" :style="{'--dock-width': width+'%'}">
    <header class="hud">
      <slot name="nav" />
    </header>
    <main class="desk">
      <section class="world-shell pack-world" data-testid="world">
        <slot name="floor" />
      </section>
      <div class="resizer" role="separator" tabindex="0" aria-label="Resize editor" aria-orientation="vertical" @pointerdown="resize" @keydown.left.prevent="setWidth(width + 2)" @keydown.right.prevent="setWidth(width - 2)" />
      <section class="editor-dock">
        <slot name="editor" />
      </section>
    </main>
    <footer class="statusbar"><slot name="status" /></footer>
    <slot />
  </div>
</template>
