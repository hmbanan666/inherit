<script setup lang="ts">
import { Lock } from '@lucide/vue'
import type { cardSide } from '../lib/cardPlace'
import { hintParts } from '../lib/shellBar'
import { actionLabel, disabledReason, machineSheet, missingLabel, resourceColor, sheetColumns, sheetCss, sheetLabels, sheetLayout, type InspectView } from '../lib/machineSheet'

const props = defineProps<{ inspected: InspectView; sprite?: string; side?: ReturnType<typeof cardSide> }>()
const emit = defineEmits<{ close: []; manual: [action: InspectView['actions'][number]]; api: [section: string] }>()
const sheet = computed(() => machineSheet(props.inspected))
const columns = computed(() => sheetColumns(sheet.value, sheetLayout(sheet.value)))
</script>

<template>
  <GameDialog :title="inspected.name" wide :side="side" @close="emit('close')">
    <article class="quest" :style="sheetCss">
      <div class="role">
        <div class="plate"><img v-if="sprite" :src="sprite" alt=""></div>
        <div class="identity">
          <h3>{{ sheet.name }}</h3>
          <small>{{ sheet.kind }}</small>
          <p>{{ sheet.description }}</p>
          <span class="status" :class="sheet.status.tone">{{ sheet.status.label }}</span>
        </div>
      </div>
      <div class="columns" :class="{ paired: columns.length === 2 }">
        <div v-for="(column, index) in columns" :key="index" class="column">
          <section v-for="section in column" :key="section.kind" :class="section.kind">
            <h3>{{ section.title }}
              <a v-if="section.kind === 'api'" href="#api" @click.prevent="emit('api', sheet.apiSection)">{{ sheetLabels.link }}</a>
            </h3>
            <p v-if="section.kind === 'api'" class="intro">{{ sheetLabels.intro }}</p>
            <ul class="facts">
              <li v-for="row in section.rows" :key="row.key" :class="row.kind">
                <div v-if="row.kind === 'meter' || row.kind === 'progress'" class="bar-row" :class="{ full: row.full }" :style="{ '--resource': row.color }">
                  <span class="stock-label"><i v-if="row.kind === 'meter'" class="dot" />{{ row.label }}</span>
                  <progress :aria-label="row.label" :value="row.value" :max="row.max" />
                  <code>{{ row.text }}</code>
                </div>
                <template v-else-if="row.kind === 'fact'">
                  <span>{{ row.label }}</span><span :title="row.value">{{ row.value }}</span>
                </template>
                <template v-else-if="row.kind === 'locked'">
                  <div class="lock-label">
                    <Lock :size="14" aria-hidden="true" /><b>{{ row.label }}</b><code v-if="row.api" :title="row.api">{{ row.api }}</code>
                  </div>
                  <small class="unlock" :title="row.unlock">{{ row.unlock }}</small>
                </template>
                <small v-else-if="row.kind === 'more'">{{ row.label }}</small>
                <template v-else-if="row.kind === 'recipe'">
                  <div class="recipe-line">
                    <template v-for="(chips, side) in [row.input, row.output]" :key="side">
                      <span v-if="side" class="arrow">→</span>
                      <span v-for="(chip, i) in chips" :key="i" class="chip">
                        <i v-if="chip.qty !== undefined" class="dot" :style="{ '--resource': resourceColor(chip.item) }" />
                        <span>{{ chip.qty }} {{ chip.item }}</span>
                      </span>
                    </template>
                    <code v-if="row.call" class="recipe-call" :title="row.call">{{ row.call }}</code>
                  </div>
                  <small v-if="row.missing" class="missing" :title="row.missing">{{ missingLabel }} {{ row.missing }}</small>
                </template>
                <template v-else-if="row.kind === 'api'">
                  <div class="action-line">
                    <code>{{ row.api }}</code>
                    <span :id="'readiness-' + row.key" :class="{ ready: row.ready }" :title="row.readiness">{{ row.readiness }}</span>
                  </div>
                  <span class="description" :title="row.description">{{ row.description }}</span>
                </template>
              </li>
            </ul>
          </section>
        </div>
      </div>
      <footer>
        <small>{{ sheetLabels.close }}</small>
        <div v-if="sheet.actions.length" class="actions" role="group" :aria-label="sheetLabels.actions">
          <button v-for="action in sheet.actions" :key="action.id" type="button" class="calm" :disabled="!action.enabled"
            :title="disabledReason(action)" :aria-describedby="!action.enabled ? 'readiness-' + action.id : undefined"
            @click="emit('manual', action)">{{ actionLabel(inspected, action) }}</button>
        </div>
      </footer>
      <p v-if="sheet.depotHint" class="depot-hint">
        <component :is="part.code ? 'code' : 'span'" v-for="(part, i) in hintParts(sheet.depotHint)" :key="i">{{ part.text }}</component>
      </p>
    </article>
  </GameDialog>
