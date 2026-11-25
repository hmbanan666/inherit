<script setup lang="ts">
import { overlayLabels } from '../lib/gameOverlay'
import { X } from '@lucide/vue'

defineProps<{ title: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()

onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <dialog ref="dialog" class="shade" :aria-label="title" @cancel.prevent="emit('close')" @click.self="emit('close')">
    <section class="panel" :class="{ wide }">
      <header>
        <h2>{{ title }}</h2>
        <button type="button" :aria-label="overlayLabels.close(title)" autofocus @click="emit('close')"><X :size="16" /></button>
      </header>
      <div class="body"><slot /></div>
    </section>
  </dialog>
</template>

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
.panel.wide { width: min(880px, 100% - 32px) }
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
  border-radius: 6px;
  background: transparent;
  color: var(--soft);
}
.body { min-height: 0; overflow: auto; padding: 12px }
</style>
