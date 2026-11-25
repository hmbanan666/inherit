import { createWorld, kettlewick } from '@inherit/sim/v8'
import { Container, Graphics, Text } from 'pixi.js'
import { expect, test } from 'vitest'
import { createBench, createLathe, createPress, createSpare } from '../../../../packages/sim/src/v8/modules/stock'
import { FloorScene } from './floor'

function tree(root: Container): Container[] {
  return [root, ...root.children.flatMap(tree)]
}

test('artFor returns the field drawing for every station, cart and visible vein without captions', () => {
  const world = createWorld(kettlewick)
  const scene = new FloorScene(world)
  expect(scene.artFor('press')).toBeUndefined()
  world.press = createPress()
  world.spare = createSpare()
  world.lathe = createLathe()
  world.bench = createBench()
  world.drones.push({ ...structuredClone(world.drones[0]!), name: 'drone-2' })
  for (const vein of world.veins) vein.hidden = false
  scene.update(world)

  const ids = ['furnace', 'depot', 'press', 'spare', 'lathe', 'bench',
    ...world.drones.map(cart => cart.name), ...world.veins.map(vein => 'Vein ' + vein.name)]
  const field = tree(scene.root)
  const drawings = ids.map(id => {
    const art = scene.artFor(id)
    expect(field.includes(art!), id).toBe(true)
    expect(tree(art!).some(node => node instanceof Text), id).toBe(false)
    const shapes = tree(art!).filter(node => node instanceof Graphics)
    expect(shapes, id).toHaveLength(id.startsWith('Vein ') ? 7 : 1)
    return art
  })
  expect(new Set(drawings).size).toBe(ids.length)
  expect(scene.artFor('unknown')).toBeUndefined()
})
