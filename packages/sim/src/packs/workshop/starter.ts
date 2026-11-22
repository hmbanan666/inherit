import type { Files, Starter } from '../../framework/pack'
import { starter } from './chapter'

interface Edit { goal: string; note: string; anchor?: RegExp; file?: string }
export const edits: Record<string,Edit> = {
  'bram-take': {goal:'Lift a rock from the mine',note:'take("mine") tells the arm where to pick up a rock. Try it below.'},
  'bram-feed': {goal:'Put the rock in the furnace',note:'Each Run starts at the top. After the pickup, add put("furnace").'},
  'bram-cart': {goal:'Carry the first ingot to Bram’s cart',note:'Use take("furnace"), then put("cart"). If it is still heating, Run again.'},
  'bram-smelt': {goal:'Give the two furnace moves the name smelt',anchor:/^\s*take\(["']mine/,note:'Group the two marked lines inside function smelt() { … }. Call smelt() below it.'},
  'bram-ship': {goal:'Give loading the cart the name ship',anchor:/^\s*take\(["']furnace/,note:'Group these cart moves inside function ship() { … }. Call ship() below it.'},
  'bram-loop': {goal:'Let the clock fill Bram’s cart with three ingots',anchor:/^\s*smelt\(\)/,note:'New idea: onTick. The workshop calls this function by itself, again and again.\nMove your calls inside it and press Deploy instead of Run.'},
  'harrow-tab': {goal:'Reply to Mrs Harrow and keep the shed open',anchor:/^import /,note:'Add replyLater to the import and call replyLater() under it to answer the letter.'},
  'elsie-press': {goal:'Buy a press for Elsie’s oven grate',anchor:/^import /,note:'Add buy to the import. A call to buy("press") here runs once when you Deploy.'},
  'elsie-stamp': {goal:'Feed the first ingot into Elsie’s press',anchor:/^function ship/,note:'Name the furnace pickup and press drop stamp(). Call it from the clock.'},
  'elsie-load': {goal:'Load the first plate into the cart',anchor:/^function stamp/,note:'At the end of stamp, take from "press" and put the plate in "cart".'},
  'elsie-grate': {goal:'Send Elsie enough plates for her grate',anchor:/^function stamp/,note:'Move the two cart lines into ship(). Call ship after stamp on the clock.'},
  'vein-sample': {goal:'Read the name of a rock from the mixed vein',anchor:/^\s*take\(["']mine/,note:'Save the result of take("mine") in a variable named rock. Print it with console.log(rock).'},
  'vein-furnace': {goal:'Set out a second furnace for copper',anchor:/^buy\(/,note:'Buy a second furnace named "copper", beside your other purchases.'},
  'vein-clear': {goal:'Move the stray copper into its own furnace',anchor:/^export function onTick/,note:'Before the clock starts, take from "furnace" and put the stray rock in "copper".'},
  'vein-sort': {goal:'Send each ore to its matching furnace',anchor:/^\s*console\.log\(rock/,note:'Use if (rock === "copper-ore") for copper. Use else for the ordinary rock.'},
  'tomas-cutter': {goal:'Buy a cutter for the lamp wire',anchor:/^buy\(/,note:'Add buy("cutter") beside the other purchases.'},
  'tomas-draw': {goal:'Feed a copper ingot into the cutter',anchor:/^function stamp/,note:'Add two moves at the end of stamp: take from "copper", then put into "cutter".'},
  'tomas-collect': {goal:'Bring a coil of wire to Tomas',anchor:/^function ship/,note:'At the end of ship, take from "cutter" and put into "cart".'},
  'tomas-lamps': {goal:'Send five coils to light Lamp Street',anchor:/^function stamp/,note:'Move the two wire moves into cutWire(). Call it between stamp and ship.'},
  'heat-inspect': {goal:'Find out why the iron furnace stopped',anchor:/^function smelt/,note:'Add look to the import. Read look("furnace").status here and print the value.'},
  'heat-restart': {goal:'Restart the broken iron furnace',anchor:/^\s*const status/,note:'Add repair to the import. If the status is "broken", call repair("furnace").'},
  'heat-rounds': {goal:'Check both furnace doors and repair the broken one',anchor:/^\s*if \(look/,note:'Loop over ["furnace", "copper"] as const. Check and repair the current oven.'},
  'heat-crew': {goal:'Give repairs their own turn on the clock',anchor:/^\s*for \(/,note:'Move this loop into fixBroken(). Call it first inside onTick.'},
  'wen-move': {goal:'Move an ingot using two named places',anchor:/^function stamp/,note:'Define move(from: Place, to: Place) above stamp. Take from the first place and put into the second.'},
  'wen-cutter': {goal:'Buy a second cutter for gears',anchor:/^buy\(/,note:'Buy another cutter and give it the name "gears".'},
  'wen-gears': {goal:'Feed two plates to the gear cutter',anchor:/^function ship/,note:'In ship, send plates to "gears" with move("press", "gears").'},
  'wen-wheel': {goal:'Deliver three gears to turn the mill wheel',anchor:/^function ship/,note:'Add move("gears", "cart") at the end of ship to collect the finished gears.'},
  'orders-share': {goal:'Fill both the plate order and the gear order',anchor:/^\s*move\(["']press/,note:'Read look("cart").wanted. Send plates to the cart while it wants them, then to "gears".'},
  'mayor-tools': {goal:'Make a toolbox file for the bridge crew',anchor:/^function /,note:'Move your helpers to tools.ts with their import. Export them there and import them here.'},
  'bridge-jig': {goal:'Buy an assembler for the bridge crew',anchor:/^buy\(/,note:'Add buy("assembler") beside the other purchases in main.ts.'},
  'bridge-fit': {goal:'Fit a plate and wire together in the assembler',file:'tools.ts',anchor:/^(export )?function ship/,note:'Inside ship, read look("assembler").inside. Move in the missing plate and wire.'},
  'bridge-span': {goal:'Deliver six brackets to finish the bridge',file:'tools.ts',anchor:/^(export )?function ship/,note:'Add move("assembler", "cart") inside ship to load the finished brackets.'},
  'harrow-deed': {goal:'Pay the family tab and take the deed',anchor:/^import /,note:'Add payBalance to the workshop import and call payBalance() below it to pay the bank.'},
}
function comments(note: string) { return note.split('\n').map(line=>'// '+line) }
const authored = new Set(Object.values(edits).flatMap(e=>comments(e.note)))
export function workshopStarter(id: string, previous: Files): Starter {
  const edit = edits[id]
  const files = Object.fromEntries(Object.entries(previous).map(([path,code])=>[path,
    code.split('\n').filter(line=>!authored.has(line.trim())).join('\n')]))
  const file = edit.file && files[edit.file] !== undefined ? edit.file : 'main.ts'
  const lines = (files[file] ?? starter).trimEnd().split('\n')
  let pos = edit.anchor ? lines.findIndex(line=>edit.anchor!.test(line)) : -1
  if (pos < 0) pos = lines.length
  const indent = lines[pos]?.match(/^\s*/)?.[0] ?? ''
  const note = comments(edit.note).map(line=>indent+line)
  lines.splice(pos,0,...note)
  if (pos+note.length===lines.length) lines.push('')
  if (id==='bram-loop' && !lines.some(l=>/^export function onTick\(/.test(l)))
    lines.push('','export function onTick() {','}')
  files[file]=lines.join('\n')
  return {files,edit:{file,line:pos+note.length+1}}
}
