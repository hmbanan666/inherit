/** One tick of `world.cpu`. The sim owns both numbers, including after CPU +10. */
export interface CpuSample {
  used: number
  limit: number
}

export type CpuTone = 'normal' | 'near' | 'over'

export interface CpuMeter {
  used: number
  limit: number
  /** `CPU 34/50` */
  label: string
  /** Bar width, clamped to the limit. */
  fill: string
  tone: CpuTone
}

/** Recent spent values. The meter shows their max. `tick` skips a second snapshot of the same tick. */
export interface CpuHold {
  samples: number[]
  limit: number
  tick?: number
}

/** How many ticks the meter remembers. A shorter window flickers; this one is about two seconds. */
export const cpuWindow = 4

function finite(value: number) {
  return Number.isFinite(value) ? value : 0
}

/** Quiet at or under 80%. Gold above that. Alert when the tick is at the limit. */
export function cpuTone(used: number, limit: number): CpuTone {
  if (!(limit > 0)) return 'normal'
  if (used >= limit) return 'over'
  if (used * 5 > limit * 4) return 'near'
  return 'normal'
}

export function cpuLabel(used: number, limit: number) {
  return `CPU ${used}/${limit}`
}

export function cpuFill(used: number, limit: number) {
  if (!(limit > 0) || used <= 0) return '0%'
  return `${Math.round(Math.min(1, used / limit) * 100)}%`
}

/** The label, bar, and tone for one sample. No shop math: the limit arrives already raised. */
export function readCpu(sample: CpuSample): CpuMeter {
  const used = Math.max(0, finite(sample.used))
  const limit = Math.max(0, finite(sample.limit))
  return { used, limit, label: cpuLabel(used, limit), fill: cpuFill(used, limit), tone: cpuTone(used, limit) }
}

/**
 * Keep the highest spend of the last few ticks so a quiet tick does not flicker the bar.
 * Another snapshot of the same tick does not move the window.
 * A new limit, such as the shop's CPU +10, shows on this sample.
 */
export function steadyCpu(state: CpuHold | undefined, sample: CpuSample & { tick?: number }, span = cpuWindow): { hold: CpuHold; meter: CpuMeter } {
  const reading = readCpu(sample)
  if (state && sample.tick !== undefined && state.tick === sample.tick && state.limit === reading.limit) {
    const used = state.samples.reduce((max, value) => Math.max(max, value), 0)
    return { hold: state, meter: readCpu({ used, limit: reading.limit }) }
  }
  const samples = state && state.limit === reading.limit
    ? [...state.samples, reading.used].slice(-Math.max(1, span))
    : [reading.used]
  const used = samples.reduce((max, value) => Math.max(max, value), 0)
  const meter = used === reading.used ? reading : readCpu({ used, limit: reading.limit })
  return { hold: { samples, limit: reading.limit, tick: sample.tick }, meter }
}

export function cpuTitle(meter: Pick<CpuMeter, 'label' | 'tone'>) {
  const head = meter.tone === 'over' ? 'Over the limit. ' : meter.tone === 'near' ? 'Near the limit. ' : ''
  return `${head}CPU is the budget for your code each tick. ${meter.label} is the recent high against the limit. A call past the limit does not run, and the rest of that tick is skipped. CPU +10 in the shop raises the limit.`
}
