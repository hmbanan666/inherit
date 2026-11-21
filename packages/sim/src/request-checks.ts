import type { Campaign } from './model'
import { activeRequest, debtRemaining } from './town'

export interface RequestCheck {
  id: string
  text: string
  state: 'todo' | 'close' | 'done'
  progress?: [number, number]
}
const check = (id: string, text: string, done: boolean, close = false): RequestCheck => ({
  id,
  text,
  state: done ? 'done' : close ? 'close' : 'todo',
})

export function requestChecks(c: Campaign): RequestCheck[] {
  const t = c.town
  const request = activeRequest(c)
  if (request) {
    const machineId = (
      { 1: 'furnace', 3: 'press', 5: 'cutter', 7: 'gears', 9: 'assembler' } as Record<number, string>
    )[t.beat]
    const m = c.world.machines.find((m) => m.id === machineId)
    return [
      ...(t.beat === 1
        ? [
            check('onTick', 'Your onTick prints a message', !!c.progress.signals.printedTick),
            check('dig', 'Your code takes ore from the mine', !!c.world.extracted['iron-ore']),
          ]
        : []),
      check('produce', 'The ' + machineId + ' makes ' + request.item, !!m?.stats.processed, !!m?.remaining),
      {
        ...check(request.id, request.check, t.filled === request.quantity, t.filled > 0),
        progress: [t.filled, request.quantity],
      },
    ]
  }
  if (t.beat === 2) return [check('tab', 'Acknowledge Mrs Harrow’s letter', false)]
  if (t.beat === 4)
    return [
      check(
        'copper',
        'The copper furnace makes an ingot',
        c.world.machines.some((m) => m.id === 'copper' && m.stats.processed > 0),
      ),
    ]
  if (t.beat === 6) return [check('repair', 'A broken furnace runs again', c.progress.signals.recovered)]
  if (t.beat === 8)
    return ['elsie', 'wen'].map((who) =>
      check(
        who,
        'Fill ' + (who === 'elsie' ? 'Elsie’s plate' : 'Wen’s gear') + ' order',
        t.competition.includes(who),
        !!Object.values(c.economy.orders.find((o) => o.id === 'order-8-' + who)?.filled ?? {}).some(Boolean),
      ),
    )
  if (t.beat === 10) return [check('debt', 'Settle the family tab', !debtRemaining(c), t.paid > 0)]
  return []
}
