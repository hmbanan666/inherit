<script setup lang="ts">
import type { Component } from 'vue'
import { ArrowRight } from '@lucide/vue'
import { manifests } from '@inherit/sim/registry'
import { packKey } from '@inherit/sim/save'
const query = new URLSearchParams(location.search)
const local = import.meta.dev || ['localhost','127.0.0.1','[::1]'].includes(location.hostname)
const id = query.get('pack') ?? (local && query.has('step') ? 'workshop' : '')
const manifest = manifests.find(p => p.id === id)
const views = import.meta.glob<{default: Component}>('../../../packages/sim/src/packs/*/WorldView.vue')
const studios = import.meta.glob<{default: Component}>('../../../packages/sim/src/packs/*/Studio.vue')
const covers = import.meta.glob<string>('../../../packages/sim/src/packs/*/cover.*',{eager:true,query:'?url',import:'default'})
const folder = '../../../packages/sim/src/packs/'
const custom = studios[folder+id+'/Studio.vue']
const render = views[folder+id+'/WorldView.vue']
const studio = custom && defineAsyncComponent(custom)
const world = render && defineAsyncComponent(render)
const progress = (id: string) => {
  try {
    const data = JSON.parse(localStorage.getItem(packKey(id)) ?? 'null')
    return data ? data.lessonId === null ? 'Completed' : 'Resume pack' : ''
  } catch {return ''}
}
useHead({title: (manifest?.title ?? 'Game packs') + ' · Inherit'})
</script>
<template>
  <component :is="studio" v-if="studio"/>
  <PackStudio v-else-if="manifest && world" :manifest="manifest" :view="world"/>
  <main v-else class="showcase"><header class="hud"><a class="brand pack-brand" href="/"><img src="/mark.svg" alt=""/>Inherit<span>.</span></a></header>
    <article><header><h1>Game packs</h1><p>Learn TypeScript by making a world your own.</p></header>
    <div class="pack-cards"><a v-for="p in manifests" :key="p.id" :href="'?pack='+p.id" class="pack-cover" :data-testid="'pack-'+p.id">
      <img :src="covers[folder+p.id+'/'+p.cover]" alt=""/><div class="pack-copy"><small>{{ p.level }} · {{ p.genre }} · {{ p.estimatedMinutes.min }}–{{ p.estimatedMinutes.max }} min</small>
        <h2>{{ p.title }}</h2><p>{{ p.tagline }}</p><p class="learn">You will learn · {{ p.learningGoals.join(', ') }}</p>
        <b>{{ progress(p.id) || p.showcaseNote || 'Play pack' }} <ArrowRight/></b></div>
    </a></div></article>
  </main>
</template>
