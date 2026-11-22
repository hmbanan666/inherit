<script setup lang="ts">
defineProps<{ goal: string }>()
defineEmits<{ help: [] }>()
</script>

<template>
  <section class="goal-bar" aria-label="Current goal" data-testid="task-card">
    <h2 :title="goal">{{ goal }}</h2>
    <button aria-label="Open lesson drawer" data-testid="hint" @click="$emit('help')">?</button>
  </section>
</template>

<style scoped>
.goal-bar { height: 48px; flex: none; display: flex; align-items: center; gap: 10px; padding: 0 14px; border-bottom: 1px solid var(--line) }
h2 { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px }
button { border-radius: 50%; width: 29px; height: 29px; color: var(--gold) }
</style>
