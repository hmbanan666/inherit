import { expect, test } from 'vitest'
import { createFloor, floorActions } from './floor'
import { fixtures } from './fixtures'

test('the parcel arm holds one original label and inspections return independent copies', () => {
  const world = createFloor('dispatch-batch', fixtures['dispatch-batch'][0])
  const api = floorActions(world, 'run')
  const lifted = api.take('belt')!
  lifted.weight = 99
  expect(api.take('belt')).toBeUndefined()
  expect(api.put('belt')).toBe(false)
  expect(api.put('cart')).toBe(true)
  const front = api.look('cart').front!
  expect(front.id).toBe('A')
  expect(front.weight).not.toBe(99)
  front.id = 'changed'
  expect(api.look('cart').front?.id).toBe('A')
  expect(api.take('cart')).toBeUndefined()
  expect(() => api.look('mine' as never)).toThrow(/mine.*Place/)
  expect(() => api.display(Infinity)).toThrow(/Infinity.*finite number/)
})
