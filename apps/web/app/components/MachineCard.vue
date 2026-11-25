<script setup lang="ts">
import { overlayLabels } from '../lib/gameOverlay'
import { X } from '@lucide/vue'
import type { inspectMachine } from '@inherit/sim/v8'

type Inspection = NonNullable<ReturnType<typeof inspectMachine>>
defineProps<{ inspected: Inspection }>()
const emit = defineEmits<{ close: []; manual: [action: Inspection['actions'][number]] }>()
const closeButton = ref<HTMLButtonElement>()
onMounted(() => closeButton.value?.focus({ preventScroll: true }))
</script>

<template>
  <article class="quest">
    <button ref="closeButton" type="button" class="hint" :aria-label="overlayLabels.close(inspected.name)" @click="emit('close')"><X :size="16" /></button>
    <h2>{{ inspected.name }}</h2>
    <p>{{ inspected.description }}</p>
    <ul class="facts">
      <li v-for="line in inspected.lines" :key="line.label" :class="{ 'task-line': line.label === 'Task' }"><b>{{ line.label }}</b> {{ line.value }}</li>
      <li v-for="recipe in inspected.recipes" :key="recipe.id">
        <b>{{ recipe.input }} → {{ recipe.output }}</b>
        <template v-if="recipe.missing"> Missing {{ recipe.missing }}.</template>
        <template v-if="recipe.locked"> {{ recipe.locked }}</template>
      </li>
    </ul>
    <div v-if="inspected.progress" class="xp">
      <span>{{ inspected.progress.label }}</span>
      <span class="bar"><i :style="{ width: inspected.progress.pct + '%' }" /></span>
    </div>
    <ul v-if="inspected.actions.length" class="shop-list">
      <li v-for="action in inspected.actions" :key="action.id">
        <button type="button" :disabled="!action.enabled" @click="emit('manual', action)">
          <b>{{ action.label }}</b>
          <span v-if="action.api">{{ action.api }}</span>
          <small v-if="action.reason">{{ action.reason }}</small>
        </button>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.quest {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 7px;
}
.quest h2 {
  padding-right: 28px;
  font-size: 15px;
  line-height: 1.2;
  letter-spacing: -0.4px;
  margin: 0;
}
.shop-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px }
.shop-list button {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  justify-content: stretch;
  justify-items: start;
  gap: 2px 8px;
  text-align: left;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 6px 8px;
}
.shop-list button span { justify-self: end; color: var(--accent-soft); font: 13px var(--mono) }
.shop-list button small { grid-column: 1 / -1; color: var(--soft); font-size: 12px; font-weight: 400 }
.shop-list button:disabled, .shop-list button.locked { opacity: 0.45 }
.facts { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; font: 12px var(--mono); color: var(--soft) }
.facts li {
  min-width: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
.facts .task-line {
  height: 1.45em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.facts b { color: var(--text); font-weight: 600 }
.quest .bar { display: block; width: 48px; height: 5px; border-radius: 3px; background: var(--accent-shadow); overflow: hidden }
.quest .bar i { display: block; height: 100%; background: var(--gold) }
.xp { display: grid; gap: 4px; min-width: 92px }
.quest .hint { position: absolute; top: 6px; right: 6px; display: grid; place-items: center }
</style>
