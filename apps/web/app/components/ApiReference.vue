<script setup lang="ts">
import type { ApiMethod } from '@inherit/sim/declarations'
defineProps<{ entries: ApiMethod[]; types?: string[] }>()
</script>

<template>
  <section class="reference" aria-label="API reference">
    <article v-for="entry in entries" :key="entry.name">
      <h3><code>{{ entry.signature }}</code></h3>
      <p>{{ entry.description }}</p>
      <dl v-if="entry.params.length"><template v-for="param in entry.params" :key="param.name">
        <dt><code>{{ param.name }}</code></dt><dd>{{ param.description }}</dd>
      </template></dl>
      <p v-if="entry.returns"><b>Returns</b> {{ entry.returns }}</p>
      <pre v-if="entry.example" class="example">{{ entry.example }}</pre>
    </article>
    <pre v-for="type in types" :key="type">{{ type }}</pre>
  </section>
</template>
<style scoped>
article + article { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--line) }
h3 { font-size: 14px; color: var(--accent-soft); overflow-wrap: anywhere }
p, dl { margin: 6px 0; line-height: 1.5; font-size: 13px }
dt { color: var(--soft) }
dd { margin-left: 10px }
</style>
