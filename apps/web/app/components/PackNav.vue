<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { manifests } from '@inherit/sim/registry'
import type { PackManifest } from '@inherit/sim/pack'
import type { MapLesson } from '@inherit/sim/course'
defineProps<{manifest: PackManifest; lessons: MapLesson[]; selected?: string | null}>()
const open = ref(false)
</script>
<template>
  <a class="pack-brand brand" href="/" aria-label="Inherit showcase"><img src="/mark.svg" alt="" />Inherit<span>.</span></a>
  <div class="pack-switch" @keydown.esc="open = false">
    <button data-testid="pack-switcher" :aria-expanded="open" @click="open = !open">{{ manifest.title }} <ChevronDown /></button>
    <nav v-if="open" class="hud-menu" aria-label="Switch pack"><a v-for="p in manifests" :key="p.id" :href="'?pack=' + p.id">{{ p.title }}</a><a href="/">All game packs</a></nav>
  </div>
  <ProgressStrip :manifest="manifest" :lessons="lessons" :selected="selected" />
</template>
