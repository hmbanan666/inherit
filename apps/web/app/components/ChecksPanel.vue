<script setup lang="ts">
import { useGame } from '../lib/useGame'

const { checks, lessonCheck } = useGame()
const expanded = ref(false)
const done = computed(() => checks.value.filter(check => check.state === 'done').length)
const visible = computed(() => expanded.value ? checks.value : checks.value.filter(check => check.state !== 'done'))
const marks = { todo: '○', close: '◐', done: '✓' }
const labels = { todo: 'Still to do', close: 'Getting closer', done: 'Done' }
</script>

<template>
  <div class="checks">
    <button v-if="done" class="done-count" :aria-expanded="expanded" @click="expanded = !expanded">
      <span aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>{{ done }} done
    </button>

    <ul v-if="visible.length">
      <li v-for="check in visible" :key="check.id" :data-state="check.state"
        :aria-current="check.id === lessonCheck?.id ? 'step' : undefined">
        <span class="mark" role="img" :aria-label="labels[check.state]">{{ marks[check.state] }}</span>
        {{ check.text }}
        <span v-if="check.progress" class="count">{{ check.progress[0] }} / {{ check.progress[1] }}</span>
      </li>
    </ul>
    <p v-else-if="!checks.length">No live checks for this part of the story.</p>
  </div>
</template>

<style scoped>
.checks {
  padding: 6px 12px;
  font-size: 13px;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li, .done-count {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-height: 22px;
  line-height: 22px;
}
li[aria-current='step'] { font-weight: 600; }
.mark { width: 12px; text-align: center; flex: none; }
[data-state='todo'] { color: var(--alert); }
[data-state='close'] { color: var(--gold); }
[data-state='done'], .done-count { color: var(--mint); }
.done-count {
  padding: 0 4px;
  border: 0;
  background: transparent;
  font-size: inherit;
}
.done-count:hover { text-decoration: underline; }
.count { margin-left: auto; white-space: nowrap; font-family: var(--mono); }
p { color: var(--sub); }
</style>
