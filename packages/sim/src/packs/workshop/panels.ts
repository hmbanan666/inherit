import type { Campaign } from './model'
import type { Panel } from '../../framework/pack'
import { debtRemaining } from './town'
export const panels: Panel<Campaign>[] = [
  {id:'factory',label:'Shed',placement:'nav',rows:c=>c.world.machines.map(m=>({id:m.id,label:m.id,value:m.status}))},
  {id:'town',label:'Town',placement:'nav',reveal:'section.town',rows:c=>c.town.changes.map(m=>({id:m.buildingId,label:m.buildingId,value:m.text}))},
  {id:'inbox',label:'Inbox',placement:'nav',reveal:'letter.tab',rows:c=>c.progress.messages.filter(m=>c.lesson.released.some(r=>r.kind==='letter'&&r.id===m.id)).map(m=>({id:m.id,label:m.title,value:m.body}))},
  {id:'orders',label:'Orders',placement:'nav',reveal:'section.orders',rows:c=>c.economy.orders.map(o=>({id:o.id,label:o.customer,value:o.status}))},
  {id:'coins',label:'Coins',placement:'panel',reveal:'coins',rows:c=>[{id:'balance',label:'Coins',value:String(c.economy.money)}]},
  {id:'debt',label:'Debt',placement:'panel',reveal:'debt',rows:c=>[{id:'debt',label:'Debt',value:String(debtRemaining(c))}]},
]
export const releasedIds = (c: Campaign) => c.lesson.released.map(r=>'id' in r ? r.kind+'.'+r.id : r.kind)
