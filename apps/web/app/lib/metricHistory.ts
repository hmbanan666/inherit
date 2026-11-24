import type { FloorWorld } from './floor'

export interface MetricSample {
  tick: number
  cpu: number
  limit: number
  credits: number
  input: number
  output: number
}

export function sampleMetrics(history: MetricSample[], world: FloorWorld): MetricSample[] {
  const previous = history.filter(sample => sample.tick < world.tick).slice(-59)
  return [...previous, {
    tick: world.tick,
    cpu: world.cpu.used,
    limit: world.cpu.limit,
    credits: world.credits,
    input: world.furnace.input,
    output: world.furnace.output,
  }]
}
