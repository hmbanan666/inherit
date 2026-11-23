<script setup lang="ts">
const props = defineProps<{ dock?: number }>()
const cap = 70
const width = ref(Math.min(cap, Math.max(30, props.dock ?? 45)))
function resize(event: PointerEvent) {
  const el = event.currentTarget as HTMLElement
  el.setPointerCapture(event.pointerId)
  const move = (e:PointerEvent) => width.value = Math.min(cap,Math.max(30,100 - e.clientX / innerWidth * 100))
  el.addEventListener('pointermove',move)
  el.addEventListener('lostpointercapture',() => el.removeEventListener('pointermove',move),{once:true})
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
      <div class="resizer" role="separator" tabindex="0" aria-label="Resize editor" @pointerdown="resize" @keydown.left.prevent="width=Math.min(70,width+2)" @keydown.right.prevent="width=Math.max(30,width-2)" />
      <section class="editor-dock">
        <slot name="editor" />
      </section>
    </main>
    <footer class="statusbar"><slot name="status" /></footer>
  </div>
</template>
