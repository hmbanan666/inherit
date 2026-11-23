<script setup lang="ts">
import type { FloorWorld } from '../lib/floor'
const props = defineProps<{ world: FloorWorld }>()
type Sample = { tick: number; cpu: number; credits: number; input: number; output: number }
const samples = shallowRef<Sample[]>([])
watch(() => props.world, w => {
  const previous = samples.value.filter(s => s.tick < w.tick).slice(-59)
  samples.value = [...previous, { tick: w.tick, cpu: w.cpu.used, credits: w.credits, input: w.furnace.input, output: w.furnace.output }]
}, { immediate: true })
function chart(label: string, values: number[], suffix = '', limits?: number[]) {
  const low = Math.min(0, ...values)
  const high = Math.max(low + 1, ...values, ...(limits ?? []))
  function points(series: number[]) {
    return series
      .map(
        (n, i) =>
          (series.length === 1 ? 116 : 2 + (i * 114) / (series.length - 1)).toFixed(1) +
          ',' +
          (28 - ((n - low) * 25) / (high - low)).toFixed(1),
      )
      .join(' ')
  }
  return {
    label,
    line: points(values),
    limit: limits ? points(limits) : '',
    value: (values.at(-1) ?? 0) + suffix,
  }
}
const charts = computed(() => {
  const all = samples.value
  return [
    chart('CPU', all.map(s => s.cpu), ' / ' + props.world.cpu.limit, all.map(() => props.world.cpu.limit)),
    chart('Credits', all.map(s => s.credits)),
    chart('Furnace ore', all.map(s => s.input)),
    chart('Ingots', all.map(s => s.output)),
  ]
})
</script>
<template>
  <section class="bench" aria-label="Factory metrics">
    <p v-if="!samples.length" class="quiet">Waiting for the first tick.</p>
    <template v-else>
      <div class="bar">
        <span class="tick">t{{ samples[0]?.tick }}–{{ samples.at(-1)?.tick }}</span>
      </div>
      <div class="charts">
        <figure v-for="c in charts" :key="c.label">
          <figcaption>
            {{ c.label }} <strong>{{ c.value }}</strong>
          </figcaption>
          <svg viewBox="0 0 118 31" preserveAspectRatio="none" aria-hidden="true">
            <polyline v-if="c.limit" :points="c.limit" stroke-dasharray="3 3" stroke="var(--sub)" />
            <polyline :points="c.line" stroke="var(--gold)" />
          </svg>
        </figure>
      </div>
    </template>
  </section>
</template>
<style scoped src="../lib/devtools/panels.css"></style>
<style scoped>
.charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 6px;
}
figure {
  margin: 0;
  padding: 5px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 3px;
}
figcaption {
  display: flex;
  justify-content: space-between;
  gap: 3px;
  font-size: 10px;
  color: var(--sub);
}
strong {
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
svg {
  display: block;
  width: 100%;
  height: 25px;
}
polyline {
  fill: none;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}
</style>
