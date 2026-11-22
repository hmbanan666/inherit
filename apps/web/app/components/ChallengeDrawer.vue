<script setup lang="ts">
import type { PackFrame } from '../lib/packProtocol'

const props = defineProps<{ frame: PackFrame; busy: boolean }>()
const emit = defineEmits<{ close: []; select: [id: string] }>()
const tab = ref('Learn')
const tabs = ['Learn', 'Hints', 'API', 'Console']
const rung = ref(1)
watch(() => props.frame.save.lessonId, () => { tab.value = 'Learn'; rung.value = 1 })
</script>
<template>
  <aside class="drawer" data-testid="drawer" aria-label="Challenge help" @keydown.esc="$emit('close')">
    <nav aria-label="Help tabs"><button v-for="name in tabs" :key="name" :data-testid="'drawer-' + name.toLowerCase()" :aria-pressed="name === tab" @click="tab = name">{{ name }}</button></nav>
    <div v-if="tab === 'Learn'">
      <label>Challenge
        <select :value="frame.save.lessonId" :disabled="busy" @change="emit('select', ($event.target as HTMLSelectElement).value)">
          <option v-for="activity in frame.activities" :key="activity.id" :value="activity.id">
            {{ frame.save.completed.includes(activity.id) ? '✓ ' : '' }}{{ activity.title }}
          </option>
        </select>
      </label>
      <template v-if="frame.theory"><h3>{{ frame.theory.title }}</h3>
        <ol v-if="frame.mode === 'deploy'" class="frames" aria-label="The floor clock">
          <li><b>Run</b>Read your file once.</li><li><b>Deploy</b>Call your exported onTick each tick.</li><li><b>Stop loop</b>Keep the last completed tick.</li>
        </ol>
        <p v-for="line in frame.theory.body" :key="line">{{ line }}</p><pre>{{ frame.theory.example }}</pre>
      </template>
      <template v-if="frame.task"><h3>Condition</h3><p>{{ frame.task.condition }}</p>
        <ul><li v-for="example in frame.task.examples" :key="example">{{ example }}</li></ul>
      </template>
      <p v-if="frame.mode === 'deploy'">Pause holds the current reach. Choose 1×, 2× or 4× to change speed. Run once tries one tick on a copy.</p>
    </div>
    <div v-if="tab === 'Hints'"><p v-for="hint in frame.hints.slice(0, rung)" :key="hint">{{ hint }}</p>
      <button v-if="rung < frame.hints.length" @click="rung++">Next hint</button>
    </div>
    <div v-if="tab === 'API'">
      <p>Import module functions by name from "inherit". The editor also knows the types below.</p>
      <article v-for="entry in frame.reference" :key="entry.name">
        <h3>{{ entry.name }}</h3><code>{{ entry.signature }}</code><p>{{ entry.description }}</p>
        <p v-for="param in entry.params" :key="param">{{ param }}</p><p>{{ entry.returns }}</p><pre>{{ entry.example }}</pre>
      </article>
      <details><summary>Types</summary><pre v-for="type in frame.types" :key="type">{{ type }}</pre></details>
    </div>
    <div v-if="tab === 'Console'"><pre>{{ frame.logs.join('\n') || 'No output yet.' }}</pre></div>
    <button @click="emit('close')">{{ tab === 'Learn' ? 'Got it' : 'Close' }}</button>
  </aside>
</template>
<style scoped>
.drawer { position: absolute; inset: 0 0 0 auto; width: min(360px, 40%); z-index: 5; overflow: auto; padding: 16px; background: var(--overlay); border-left: 1px solid var(--line-strong); box-shadow: -4px 0 15px var(--shadow-light); }
nav { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 14px; }
nav button { font-size: 12px; padding: 5px 8px; }
[aria-pressed=true] { color: var(--gold); }
label, select { display: block; width: 100%; }
select { margin: 5px 0 16px; padding: 5px; }
h3 { font-size: 16px; margin: 14px 0 6px; }
p, li, label, summary { font-size: 14px; line-height: 1.5; }
p { margin: 5px 0; }
ul { padding-left: 18px; }
pre { background: var(--base); padding: 8px; white-space: pre-wrap; overflow-wrap: anywhere; }
pre, code { font: 12px/1.45 var(--mono); color: var(--accent-soft); }
.frames { display: flex; padding: 0; list-style: none; gap: 3px; }
.frames li { flex: 1; font-size: 12px; padding: 4px; background: var(--surface-raised); }
.frames b { display: block; color: var(--gold); }
@media (max-width: 760px) { .drawer { inset: auto 0 0; width: 100%; max-height: 95%; } }
</style>
