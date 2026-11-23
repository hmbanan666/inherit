<script setup lang="ts">
import type { Colour } from '@inherit/sim/pack'
const props = defineProps<{
  checks: { id: string; text: string; status: Colour; input?: string; reason?: string }[]
  tried: boolean
  messages?: readonly string[]
}>()
</script>
<template>
  <div class="checks" data-testid="checks" aria-label="Done when">
    <p v-for="message in messages" :key="message">{{ message }}</p>
    <ul>
      <li v-for="check in props.checks" :key="check.id" :data-state="!tried ? 'idle' : check.status === 'green' ? 'done' : 'open'">
        <span role="img" :aria-label="tried && check.status === 'green' ? 'Done' : 'Still to do'">{{ tried && check.status === 'green' ? '✓' : '○' }}</span>
        {{ check.text }}<small v-if="tried && check.status !== 'green'"> {{ check.input }} {{ check.reason }}</small>
      </li>
    </ul>
  </div>
</template>
<style scoped>
.checks { padding: 6px 12px; font-size: 13px; color: var(--sub) }
ul { list-style: none; margin: 0; padding: 0 }
li { padding: 3px 0 }
[data-state=done] { color: var(--mint) }
small { display: block; padding-left: 1em; color: var(--soft) }
</style>
