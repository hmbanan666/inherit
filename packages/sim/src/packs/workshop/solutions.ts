import type { ChallengeId } from './fixtures'

export const solutions: Record<ChallengeId, string> = {
  'dispatch-batch': `import { take, put } from "inherit"

function dispatch(): boolean {
  if (!take("belt")) return false
  return put("cart")
}

while (dispatch()) {
  // One delivery frees the arm for the next pickup.
}`,
  'heavy-tally': `import { take, put, display } from "inherit"

let heavy = 0
for (let parcel = take("belt"); parcel; parcel = take("belt")) {
  if (parcel.weight >= 5) heavy++
  put("cart")
}
display(heavy)`,
  'colour-bins': `import { take, put } from "inherit"

function bin(colour: Parcel["colour"]): Place {
  return colour === "red" ? "left" : "right"
}

for (let parcel = take("belt"); parcel; parcel = take("belt")) {
  put(bin(parcel.colour))
}`,
  'route-table': `import { take, put } from "inherit"

const routes: Record<Parcel["to"], Place> = {
  north: "left",
  south: "right",
  dock: "cart",
}

for (let parcel = take("belt"); parcel; parcel = take("belt")) {
  put(routes[parcel.to])
}`,
  'peak-weight': `import { take, put, display } from "inherit"

let peak = 0
for (let parcel = take("belt"); parcel; parcel = take("belt")) {
  peak = Math.max(peak, parcel.weight)
  put("cart")
}
display(peak)`,
  'fragile-head': `import { look, take, put } from "inherit"

while (true) {
  const front = look("belt").front
  if (!front || front.weight > 3) break
  take("belt")
  put("cart")
}`,
  'merge-bins': `import { look, take, put } from "inherit"

while (true) {
  const left = look("left").front
  const right = look("right").front
  if (!left && !right) break
  const source = !right || (left && left.weight <= right.weight) ? "left" : "right"
  take(source)
  put("cart")
}`,
  'bin-dispatch': `import { take, put } from "inherit"

function move(source: Place, destination: Place): boolean {
  return !!take(source) && put(destination)
}

while (move("right", "cart")) {}
while (move("belt", "right")) {
  move("right", "cart")
}`,
  'first-clock': `import { look, take, put } from "inherit"

export function onTick() {
  if (look("belt").count > 0) {
    take("belt")
    put("cart")
  }
}`,
  'clear-outlet': `import { look, take, put, clearJam } from "inherit"

export function onTick() {
  const outlet = look("left")
  if (outlet.jammed) {
    clearJam("left")
    return
  }
  if (outlet.count > 0) {
    take("left")
    put("cart")
  }
}`,
  'alternate-bins': `import { look, take, put } from "inherit"

let preferred: Place = "left"
export function onTick() {
  const other = preferred === "left" ? "right" : "left"
  const source = look(preferred).count > 0 ? preferred : other
  if (look(source).count === 0) return
  take(source)
  put("cart")
  preferred = source === "left" ? "right" : "left"
}`,
  'relay-controller': `import { look, take, put } from "inherit"

export function onTick() {
  if (look("right").count > 0) {
    take("right")
    put("cart")
  } else if (look("belt").count > 0) {
    take("belt")
    put("right")
  }
}`,
}
