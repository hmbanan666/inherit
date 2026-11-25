<script setup lang="ts">
import { Settings2 } from '@lucide/vue'
const settings = ref(false)
function closeSettings() { settings.value = false }
</script>
<template>
  <a class="pack-brand brand" href="/" aria-label="Inherit"><img src="/mark.svg" alt="" /></a>
  <slot />
  <slot name="clock" />
  <div v-if="$slots.settings" class="settings pack-settings" @keydown.esc="closeSettings">
    <button aria-label="Settings" :aria-expanded="settings" @click="settings = !settings"><Settings2 /></button>
    <aside v-if="settings" class="hud-menu"><slot name="settings" :close="closeSettings" /></aside>
  </div>
  <slot name="account" />
</template>
