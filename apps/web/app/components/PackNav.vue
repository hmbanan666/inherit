<script setup lang="ts">
import { ChevronDown, Settings2 } from '@lucide/vue'
import { manifests } from '@inherit/sim/registry'
import type { PackManifest } from '@inherit/sim/pack'
import type { MapLesson } from '@inherit/sim/course'
defineProps<{manifest?: PackManifest; lessons?: MapLesson[]; busy?: boolean; selected?: string | null}>()
defineEmits<{ select: [id: string] }>()
const open = ref(false)
const settings = ref(false)
function closeSettings() { settings.value = false }
</script>
<template>
  <a class="pack-brand brand" href="/?packs" aria-label="Inherit showcase"><img src="/mark.svg" alt="" />Inherit<span>.</span></a>
  <slot v-if="!manifest" />
  <div v-if="manifest" class="pack-switch" @keydown.esc="open = false">
    <button data-testid="pack-switcher" :aria-expanded="open" @click="open = !open">{{ manifest.title }} <ChevronDown /></button>
    <nav v-if="open" class="hud-menu" aria-label="Switch pack"><a v-for="p in manifests" :key="p.id" :href="'?pack=' + p.id">{{ p.title }}</a><a href="/?packs">All game packs</a></nav>
  </div>
  <ProgressStrip v-if="manifest" picker :busy="!!busy" @select="$emit('select', $event)" :manifest="manifest" :lessons="lessons ?? []" :selected="selected" />
  <slot name="clock" />
  <div v-if="$slots.settings" class="settings pack-settings" @keydown.esc="closeSettings">
    <button aria-label="Settings" :aria-expanded="settings" @click="settings = !settings"><Settings2 /></button>
    <aside v-if="settings" class="hud-menu"><slot name="settings" :close="closeSettings" /></aside>
  </div>
</template>
