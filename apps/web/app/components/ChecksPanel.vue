<script setup lang="ts">
import type { Colour } from '@inherit/sim/pack'
const props = defineProps<{
  checks: { id: string; text: string; status: Colour; input?: string; progress?: string }[]
  error?: string
  messages?: readonly string[]
}>()
const expanded = ref(false)
const done = computed(() => props.checks.filter(check => check.status === 'green').length)
const visible = computed(() => expanded.value ? props.checks : props.checks.filter(check => check.status !== 'green'))
const marks = { red: '○', amber: '◐', green: '✓' }
const labels = { red: 'Still to do', amber: 'Getting closer', green: 'Done' }
</script>

<template>
  <div class="checks" data-testid="checks">
    <button v-if="done" class="done-count" :aria-expanded="expanded" @click="expanded = !expanded">
      <span aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>{{ done }} done
    </button>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-for="message in messages" :key="message">{{ message }}</p>
    <ul v-if="visible.length">
      <li v-for="check in visible" :key="check.id" :data-state="check.status"
        :aria-current="check.id === checks[0]?.id ? 'step' : undefined">
        <span class="mark" role="img" :aria-label="labels[check.status]">{{ marks[check.status] }}</span>
        <span v-if="check.input">{{ check.input }} ·</span> {{ check.text }}
        <span v-if="check.progress && !check.text.endsWith(check.progress)" class="count">{{ check.progress }}</span>
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
[data-state='red'] { color: var(--alert); }
[data-state='amber'] { color: var(--gold); }
[data-state='green'], .done-count { color: var(--mint); }
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
