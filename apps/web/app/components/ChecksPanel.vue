<script setup lang="ts">
import type { Colour } from '@inherit/sim/pack'
defineProps<{
  checks: { id: string; text: string; status: Colour; input?: string; reason?: string; mark?: 'pending' | 'passing' | 'failed' }[]
  label?: string
  tried: boolean
  messages?: readonly string[]
  empty?: string
  log?: { text: string; file?: string; line?: number }[]
}>()
const emit = defineEmits<{ open: [entry: { file: string; line: number }] }>()
function markLabel(mark: 'pending' | 'passing' | 'failed' | undefined, status: Colour, tried: boolean) {
  if (mark === 'passing' || (!mark && tried && status === 'green')) return 'Passing'
  if (mark === 'failed') return 'Failed'
  if (mark === 'pending') return 'Pending'
  return tried ? 'Still to do' : 'Still to do'
}
function glyph(mark: 'pending' | 'passing' | 'failed' | undefined, status: Colour, tried: boolean) {
  if (mark === 'passing' || (!mark && tried && status === 'green')) return '✓'
  if (mark === 'failed') return '!'
  return '○'
}
</script>
<template>
  <div class="checks" data-testid="checks" :aria-label="label ?? 'Done when'">
    <ul v-if="log?.length" class="log">
      <li v-for="(entry, index) in log" :key="index">
        <button v-if="entry.file && entry.line" type="button" @click="emit('open', { file: entry.file, line: entry.line })">{{ entry.text }}</button>
        <span v-else>{{ entry.text }}</span>
      </li>
    </ul>
    <p v-for="message in messages" :key="message">{{ message }}</p>
    <p v-if="empty && !checks.length" class="empty">{{ empty }}</p>
    <ul v-else>
      <li v-for="check in checks" :key="check.id" :data-colour="label ? check.status : undefined" :data-mark="check.mark" :data-state="!tried ? 'idle' : check.status === 'green' ? 'done' : 'open'">
        <span role="img" :aria-label="markLabel(check.mark, check.status, tried)">{{ glyph(check.mark, check.status, tried) }}</span>
        {{ check.text }}<small v-if="tried && check.status !== 'green' && (check.input || check.reason)"> {{ check.input }} {{ check.reason }}</small>
      </li>
    </ul>
  </div>
</template>
<style scoped>
.checks { padding: 8px 10px; font-size: 13px; line-height: 1.35; color: var(--sub) }
.empty { color: var(--soft) }
ul { list-style: none; margin: 0; padding: 0 }
li { padding: 2px 0 }
.log {
  margin: 0 0 6px;
  padding: 0 0 6px;
  border-bottom: 1px solid var(--line);
  display: grid;
  gap: 2px;
  max-height: 72px;
  overflow: auto;
}
.log button, .log span {
  font: 11px var(--mono);
  color: var(--alert);
  text-align: left;
  background: transparent;
  border: 0;
  padding: 0;
}
.log button { cursor: pointer; text-decoration: underline }
[data-colour=red] { color: var(--alert) }
[data-colour=amber] { color: var(--gold) }
[data-state=done] { color: var(--mint) }
[data-mark=passing] { color: var(--mint) }
[data-mark=pending] { color: var(--text) }
[data-mark=pending] > span { color: var(--sub) }
[data-mark=failed] { color: var(--alert) }
small { display: block; padding-left: 1em; color: var(--soft) }
</style>
