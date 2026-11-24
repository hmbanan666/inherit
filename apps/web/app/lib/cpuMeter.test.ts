import { expect, test } from 'vitest'
import { cpuFill, cpuLabel, cpuTitle, cpuTone, readCpu, steadyCpu } from './cpuMeter'

test('the label is the sim used and limit', () => {
  expect(cpuLabel(34, 50)).toBe('CPU 34/50')
  expect(readCpu({ used: 0, limit: 30 })).toMatchObject({ label: 'CPU 0/30', fill: '0%', tone: 'normal' })
  expect(readCpu({ used: 8, limit: 8 })).toMatchObject({ label: 'CPU 8/8', fill: '100%', tone: 'over' })
  expect(readCpu({ used: -4, limit: 30 })).toMatchObject({ used: 0, label: 'CPU 0/30' })
})

test('near is above 80 percent and over is at the limit', () => {
  expect(cpuTone(40, 50)).toBe('normal')
  expect(cpuTone(41, 50)).toBe('near')
  expect(cpuTone(49, 50)).toBe('near')
  expect(cpuTone(50, 50)).toBe('over')
  expect(cpuTone(24, 30)).toBe('normal')
  expect(cpuTone(25, 30)).toBe('near')
  expect(cpuTone(30, 30)).toBe('over')
  expect(cpuTone(6, 8)).toBe('normal')
  expect(cpuTone(7, 8)).toBe('near')
  expect(cpuTone(8, 8)).toBe('over')
  expect(cpuTone(0, 0)).toBe('normal')
  expect(cpuFill(34, 50)).toBe('68%')
  expect(cpuFill(28, 30)).toBe('93%')
  expect(cpuFill(60, 50)).toBe('100%')
  expect(cpuFill(2, 40)).toBe('5%')
})

test('the meter keeps a short rolling max and takes a new limit at once', () => {
  let step = steadyCpu(undefined, { used: 4, limit: 30 })
  expect(step.meter).toMatchObject({ label: 'CPU 4/30', tone: 'normal' })
  step = steadyCpu(step.hold, { used: 28, limit: 30 })
  expect(step.meter).toMatchObject({ label: 'CPU 28/30', tone: 'near', fill: '93%' })
  step = steadyCpu(step.hold, { used: 2, limit: 30 })
  expect(step.meter.label).toBe('CPU 28/30')
  step = steadyCpu(step.hold, { used: 2, limit: 30 })
  step = steadyCpu(step.hold, { used: 2, limit: 30 })
  expect(step.meter.label).toBe('CPU 28/30')
  step = steadyCpu(step.hold, { used: 2, limit: 30 })
  expect(step.meter).toMatchObject({ label: 'CPU 2/30', tone: 'normal' })

  const bought = steadyCpu(step.hold, { used: 2, limit: 40 })
  expect(bought.meter).toMatchObject({ label: 'CPU 2/40', tone: 'normal', fill: '5%' })
  expect(bought.hold.limit).toBe(40)
  expect(bought.hold.samples).toEqual([2])
})

test('a limit hit stays on the meter until the window moves on', () => {
  let step = steadyCpu(undefined, { used: 10, limit: 30 })
  step = steadyCpu(step.hold, { used: 30, limit: 30 })
  expect(step.meter.tone).toBe('over')
  expect(cpuTitle(step.meter)).toContain('Over the limit.')
  expect(cpuTitle(step.meter)).toContain('CPU 30/30')
  expect(cpuTitle(step.meter)).toContain('CPU +10 in the shop raises the limit.')
  expect(cpuTitle(readCpu({ used: 4, limit: 30 }))).toContain('CPU is the budget for your code each tick.')
  step = steadyCpu(step.hold, { used: 4, limit: 30 })
  expect(step.meter.tone).toBe('over')
})

test('another snapshot of the same tick does not move the window', () => {
  let step = steadyCpu(undefined, { used: 28, limit: 30, tick: 4 })
  step = steadyCpu(step.hold, { used: 2, limit: 30, tick: 4 })
  expect(step.meter.label).toBe('CPU 28/30')
  expect(step.hold.samples).toEqual([28])
  const bought = steadyCpu(step.hold, { used: 28, limit: 40, tick: 4 })
  expect(bought.meter).toMatchObject({ label: 'CPU 28/40', tone: 'normal' })
  expect(bought.hold.samples).toEqual([28])
  expect(bought.hold.tick).toBe(4)
})

test('the formatter does not invent a budget', () => {
  expect(readCpu({ used: 3, limit: 18 }).label).toBe('CPU 3/18')
  expect(readCpu({ used: Number.NaN, limit: Number.POSITIVE_INFINITY })).toMatchObject({ used: 0, limit: 0, tone: 'normal', fill: '0%' })
})
