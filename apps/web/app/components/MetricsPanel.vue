<script setup lang="ts">
import type { FloorWorld } from '../lib/floor'
import { sampleMetrics, type MetricSample } from '../lib/metricHistory'
const props = defineProps<{ world: FloorWorld }>()
const samples = shallowRef<MetricSample[]>([])
watch(() => props.world, world => {
  samples.value = sampleMetrics(samples.value, world)
}, { immediate: true })
function chart(label: string, values: number[], options: { limits?: number[]; showLatest?: boolean } = {}) {
  const { limits } = options
  const low = Math.min(0, ...values)
  const high = Math.max(low + 1, ...values, ...(limits ?? []))
  const y = (value: number) => (28 - ((value - low) * 25) / (high - low)).toFixed(1)
  function points(series: number[], stepped = false) {
    return series.map((value, i) => {
      const x = (series.length === 1 ? 116 : 2 + (i * 114) / (series.length - 1)).toFixed(1)
      const point = `${x},${y(value)}`
      if (stepped && i > 0 && series[i - 1] !== value) return `${x},${y(series[i - 1])} ${point}`
      return point
    }).join(' ')
  }
  const trend = `${label} started at ${values[0]} and ended at ${values.at(-1)}. Range ${Math.min(...values)}–${Math.max(...values)}.`
  return {
    label,
    line: points(values),
    limit: limits ? points(limits, true) : '',
    description: limits ? `${trend} The ceiling started at ${limits[0]} and ended at ${limits.at(-1)}.` : trend,
    value: options.showLatest ? values.at(-1) : undefined,
  }
}
const charts = computed(() => {
  const all = samples.value
  return [
    chart('CPU per tick', all.map(s => s.cpu), { limits: all.map(s => s.limit) }),
    chart('Credits', all.map(s => s.credits)),
    chart('Furnace ore', all.map(s => s.input), { showLatest: true }),
    chart('Ingots', all.map(s => s.output), { showLatest: true }),
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
            {{ c.label }} <strong v-if="c.value !== undefined">{{ c.value }}</strong>
          </figcaption>
          <svg viewBox="0 0 118 31" preserveAspectRatio="none" role="img" :aria-label="c.description">
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
