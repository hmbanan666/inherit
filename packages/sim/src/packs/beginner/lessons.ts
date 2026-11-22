import { mainFile, type Colour, type Evidence, type Lesson } from '../../framework/pack'
import type { Village } from './world'
import { addsCounts, boundArgument, branchCalls, comparesCount, loopCalls, parameterFeeds, reassignedFlag } from './syntax'

type Seen = Evidence<Village>
type Result = boolean | Colour
interface Page {
  id: string; goal: string; idea: string
  starter: string; line: number; answer: string
  hints: [string,string,string]
  check: string; passes(e: Seen): Result
  effect: [id:string,text:string,description:string]
  reaction: string; did: string
  enter?(w: Village): void
}
const calls = (e: Seen,name: string) => e.calls.filter(c => c.name === name)
const guests = ['Mira','Pip','Ada']
const pages: Page[] = [
  {
    id:'hello', goal:'Say hello to Mila', idea:'A call gives a function a job. Quotes hold the words.',
    starter:'// say("...") makes Mila talk.\n// Type say("Hello!") on the blank line below.\n', line:3, answer:'say("Hello!")',
    hints:['What would you like Mila to say?', 'Put the greeting inside the quotes in say("...").', 'say("Hello!")'],
    check:'Mila says hello', passes:e=>e.world.bubble==='Hello!' && calls(e,'say').length>0,
    effect:['speech','Hello!','Mila waves and speaks.'], reaction:'Good morning to you too!', did:'You gave Mila her first words.',
  }, {
    id:'flowers', goal:'Plant three flowers by the gate', idea:'A number tells a function how many.',
    starter:'// plant(1) plants one flower. Use a number without quotes.\n// Plant three flowers here.\n', line:3, answer:'plant(3)',
    hints:['Give the gate a little colour.', 'Use plant with the number of flowers.', 'plant(3)'],
    check:'Three flowers at the gate', passes:e=>e.world.gateFlowers===3 && calls(e,'plant').length>0,
    effect:['gate-bed','3 flowers','Three blooms open along the fence.'],reaction:'My gate looks alive!',did:'You planted three flowers with one call.',
  }, {
    id:'house-sign',goal:'Put your name on the house sign',idea:'A variable gives a value a name you can use again.',
    starter:'let nameOnSign = "Mira"\n// You can change Mira to your name.\n// Give paintSign(...) the variable nameOnSign, without quotes.\n',line:4,
    answer:'let nameOnSign = "Mira"\npaintSign(nameOnSign)',
    hints:['Name the cottage after yourself.', 'Use the variable between the parentheses.', 'paintSign(nameOnSign)'],
    check:'Your name is on the sign',passes:e=>!!e.world.sign && boundArgument(e.files,'paintSign') && calls(e,'paintSign').length>0,
    effect:['house-sign','Sign painted','The wooden sign carries your name.'],reaction:'Now the post can find us.',did:'You painted a name from your variable.',
  }, {
    id:'flag',goal:'Change the welcome flag from blue to gold',idea:'A let variable can change. A const keeps its first value.',
    starter:'const firstColour = "blue"\nlet flag = firstColour\n// let lets you change flag. Write flag = "gold" below.\n\nhangFlag(flag)',line:4,
    answer:'const firstColour = "blue"\nlet flag = firstColour\nflag = "gold"\nhangFlag(flag)',
    hints:['Keep the first colour in its own place.', 'Assign a new colour to flag before hanging it.', 'flag = "gold"'],
    check:'A gold flag hangs by the sign',passes:e=>e.world.flag==='gold' && reassignedFlag(e.files),
    effect:['flag','Gold flag','A golden flag rises beside the cottage.'],reaction:'A little piece of sunshine!',did:'You changed a variable before hanging the flag.',
  }, {
    id:'apple-basket',goal:'Gather the apples from both trees into the basket',idea:'An expression combines values to make a new value.',
    starter:'const leftTree = 2\nconst rightTree = 3\n// Use + to add rightTree to leftTree on this line.\nconst total = leftTree\nfillBasket(total)',line:4,
    answer:'const leftTree = 2\nconst rightTree = 3\nconst total = leftTree + rightTree\nfillBasket(total)',
    hints:['Count both trees together.', 'Put + between the two names.', 'const total = leftTree + rightTree'],
    check:'Five apples in the basket',passes:e=>e.world.basket===5 && addsCounts(e.files) && calls(e,'fillBasket').length>0,
    effect:['basket','5 apples','Apples move from the trees into the basket.'],reaction:'Just enough to share.',did:'You added two harvests together.',
  }, {
    id:'morning',goal:'Ring the bell and open the shutters together',idea:'A function gives a group of calls one name.',
    starter:'function morning() {\n  // Add ringBell() here so it rings before the shutters open.\n  \n  openShutters()\n}\n// Call morning() here to do both jobs.\n',line:3,
    answer:'function morning() {\n  ringBell()\n  openShutters()\n}\nmorning()',
    hints:['First name the jobs. Then ask for them.', 'Put both calls inside morning and call it below the closing brace.', 'function morning() {\n  ringBell()\n  openShutters()\n}\nmorning()'],
    check:'The bell rings and the shutters open',passes:e=>e.world.shutters && e.calls.some((c,i)=>c.name==='ringBell' && c.within==='morning' && e.calls[i+1]?.name==='openShutters' && e.calls[i+1].within==='morning'),
    effect:['shutters','Shutters open','The brass bell swings and the cottage windows open.'],reaction:'The whole house is awake.',did:'You named a morning routine and ran it.',
  }, {
    id:'flower-row',goal:'Plant four flowers along the cottage',idea:'A parameter names the value supplied by a caller.',
    starter:'function plantRow(count: number) {\n  // count is the number given to plantRow. Give it to plant(...).\n  \n}\nplantRow(4)',line:3,
    answer:'function plantRow(count: number) {\n  plant(count)\n}\nplantRow(4)',
    hints:['The caller chooses how many flowers.', 'Pass the parameter to plant.', 'plant(count)'],
    enter:w=>{w.bed='house'},check:'Four flowers along the cottage',passes:e=>e.world.houseFlowers===4 && parameterFeeds(e.files,'plantRow','plant') && calls(e,'plant').some(c=>c.within==='plantRow'),
    effect:['house-bed','4 flowers','A second row blooms underneath the windows.'],reaction:'A window box for everyone.',did:'You passed a number into your own function.',
  }, {
    id:'ribbons',goal:'Hang two ribbons for each of three windows',idea:'Return sends a value back to the caller.',
    starter:'function ribbonsFor(windows: number) {\n  // Each window needs two ribbons. Use * 2 in the return line.\n  return windows\n}\nconst ribbons = ribbonsFor(3)\nhangRibbons(ribbons)',line:3,
    answer:'function ribbonsFor(windows: number) {\n  return windows * 2\n}\nconst ribbons = ribbonsFor(3)\nhangRibbons(ribbons)',
    hints:['Work out how many ribbons to send back.', 'Multiply the window count by two.', 'return windows * 2'],
    check:'Six ribbons hang at the windows',passes:e=>e.world.ribbons===6 && boundArgument(e.files,'hangRibbons','ribbonsFor'),
    effect:['ribbons','6 ribbons','Ribbon pairs unfurl under the windows.'],reaction:'They dance in the breeze!',did:'You stored a returned number and used it.',
  }, {
    id:'weather',goal:'Set out a shelter when it rains',idea:'An if chooses a path using a true or false value.',
    starter:'const raining = isRaining()\nif (raining) {\n  // This block runs in the rain. Put openCanopy() here.\n  \n} else {\n  foldCanopy()\n}',line:4,
    answer:'const raining = isRaining()\nif (raining) {\n  openCanopy()\n} else {\n  foldCanopy()\n}',
    hints:['Check the sky before choosing.', 'Open the shelter in the first block.', 'openCanopy()'],
    enter:w=>{w.raining=true},check:'The canopy suits the weather',passes:e=>calls(e,'isRaining').length>0 && branchCalls(e.files,'openCanopy','foldCanopy') && e.world.canopy===e.world.raining && calls(e,e.world.raining?'openCanopy':'foldCanopy').length>0,
    effect:['canopy','Canopy open','A striped canopy keeps the rain off the path.'],reaction:'Dry feet for our guests!',did:'You read the weather and chose a shelter.',
  }, {
    id:'picnic',goal:'Set the picnic table when there are enough apples',idea:'A comparison turns two numbers into true or false.',
    starter:'const apples = basketCount()\n// >= means at least. Replace false with apples >= 3.\nif (false) {\n  setPicnic()\n}',line:3,
    answer:'const apples = basketCount()\nif (apples >= 3) {\n  setPicnic()\n}',
    hints:['Three guests need at least three apples.', 'Compare the basket count with 3.', 'if (apples >= 3) {'],
    enter:w=>{w.raining=false},check:'There is a picnic when three can eat',passes:e=>calls(e,'basketCount').length>0 && comparesCount(e.files) && e.world.picnic===(e.world.basket>=3),
    effect:['picnic','Table set','A checked cloth and three plates dress the table.'],reaction:'Come share these apples.',did:'You compared the apple count with three.',
  }, {
    id:'path-lamps',goal:'Light all five lamps along the path',idea:'A counted loop runs the same line with a new number each turn.',
    starter:'// Start at lamp 1. lamp++ moves to the next lamp each turn.\n// Change the stopping number after <= from 1 to 5.\nfor (let lamp = 1; lamp <= 1; lamp++) {\n  lightLamp(lamp)\n}',line:3,
    answer:'for (let lamp = 1; lamp <= 5; lamp++) {\n  lightLamp(lamp)\n}',
    hints:['Use one turn for each lamp.', 'Keep going while the number is at most five.', 'for (let lamp = 1; lamp <= 5; lamp++) {'],
    check:'Five path lamps light in order',passes:e=>loopCalls(e.files,'lightLamp') && calls(e,'lightLamp').map(c=>c.args[0]).join(',')==='1,2,3,4,5' ? 'green' : e.world.lamps.length?'amber':'red',
    effect:['lamp-5','Lamp 5 lit','Five pools of light appear along the path in turn.'],reaction:'I can see the way home.',did:'Your loop visited all five lamps.',
  }, {
    id:'neighbours',goal:'Greet all three neighbours on the path',idea:'A list holds several values. A loop takes one at a time.',
    starter:'const neighbours = ["Mira", "Pip", "Ada"]\nfor (const neighbour of neighbours) {\n  // neighbour holds one name at a time. Give it to greet(...).\n  \n}',line:4,
    answer:'const neighbours = ["Mira", "Pip", "Ada"]\nfor (const neighbour of neighbours) {\n  greet(neighbour)\n}',
    hints:['Each name gets one turn.', 'Use the current name inside the loop.', 'greet(neighbour)'],
    check:'Three neighbours arrive in order',passes:e=>loopCalls(e.files,'greet',true) && calls(e,'greet').map(c=>c.args[0]).join()===guests.join()?'green':e.world.neighbours.length?'amber':'red',
    effect:['guests','3 neighbours','Three neighbours join Mila beside the path.'],reaction:'Everyone made it!',did:'You greeted each name in an array.',
  }, {
    id:'village-fair',goal:'Open three stalls and hang Mira’s welcome banner',idea:'A function, a loop and a choice can work together.',
    starter:'function welcome(guest: string) {\n  openStall(guest)\n  // If guest === "Mira", call hangBanner() inside the if.\n  \n}\nconst guests = ["Mira", "Pip", "Ada"]\n// Loop over guests. Call welcome(guest) on each turn.\n',line:4,
    answer:'function welcome(guest: string) {\n  openStall(guest)\n  if (guest === "Mira") hangBanner()\n}\nconst guests = ["Mira", "Pip", "Ada"]\nfor (const guest of guests) {\n  welcome(guest)\n}',
    hints:['Each guest needs a stall. Only Mira brings the banner.', 'Use a choice inside welcome and a loop below it.', 'if (guest === "Mira") hangBanner()\n\nfor (const guest of guests) {\n  welcome(guest)\n}'],
    check:'Three stalls are open',passes:e=>e.world.stalls.length===3 && loopCalls(e.files,'welcome',true) && parameterFeeds(e.files,'welcome','openStall') && calls(e,'openStall').every(c=>c.within==='welcome'),
    effect:['fair','Fair open','The stalls open in sequence under the welcome banner.'],reaction:'We made a fair together!',did:'You opened a stall for every neighbour and raised Mira’s banner.',
  },
]
function status(result: Result): Colour {return typeof result==='boolean' ? result?'green':'red' : result}
export const lessons: Lesson<Village>[] = pages.map(p => ({
  id:p.id, goal:p.goal, idea:p.idea, mode:'run', starter:()=>mainFile(p.starter,p.line),
  hints:p.hints, checks:[{id:p.id,label:p.check,evaluate:e=>status(p.passes(e))}],
  referenceSolution:{'main.ts':p.answer}, visibleEffect:{testId:p.effect[0],text:p.effect[1],description:p.effect[2]},
  solved:{reaction:p.reaction,did:p.did,idea:p.idea},enter:p.enter,
}))
lessons.at(-1)!.checks = [...lessons.at(-1)!.checks,{
  id:'banner',label:'Mira hung the welcome banner',evaluate:e=>{
    const i = e.calls.findIndex(c=>c.name==='hangBanner')
    return status(e.world.banner && calls(e,'hangBanner').length===1 && i>0 && e.calls[i-1].name==='openStall' &&
      e.calls[i-1].args[0]==='Mira' && branchCalls(e.files,'hangBanner'))
  },
}]
