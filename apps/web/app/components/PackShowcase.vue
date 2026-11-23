<script setup lang="ts">
import type { Component } from 'vue'
import { ArrowRight } from '@lucide/vue'
import { manifests } from '@inherit/sim/registry'
import { courseMap, type MapLesson } from '@inherit/sim/course'
import { packKey } from '@inherit/sim/save'
const query = new URLSearchParams(location.search)
const local = import.meta.dev || ['localhost','127.0.0.1','[::1]'].includes(location.hostname)
const speedQuery = local && query.has('speed') ? '&speed='+encodeURIComponent(query.get('speed')!) : ''
const id = query.get('pack') ?? ''
const manifest = manifests.find(p => p.id === id)
const views = import.meta.glob<{default: Component}>('../../../../packages/sim/src/packs/*/WorldView.vue')
const covers = import.meta.glob<string>('../../../../packages/sim/src/packs/*/cover.*',{eager:true,query:'?url',import:'default'})
const folder = '../../../../packages/sim/src/packs/'
const render = views[folder+id+'/WorldView.vue']
const world = render && defineAsyncComponent(render)
const maps = shallowRef<Record<string, MapLesson[]>>({})
const selections: Record<string, string | null> = {}
if (!id) onMounted(async () => {
  const { getPack } = await import('@inherit/sim/rules')
  const result: Record<string, MapLesson[]> = {}
  for (const manifest of manifests) {
    let completed: string[] = []
    try {
      const data = JSON.parse(localStorage.getItem(packKey(manifest.id)) ?? 'null')
      if (data?.formatVersion === 2 && Array.isArray(data.completed)) {
        const progress = data.frontier ? JSON.parse(data.frontier) : data
        completed = progress.completed
        selections[manifest.id] = progress.lessonId
      }
    } catch { /* Recovery is offered when the player opens this pack. */ }
    result[manifest.id] = courseMap(manifest, getPack(manifest.id).lessons, completed)
  }
  maps.value = result
})
useHead({title: (manifest?.title ?? 'Game packs') + ' · Inherit'})
</script>
<template>
  <PackStudio v-if="manifest && world" :manifest="manifest" :view="world"/>
  <main v-else-if="id || query.has('lesson')" class="showcase"><article><h1>Unknown pack</h1><a href="/?packs">Choose a game pack</a></article></main>
  <main v-else class="showcase"><header class="hud"><a class="brand pack-brand" href="/?packs"><img src="/mark.svg" alt=""/>Inherit<span>.</span></a></header>
    <article><header><h1>Game packs</h1><p>Learn TypeScript by making a world your own.</p></header>
    <div class="pack-cards"><a v-for="p in manifests" :key="p.id" :href="'?pack='+p.id+speedQuery" class="pack-cover" :data-testid="'pack-'+p.id">
      <img :src="covers[folder+p.id+'/'+p.cover]" alt=""/><div class="pack-copy"><small>{{ p.level }} · {{ p.genre }} · {{ p.estimatedMinutes.min }}–{{ p.estimatedMinutes.max }} min</small>
        <h2>{{ p.title }}</h2><p>{{ p.tagline }}</p><p class="learn">You will learn · {{ p.learningGoals.join(', ') }}</p>
        <ProgressStrip :manifest="p" :lessons="maps[p.id] ?? []" :selected="selections[p.id]" />
        <b>{{ selections[p.id] === null ? 'Completed' : selections[p.id] ? 'Resume pack' : p.showcaseNote || 'Play pack' }} <ArrowRight/></b></div>
    </a></div></article>
  </main>
</template>
