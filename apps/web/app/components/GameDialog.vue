<script setup lang="ts">
import type { cardSide } from '../lib/cardPlace'
import { dialogClose } from '../lib/dialogMotion'
import { overlayLabels } from '../lib/gameOverlay'
import { X } from '@lucide/vue'

defineProps<{ title: string; wide?: boolean; side?: ReturnType<typeof cardSide> }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const { closing, requestClose, vDialogMotion } = dialogClose(() => emit('close'))

defineExpose({ requestClose })

onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <dialog ref="dialog" v-dialog-motion class="shade dialog-motion" :class="{ closing, 'wide-shade': wide }" :aria-label="title" @cancel.prevent="requestClose" @click.self="requestClose">
    <section class="panel" :class="[side, { wide }]" tabindex="-1" autofocus>
      <header>
        <h2>{{ title }}</h2>
        <button type="button" :aria-label="overlayLabels.close(title)" @click="requestClose"><X :size="16" /></button>
      </header>
      <div class="body"><slot /></div>
    </section>
  </dialog>
</template>

<style>
.dialog-motion[open] > section { animation: dialog-panel-in 220ms ease-out }
.dialog-motion[open]::backdrop { animation: dialog-backdrop-in 220ms ease-out }
.dialog-motion[open].closing > section { animation: dialog-panel-out 160ms ease-in forwards }
.dialog-motion[open].closing::backdrop { animation: dialog-backdrop-out 160ms ease-in forwards }
@keyframes dialog-panel-in {
  from { opacity: 0; transform: var(--dialog-offset, translateY(-24px)) }
  to { opacity: 1; transform: none }
}
@keyframes dialog-panel-out {
  from { opacity: 1; transform: none }
  to { opacity: 0; transform: var(--dialog-offset, translateY(-24px)) }
}
@keyframes dialog-backdrop-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes dialog-backdrop-out { from { opacity: 1 } to { opacity: 0 } }
@media (prefers-reduced-motion: reduce) {
  .dialog-motion { --dialog-offset: none }
  /* Keep the fade timings through the global reduced-motion reset. */
  .dialog-motion[open] > section, .dialog-motion[open]::backdrop { animation-duration: 220ms !important }
  .dialog-motion[open].closing > section, .dialog-motion[open].closing::backdrop { animation-duration: 160ms !important }
}
.dialog-motion > section:focus { outline: none }
</style>

<style scoped>
.shade {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  border: 0;
  place-items: center;
  padding: 0;
  background: transparent;
}
.shade[open] { display: grid }
.shade::backdrop { background: rgba(8, 8, 9, 0.62) }
.panel {
  width: min(520px, 100% - 32px);
  max-height: min(80dvh, 720px);
  display: flex;
  flex-direction: column;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 16px 48px var(--shadow-light);
  overflow: hidden;
}
.panel:focus { outline: none }
.wide-shade::backdrop { background: rgba(8, 8, 9, 0.35); backdrop-filter: none }
.panel.wide {
  position: relative;
  overflow: visible;
  --sheet-padding: 24px;
  width: fit-content;
  min-width: min(600px, 100% - 32px);
  max-width: min(820px, 100% - 32px);
  max-height: min(86dvh, 720px);
}
.wide .body { padding: var(--sheet-padding); overflow: visible }
@media (min-width: 1100px) {
  .wide.right { justify-self: end; margin-right: 24px }
  .wide.left { justify-self: start; margin-left: 24px }
}
.wide header { display: contents }
.wide header button { position: absolute; top: 12px; right: 12px; z-index: 1 }
.wide h2 {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 8px 0 16px;
  border-bottom: 1px solid var(--line);
}
h2 { margin: 0; font-size: 15px; letter-spacing: -0.3px }
header button {
  margin-left: auto;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 0;
  outline: none;
  border-radius: 6px;
  background: transparent;
  color: var(--soft);
}
header button:hover { background: var(--hover) }
header button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px }
.body { min-height: 0; overflow: auto; padding: 12px }
</style>
