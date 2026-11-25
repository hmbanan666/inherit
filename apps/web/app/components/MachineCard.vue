<script setup lang="ts">
import { machineSheet, missingLabel, sheetCss, type InspectView } from '../lib/machineSheet'

const props = defineProps<{ inspected: InspectView }>()
const emit = defineEmits<{ close: []; manual: [action: InspectView['actions'][number]] }>()
const sheet = computed(() => machineSheet(props.inspected))
</script>

<template>
  <GameDialog :title="inspected.name" wide @close="emit('close')">
    <article class="quest" :style="sheetCss">
      <div class="role">
        <component :is="sheet.icon" aria-hidden="true" />
        <p>{{ sheet.description }}</p>
      </div>
      <div class="columns">
        <div v-for="column in sheet.columns" :key="column[0]!.kind" class="column">
          <section v-for="section in column" :key="section.kind" :class="section.kind">
            <h3>{{ section.title }}</h3>
            <ul class="facts">
              <li v-for="row in section.rows" :key="row.key" :class="row.kind">
                <template v-if="row.kind === 'meter' || row.kind === 'progress'">
                  <span>{{ row.label }}</span>
                  <progress :aria-label="row.label" :value="row.value" :max="row.max" />
                  <code>{{ row.text }}</code>
                </template>
                <template v-else-if="row.kind === 'fact'">
                  <span>{{ row.label }}</span><span>{{ row.value }}</span>
                </template>
                <template v-else-if="row.kind === 'recipe'">
                  <div class="recipe-line">
                    <span>{{ row.recipe.input }}</span><span>→</span><span>{{ row.recipe.output }}</span>
                    <small v-if="row.recipe.missing" class="missing">{{ missingLabel }} {{ row.recipe.missing }}</small>
                  </div>
                  <small v-if="row.recipe.locked">{{ row.recipe.locked }}</small>
                </template>
                <button v-else-if="row.kind === 'api'" type="button" :disabled="row.disabled" @click="emit('manual', row.action)">
                  <span class="action-line"><b>{{ row.action.label }}</b><code>{{ row.action.api }}</code></span>
                  <small v-if="row.action.reason">{{ row.action.reason }}</small>
                </button>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </article>
  </GameDialog>
</template>

<style scoped>
.quest { min-width: 0; container-type: inline-size }
.role { display: flex; align-items: center; gap: 8px; height: 44px; color: var(--accent-soft) }
.role p { margin: 0; color: var(--soft); font-size: 13px }
.columns, .column { display: grid; align-items: start; align-content: start; gap: var(--sheet-gap); min-width: 0 }
/* The 860px panel includes 24px of body padding and its two 1px borders. */
@container (min-width: 834px) {
  .columns { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 20px }
}
h3 { margin: 0; height: var(--sheet-heading); line-height: var(--sheet-heading); font-size: 13px }
.facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
  color: var(--text);
  font-size: 12px;
}
.facts li { grid-column: 1 / -1; min-width: 0; overflow: hidden }
.facts .meter, .facts .progress { display: grid; grid-template-columns: auto minmax(10px, 1fr) auto; align-items: center; gap: 6px }
.facts .meter { grid-column: span 1; height: var(--sheet-meter) }
.facts .progress { height: var(--sheet-progress) }
progress {
  appearance: none;
  width: 100%;
  height: 4px;
  overflow: hidden;
  border: 0;
  border-radius: 2px;
  background: var(--accent-shadow);
  color: var(--gold);
}
progress::-webkit-progress-bar { background: var(--accent-shadow) }
progress::-webkit-progress-value { background: var(--gold) }
progress::-moz-progress-bar { background: var(--gold) }
.fact, .recipe-line, .action-line { display: flex; align-items: center; gap: 6px }
.fact { height: var(--sheet-fact); justify-content: space-between }
.fact span:first-child, .meter span, .progress span { color: var(--sub) }
.recipe, .recipe-line { height: var(--sheet-recipe) }
.missing, .action-line code { margin-left: auto }
li.api { height: var(--sheet-api) }
li.api button {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: repeat(2, minmax(0, 1fr));
  align-items: center;
  justify-content: stretch;
  gap: 0;
  text-align: left;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 2px 8px;
}
li.api button:focus-visible { outline-offset: -2px }
code { font: 12px var(--mono) }
.action-line code { color: var(--accent-soft) }
small { display: block; color: var(--soft); font-size: 12px }
.locked li { height: var(--sheet-locked); color: var(--soft) }
.locked .recipe { display: grid; grid-template-rows: 1fr 1fr; align-items: center }
.locked .recipe-line { height: auto }
.role p, h3, .facts span, .facts b, .facts code, .facts small {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
