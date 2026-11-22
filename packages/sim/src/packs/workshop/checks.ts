import ts from 'typescript'
import type { Evidence } from '../../framework/pack'
import { fixtureFor, places, type Floor } from './floor'
import type { Parcel, Place } from './player'

const same = (actual: Parcel[], expected: Parcel[]) =>
  actual.length === expected.length && actual.every((parcel, index) => parcel.id === expected[index].id)

function allPresent(world: Floor) {
  const fixture = fixtureFor(world)
  const expected = Object.values(fixture.queues).flat().concat(
    (fixture.deliveries ?? []).filter(d => d.tick <= world.tick).flatMap(d => d.parcels),
  )
  const actual = places.flatMap(place => world.queues[place])
  if (world.hand) actual.push(world.hand)
  const byId = (a: Parcel, b: Parcel) => a.id.localeCompare(b.id)
  return same(actual.sort(byId), expected.sort(byId))
}

// Accept inferred tables, aliases and helpers. Require a lookup on a table that actually exists.
const tableCache = new WeakMap<object, boolean>()
function usesTable(files: Evidence<Floor>['files']) {
  const cached = tableCache.get(files)
  if (cached !== undefined) return cached
  const tables = new Set<string>()
  const lookups = new Set<string>()
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      let value = node.initializer
      while (ts.isAsExpression(value) || ts.isSatisfiesExpression(value) || ts.isParenthesizedExpression(value)) value = value.expression
      if (ts.isObjectLiteralExpression(value)) {
        const keys = value.properties.map(p => p.name?.getText().replace(/^['"]|['"]$/g, ''))
        if (['north', 'south', 'dock'].every(key => keys.includes(key))) tables.add(node.name.text)
      }
    }
    if (ts.isElementAccessExpression(node)) lookups.add(node.expression.getText())
    ts.forEachChild(node, visit)
  }
  for (const [name, source] of Object.entries(files)) visit(ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true))
  const found = [...tables].some(table => lookups.has(table))
  tableCache.set(files, found)
  return found
}

function manualConditions({ world, before, calls, files }: Evidence<Floor>): boolean[] {
  const { queues, actions, readings, hand } = world
  const { belt, left, right } = before.queues
  const cart = queues.cart
  const dispatched = same(cart, belt)
  const pickups = actions.filter(action => action.name === 'take')
  const finalReading = (value: number) => readings.length === 1 && readings[0] === value &&
    actions.slice(actions.findIndex(a => a.name === 'display') + 1).every(a => !a.ok)
  switch (world.challenge) {
    case 'dispatch-batch': {
      const empty = pickups.filter(a => !a.ok)
      return [dispatched, !hand, empty.length === 1 && empty[0].place === 'belt' &&
        empty[0] === pickups.at(-1) && actions.at(-1) === empty[0]]
    }
    case 'heavy-tally': {
      const count = belt.filter(p => p.weight >= 5).length
      return [readings.at(-1) === count, dispatched, finalReading(count)]
    }
    case 'colour-bins':
      return [same(queues.left, belt.filter(p => p.colour === 'red')),
        same(queues.right, belt.filter(p => p.colour === 'blue')), !queues.belt.length && !hand]
    case 'route-table': {
      const route = (place: Place, label: Parcel['to']) => same(queues[place], belt.filter(p => p.to === label))
      return [usesTable(files), places.slice(1).every(place =>
        queues[place].every(p => p.to === ({ left: 'north', right: 'south', cart: 'dock' } as Partial<Record<Place,string>>)[place])),
        route('left', 'north') && route('right', 'south') && route('cart', 'dock')]
    }
    case 'peak-weight': {
      const peak = Math.max(0, ...belt.map(p => p.weight))
      return [readings.at(-1) === peak, dispatched, !!belt.length || readings.at(-1) === 0, finalReading(peak)]
    }
    case 'fragile-head': {
      const heavy = belt.findIndex(p => p.weight > 3)
      const count = heavy < 0 ? belt.length : heavy
      let inspected = false
      const guarded = calls.every(call => {
        if (call.name === 'look' && call.args[0] === 'belt') inspected = true
        if (call.name !== 'take') return true
        const ok = inspected && !!call.result
        inspected = false
        return ok
      })
      return [same(cart, belt.slice(0, count)), same(queues.belt, belt.slice(count)), guarded && pickups.every(a => a.ok) && calls.some(c => c.name === 'look' && c.args[0] === 'belt')]
    }
    case 'merge-bins': {
      const merged = [...left, ...right].sort((a,b) => a.weight - b.weight)
      return [cart.every((p,i) => !i || cart[i-1].weight <= p.weight), same(cart, merged),
        !queues.left.length && !queues.right.length && !hand, pickups.length === merged.length && pickups.every(a => a.ok)]
    }
    case 'bin-dispatch': {
      const transfers = actions.filter(a => a.ok)
      return [same(cart, [...right, ...belt]) && transfers.slice(0, right.length * 2).every(a => a.place !== 'belt'),
        belt.every(p => transfers.some(a => a.name === 'put' && a.place === 'right' && a.parcel === p.id)),
        transfers.every((a,i) => a.name !== 'put' || a.place !== 'cart' || transfers[i-1]?.place === 'right'),
        !hand && places.filter(p => p !== 'cart').every(p => !queues[p].length)]
    }
    default: return []
  }
}

function clockConditions(world: Floor): boolean[] {
  const turns = fixtureFor(world).turns!
  const setupQuiet = world.actions.every(a => a.tick > 0)
  const turnsSoFar = turns.slice(0, world.tick).map((source, index) => {
    const actions = world.actions.filter(a => a.tick === index + 1)
    const quiet = !actions.length
    const cleared = actions.length === 1 && actions[0].name === 'clearJam' && actions[0].ok
    const destination = world.challenge === 'relay-controller' && source === 'belt' ? 'right' : 'cart'
    const moved = actions.length === 2 && actions[0].name === 'take' && actions[0].place === source &&
      actions[1].name === 'put' && actions[1].place === destination && actions.every(a => a.ok)
    return { source, actions, ok: source === '-' ? quiet : source === '!' ? cleared : moved }
  })
  const everyTurn = turnsSoFar.every(t => t.ok)
  const idle = turnsSoFar.every(t => t.source !== '-' || t.ok)
  const end = world.tick === turns.length && !world.hand && places.filter(p => p !== 'cart').every(p => !world.queues[p].length)
  switch (world.challenge) {
    case 'first-clock':
      return [setupQuiet, turnsSoFar.every(t => t.source === '-' || t.ok), idle, end]
    case 'clear-outlet':
      return [setupQuiet && world.actions.every(a => a.name !== 'clearJam' || a.ok),
        turnsSoFar.every(t => t.source !== '!' || t.ok), everyTurn && end, idle]
    case 'alternate-bins':
      return [setupQuiet && everyTurn, end, idle && everyTurn, turnsSoFar.every(t => t.actions.filter(a => a.name === 'put').length <= 1)]
    default:
      return [setupQuiet && turnsSoFar.every(t => t.actions.filter(a => a.name === 'put').length <= 1),
        world.queues.right.length <= 1, everyTurn, idle && end]
  }
}

export function passes(evidence: Evidence<Floor>, index: number) {
  const world = evidence.world
  const turns = fixtureFor(world).turns
  if (turns && world.tick < turns.length) return world.tick > 0 ? 'amber' : 'red'
  const results = turns ? clockConditions(world) : manualConditions(evidence)
  return results[index] && allPresent(world) ? 'green' : 'red'
}
