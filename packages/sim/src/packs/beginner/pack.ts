import { definePack } from '../../framework/pack'
import manifest from './manifest'
import { lessons } from './lessons'
import { initialWorld, decodeWorld, villageAPI, type Village } from './world'
import type { PlayerAPI } from './player'
const introduced: (keyof PlayerAPI)[][] = [
  ['say'], ['plant'], ['paintSign'], ['hangFlag'], ['fillBasket'], ['ringBell','openShutters'], [], ['hangRibbons'],
  ['isRaining','openCanopy','foldCanopy'], ['basketCount','setPicnic'], ['lightLamp'], ['greet'], ['openStall','hangBanner'],
]
export default definePack<Village,PlayerAPI>({
  manifest, lessons, version: 1, initialWorld, decodeWorld, exposure: 'globals', retry: 'entry',
  entities: [
    {id:'villager',label:'Mila',rows:w=>[{id:'speech',label:'Mila',value:w.bubble}]},
    {id:'beds',label:'Flower beds',rows:w=>[{id:'gate',label:'Gate',value:String(w.gateFlowers)},{id:'house',label:'House',value:String(w.houseFlowers)}]},
    {id:'path',label:'Path lamps',rows:w=>w.lamps.map(n=>({id:String(n),label:'Lamp '+n,value:'Lit'}))},
    {id:'fair',label:'Fair stalls',rows:w=>w.stalls.map(name=>({id:name,label:name,value:'Open'}))},
  ],
  panels: [], available: (_,id) => introduced.slice(0,lessons.findIndex(l=>l.id===id)+1).flat(),
  beginAttempt(world) {return {api:villageAPI(world),finish() {}}},
})
