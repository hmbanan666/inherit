<script setup lang="ts">
import { useGame } from '../lib/useGame'
const game = useGame()
const samples = game.metrics
const ids = computed(() => Object.keys(samples.value.at(-1)?.machines ?? {}))
const chosen = ref('')
const machine = computed(() => (ids.value.includes(chosen.value) ? chosen.value : (ids.value[0] ?? '')))
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
  // Only chart this machine for ticks when it was on the floor.
  const station = all.flatMap((s) => (s.machines[machine.value] ? [s.machines[machine.value]!] : []))
  return [
    chart(
      'Throughput',
      station.map((s) => s.rate),
      '/min',
    ),
    chart(
      'Idle share',
      station.map((s) => Math.round(s.idle * 100)),
      '%',
    ),
    chart(
      'Blocked share',
      station.map((s) => Math.round(s.blocked * 100)),
      '%',
    ),
    chart(
      'Queue depth',
      station.map((s) => s.queue),
    ),
    chart(
      'CPU',
      all.map((s) => s.cpu),
      ' / ' + (all.at(-1)?.budget ?? 0),
      all.map((s) => s.budget),
    ),
    chart(
      'Coins',
      all.map((s) => s.money),
    ),
    chart(
      'Errors',
      all.map((s) => s.errors),
    ),
  ]
})
</script>
<template>
  <section class="bench" aria-label="Factory metrics">
    <p v-if="!samples.length" class="quiet">Waiting for the first tick.</p>
    <template v-else>
      <div class="bar">
        <select
          v-if="ids.length"
          :value="machine"
          aria-label="Machine metrics"
          @change="chosen = ($event.target as HTMLSelectElement).value"
        >
          <option v-for="id in ids" :key="id">{{ id }}</option>
        </select>
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