</template>

<style scoped>
.quest, .identity, .column, .columns section { min-width: 0 }
.role { display: flex; align-items: center; gap: 24px; height: var(--sheet-header); margin-bottom: var(--sheet-gap) }
.plate {
  flex: 0 0 120px;
  height: 120px;
  align-self: flex-start;
  margin-top: -32px;
  transform: translateY(calc(-1 * var(--sheet-padding)));
  box-shadow: 0 4px 12px var(--shadow-light);
  display: grid;
  place-items: center;
  background: var(--floor-base);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.plate img { width: 96px; height: 96px; object-fit: contain; image-rendering: pixelated }
.identity { display: grid; justify-items: start; gap: 3px; padding-right: 32px }
.identity h3 { font-size: 22px; font-weight: 700; line-height: 24px }
.identity small { line-height: 12px }
.identity p {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  color: var(--soft);
  font-size: 13px;
  line-height: 16px;
}
small, .intro { color: var(--sub); font: inherit; font-size: 12px }
.status { padding: 2px 8px; border-radius: 12px; font-size: 12px; line-height: 16px }
.idle { background: var(--surface-raised); color: var(--sub) }
.working { background: var(--accent-surface); color: var(--gold) }
.columns, .column { display: grid; align-items: start; align-content: start; gap: var(--sheet-gap); min-width: 0 }
.columns.paired { grid-template-columns: repeat(2, minmax(0, 1fr)) }
@media (max-width: 639px) {
  .columns.paired { grid-template-columns: minmax(0, 1fr) }
}
.column h3 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  height: calc(var(--sheet-heading) - 8px);
  margin: 0 0 8px;
  border-bottom: 1px solid var(--line);
  color: var(--sub);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.column h3 a { color: var(--accent-soft); font-weight: 400; letter-spacing: 0 }
.intro { height: var(--sheet-intro) }
.facts { list-style: none; margin: 0; padding: 0; color: var(--text); font-size: 12px }
.facts li, .identity h3, .bar-row code, .fact span, .recipe-line code, .chip span, .missing, .unlock,
.lock-label code, .action-line > *, .description {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.facts .meter { height: var(--sheet-meter) }
.facts .progress { height: var(--sheet-progress) }
.bar-row { height: 100%; display: grid; grid-template-columns: minmax(96px, auto) minmax(16px, 1fr) 5ch; align-items: center; gap: 8px }
.stock-label, .chip, .recipe-line, .lock-label, .action-line, .fact { display: flex; align-items: center; gap: 8px }
.dot { flex: none; width: 10px; height: 10px; border-radius: 50%; background: var(--resource) }
.bar-row code { text-align: right; font-variant-numeric: tabular-nums }
progress { appearance: none; width: 100%; height: 8px; overflow: hidden; border: 0; border-radius: 4px; background: var(--accent-shadow); color: var(--resource) }
progress::-webkit-progress-bar { background: var(--accent-shadow) }
progress::-webkit-progress-value { background: var(--resource) }
progress::-moz-progress-bar { background: var(--resource) }
.full progress { box-shadow: 0 0 6px 1px var(--gold) }
.full code { color: var(--gold) }
.fact { height: var(--sheet-fact); justify-content: space-between }
.fact span:first-child { flex: none; color: var(--sub) }
.recipe-line { height: var(--sheet-recipe) }
.chip { min-width: 0; height: 24px; padding: 0 8px; border-radius: 12px; background: var(--surface-raised) }
.arrow, .recipe-call { color: var(--sub) }
.recipe-call { margin-left: auto }
.missing, .unlock { display: block }
.missing { height: var(--sheet-missing); line-height: var(--sheet-missing) }
code { font: 12px var(--mono) }
li.api { height: var(--sheet-api); display: grid; align-content: center; gap: 2px }
.action-line { justify-content: space-between }
.action-line code { flex: none; max-width: 100%; color: var(--accent-soft) }
.action-line span { color: var(--sub); text-align: right }
.action-line .ready { color: var(--mint) }
.description { color: var(--soft) }
.facts li.locked { height: var(--sheet-locked); display: grid; align-content: center }
.lock-label svg { flex: none; color: var(--sub) }
.facts li.more { height: var(--sheet-more); color: var(--sub) }
.unlock { padding-left: 22px }
.lock-label, .unlock { height: 20px; line-height: 20px }
.depot-hint { margin: 0; height: var(--sheet-hint); color: var(--sub); text-align: right; font-size: 12px; line-height: var(--sheet-hint) }
footer { height: var(--sheet-footer); display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid var(--line) }
.actions { display: flex; align-items: center; gap: 8px }
.actions button { font-size: 13px }
@media (max-width: 479px) {
  footer { height: auto; min-height: var(--sheet-footer); padding-top: 8px; flex-wrap: wrap }
  .actions { flex-wrap: wrap }
}
</style>
