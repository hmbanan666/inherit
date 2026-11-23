<script setup lang="ts">
const props = defineProps<{ axis: 'x' | 'y'; label: string }>()
const emit = defineEmits<{ move: [event: PointerEvent]; reset: []; nudge: [direction: -1 | 1] }>()
const dragging = ref(false)

function start(event: PointerEvent) {
  if (event.button !== 0) return
  if (event.detail > 1) {
    emit('reset')
    return
  }
  const el = event.currentTarget as HTMLElement
  el.setPointerCapture(event.pointerId)
  dragging.value = true
  const move = (e: PointerEvent) => emit('move', e)
  el.addEventListener('pointermove', move)
  el.addEventListener('lostpointercapture', () => {
    dragging.value = false
    el.removeEventListener('pointermove', move)
  }, { once: true })
}

function key(event: KeyboardEvent) {
  const dir = props.axis === 'y'
    ? (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0)
    : (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0)
  if (!dir) return
  event.preventDefault()
  emit('nudge', dir as -1 | 1)
}
</script>

<template>
  <div
    class="pane-split"
    :class="[axis, { dragging }]"
    role="separator"
    tabindex="0"
    :aria-orientation="axis === 'y' ? 'horizontal' : 'vertical'"
    :aria-label="label"
    @pointerdown="start"
    @keydown="key"
  >
    <span class="line" />
    <span class="grip" />
  </div>
</template>

<style scoped>
.pane-split {
  position: relative;
  flex: none;
  border: 0;
  padding: 0;
  background: transparent;
  touch-action: none;
  z-index: 2;
}
.pane-split.y {
  height: 8px;
  cursor: row-resize;
}
.pane-split.x {
  width: 8px;
  height: 100%;
  justify-self: center;
  cursor: col-resize;
}
.line, .grip { position: absolute; pointer-events: none; }
.y .line { left: 0; right: 0; top: 3px; height: 2px; }
.x .line { top: 0; bottom: 0; left: 3px; width: 2px; }
.grip {
  opacity: 0;
  background: var(--accent-line);
  border-radius: 2px;
}
.y .grip { width: 28px; height: 4px; left: 50%; top: 2px; transform: translateX(-50%); }
.x .grip { width: 4px; height: 28px; top: 50%; left: 2px; transform: translateY(-50%); }
.pane-split:hover .line,
.pane-split.dragging .line,
.pane-split:focus-visible .line { background: var(--accent-line); }
.pane-split:hover .grip,
.pane-split.dragging .grip,
.pane-split:focus-visible .grip { opacity: 1; }
</style>
