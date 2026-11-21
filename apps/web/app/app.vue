<script setup lang="ts">
import { Activity, ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, ClipboardList, Code2, Coins, Cpu, Factory, FileCode2, FlaskConical, Hammer, Mail, PanelRightClose, PanelRightOpen, Pause, Play, Radio, Send, Settings2, Star, Target, Terminal, TriangleAlert, X } from '@lucide/vue'
import { OBJECTIVES, objectiveTrack, questStatus, type MachineKind } from '@inherit/sim'
import { provideGame } from './lib/useGame'
import ConsolePanel from './components/ConsolePanel.vue'
import TestsPanel from './components/TestsPanel.vue'
import MetricsPanel from './components/MetricsPanel.vue'
import SnapshotsPanel from './components/SnapshotsPanel.vue'
import DriversPanel from './components/DriversPanel.vue'

const g=provideGame()
const {campaign,activeFile,files,paused,speed,cpu,error,dirty,ready,saved,selected,surface}=g
const track=computed(()=>objectiveTrack(campaign.value)), objective=computed(()=>track.value.active)
const completed=computed(()=>campaign.value.progress.completedObjectives)
const progress=computed(()=>track.value.progress)
const unread=computed(()=>campaign.value.progress.messages.filter(m=>m.unread).length)
const failed=computed(()=>questStatus(campaign.value)?.state==='failed')
const ids=computed(()=>campaign.value.world.machines.map(m=>m.id))
const stationKey=computed(()=>ids.value.join('/'))
const stableIds=computed(()=>stationKey.value.split('/'))
const editor=ref<{revealLine?:(file:string,line:number)=>void}>(), editorReady=ref(false)
const tab=ref<'controller'|'api'>('controller'), dock=ref(true), dockWidth=ref(36)
const panels={Console:ConsolePanel,Tests:TestsPanel,Metrics:MetricsPanel,Snapshots:SnapshotsPanel,Drivers:DriversPanel}
const panel=ref<keyof typeof panels|undefined>('Console')
const menu=ref<''|'history'|'settings'>(''), confirmNew=ref(false)
const drawer=ref<'Orders'|'Research'|'Shop'|'Inbox'>()
const buttons={Shop:Hammer,Orders:ClipboardList,Research:FlaskConical,Inbox:Mail}
const placing=ref<MachineKind>(), hints=ref(false), toast=ref(''), stamp=ref<typeof OBJECTIVES[number]>()
let toastTimer:ReturnType<typeof setTimeout>, stampTimer:ReturnType<typeof setTimeout>, moneyFrame=0
const money=ref(campaign.value.economy.money)
function notify(text:string) {
  toast.value=text
  clearTimeout(toastTimer)
  toastTimer=setTimeout(()=>toast.value='',4200)
}
watch(()=>campaign.value.economy.money,(value)=>{
  cancelAnimationFrame(moneyFrame)
  const start=performance.now(), from=money.value
  function count(now:number){
    const p=Math.min(1,(now-start)/360)
    money.value=Math.round(from+(value-from)*(1-(1-p)**3))
    if(p<1) moneyFrame=requestAnimationFrame(count)
  }
  moneyFrame=requestAnimationFrame(count)
})
watch(()=>completed.value.length,(n,last)=>{
  if(n<=last||!g.metrics.value.length) return
  stamp.value=OBJECTIVES.find(o=>o.id===completed.value.at(-1))
  clearTimeout(stampTimer);stampTimer=setTimeout(()=>stamp.value=undefined,3500)
  hints.value=false
})
watch(()=>campaign.value.progress.messages.length,(n,last)=>{
  if(n>last&&g.metrics.value.length) notify(campaign.value.progress.messages.at(-1)!.title+' · Inbox')
})
watch(g.notice,msg=>{if(msg){notify(msg);g.notice.value=''}})
watch(g.navigation,async({file,line})=>{
  dock.value=true;tab.value='controller'
  await nextTick()
  if(editor.value?.revealLine) editor.value.revealLine(file,line)
  else if(editorReady.value){
    // The single-file editor predates revealLine. Both use the same Monaco instance.
    const monaco=await import('monaco-editor/esm/vs/editor/editor.api')
    const live=monaco.editor.getEditors().find(e=>e.getDomNode()?.closest('.editor-host'))
    if(live){live.setPosition({lineNumber:line,column:1});live.revealLineInCenterIfOutsideViewport(line)}
  }
})
function toggleDrawer(name: keyof typeof buttons){
  drawer.value=drawer.value===name?undefined:name;menu.value='';placing.value=undefined
}
function build(kind:MachineKind){placing.value=kind;drawer.value=undefined}
function hotkey(e:KeyboardEvent) {
  if((e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==='s'||e.key==='Enter')) {e.preventDefault();g.deploy()}
  if(e.key==='Escape'){menu.value='';drawer.value=undefined;confirmNew.value=false;placing.value=undefined;selected.value='';hints.value=false}
}
function resize(e:PointerEvent){
  const el=e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  const change=(event:PointerEvent)=>dockWidth.value=Math.max(25,Math.min(62,100*(1-event.clientX/window.innerWidth)))
  const stop=()=>{el.removeEventListener('pointermove',change);el.removeEventListener('lostpointercapture',stop)}
  el.addEventListener('pointermove',change);el.addEventListener('lostpointercapture',stop)
}
function reset() {confirmNew.value=false;menu.value='';drawer.value=undefined;stamp.value=undefined;hints.value=false;placing.value=undefined;g.newGame()}
function openError(){
  const pos=/^(.+\.ts):(\d+)/.exec(error.value)
  if(pos) g.openFile(pos[1]!,Number(pos[2]))
}
onMounted(()=>window.addEventListener('keydown',hotkey,true))
onBeforeUnmount(()=>{window.removeEventListener('keydown',hotkey,true);cancelAnimationFrame(moneyFrame);clearTimeout(stampTimer);clearTimeout(toastTimer)})
useHead({title:()=> (objective.value?.title??'Free play')+' · inherit'})
</script>
<template>
  <div class="workshop" :style="{'--dock-width':dockWidth+'%'}">
    <header class="hud">
      <div class="brand"><img src="/mark.svg" alt=""/>inherit<span>.</span></div>
      <div class="wallet" title="Workshop money"><Coins/><b>{{money.toLocaleString()}}</b></div>
      <div class="rep" title="Reputation"><Star/><b>{{campaign.economy.reputation}}</b><small>REP</small></div>
      <div class="clock"><span class="tick">TICK <b>{{String(campaign.world.tick).padStart(5,'0')}}</b></span>
        <div class="speeds"><button :aria-label="paused?'Resume':'Pause'" :aria-pressed="paused" @click="paused=!paused"><Play v-if="paused"/><Pause v-else/></button>
        <button v-for="s in [1,2,4,8]" :key="s" :aria-pressed="!paused&&speed===s" @click="speed=s;paused=false">{{s}}×</button></div>
      </div>
      <div class="cpu" :title="cpu.used+' / '+cpu.budget+' operations'"><Cpu/><span>CPU <b>{{cpu.used}}/{{cpu.budget}}</b><i><i :style="{width:Math.min(100,100*cpu.used/cpu.budget)+'%'}"></i></i></span></div>
      <div class="deploy-group"><button class="deploy" :disabled="!ready&&!error" @click="g.deploy"><Play fill="currentColor"/>{{error?'Run':'Deploy'}}</button><button class="revisions" aria-label="Deploy history" @click="menu=menu==='history'?'':'history'"><ChevronDown/></button>
        <aside v-if="menu==='history'" class="hud-menu"><h3>Deploy history</h3><button v-for="r in [...campaign.project.history].reverse()" :key="r.id" @click="g.rollback(r.id);menu=''">Restore #{{r.id}} <small>tick {{r.tick}}</small></button></aside>
      </div>
      <div class="settings"><button aria-label="Settings" @click="menu=menu==='settings'?'':'settings'"><Settings2/></button><aside v-if="menu==='settings'" class="hud-menu"><button @click="confirmNew=true;menu=''">New game</button></aside></div>
    </header>
    <main class="desk" :class="{collapsed:!dock}">
      <section class="world-shell">
        <header class="world-title"><div><span class="eyebrow"><Factory/> Factory floor</span><h1>Uncle’s shed</h1></div>
          <div class="live" :class="{off:paused||!!error}"><i></i>{{!ready&&!error?'Starting':paused?'Paused':error?'Controller offline':'Live'}}</div>
          <button v-if="!dock" aria-label="Open editor" @click="dock=true"><PanelRightOpen/></button>
        </header>
        <section class="objective" aria-label="Objective track">
          <div class="objective-icon"><Target/></div>
          <div class="goal-body"><small class="eyebrow">Objective {{Math.min(completed.length+1,OBJECTIVES.length)}} / {{OBJECTIVES.length}}</small>
            <h2>{{objective?.title??'Free play'}}</h2>
            <div class="next"><ArrowRight/> {{track.next?'Next · '+track.next.title:'Keep the order board moving.'}}</div>
          </div>
          <div class="goal-aside"><button class="hint" :aria-expanded="hints" @click="hints=!hints"><CircleHelp/> Hint</button>
            <b>{{progress.current}} / {{progress.target}}</b>
          </div><div class="goal-progress"><i :style="{width:Math.min(100,100*progress.current/Math.max(1,progress.target))+'%'}"></i></div>
          <div v-if="hints&&objective" class="hint-note"><b>{{objective.why}}</b><p v-for="h in objective.hints" :key="h">{{h}}</p><button v-if="failed" @click="g.act({kind:'retry'})">Retry objective</button></div>
        </section>
        <div class="map-frame">
          <LazyFactoryFloor :placing="placing" @placed="placing=undefined"/>
          <Transition name="stamp"><div v-if="stamp" :key="stamp.id" class="receipt" role="status"><span class="stamp-mark"><Check/></span><div><small>Objective complete</small><b>{{stamp.title}}</b><span>+{{stamp.reward.money}} coins · +{{stamp.reward.researchPoints}} RP</span></div><i v-for="i in 12" :key="i" :style="{'--i':i}"></i></div></Transition>
          <WorkshopDrawer v-if="drawer" :name="drawer" @close="drawer=undefined" @build="build"/>
        </div>
        <nav class="work-tools" aria-label="Workshop"><button v-for="(icon,name) in buttons" :key="name" :aria-pressed="drawer===name" @click="toggleDrawer(name)"><component :is="icon"/>{{name}}<i v-if="name==='Inbox'&&unread" class="dot"></i></button></nav>
      </section>
      <div v-show="dock" class="resizer" role="separator" tabindex="0" aria-label="Resize editor" aria-orientation="vertical" @pointerdown="resize" @keydown.left.prevent="dockWidth=Math.min(62,dockWidth+2)" @keydown.right.prevent="dockWidth=Math.max(25,dockWidth-2)"></div>
      <section v-show="dock" class="editor-dock" aria-label="Editor dock">
        <header class="dock-header"><span class="eyebrow"><Code2/> Code workshop</span><button aria-label="Collapse editor" @click="dock=false"><PanelRightClose/></button></header>
        <FileTree v-if="surface.multiFile"/>
        <div class="file-tabs"><button :aria-pressed="tab==='controller'" @click="tab='controller'"><FileCode2/>{{activeFile}}<i v-if="dirty" class="dot"></i></button><button :aria-pressed="tab==='api'" @click="tab='api'"><BookOpen/> api.d.ts</button></div>
        <div v-if="error" class="runtime" role="alert"><TriangleAlert/><button @click="openError">{{error}}</button></div>
        <div class="editor-host" v-show="tab==='controller'"><LazyCodeEditor ref="editor" :code="files[activeFile]??''" :selected="selected" :error="error" :ids="stableIds" tab="controller" @edit="g.setFile(activeFile,$event)" @ready="editorReady=true"/></div>
        <pre v-if="tab==='api'" class="api-source">{{g.api.value}}</pre>
        <div class="editor-foot"><span><i class="dot" :class="{clean:!dirty}"></i>{{dirty?'Working copy':'Deployed'}}</span><small>TypeScript</small></div>
        <nav class="panel-tabs" aria-label="Editor tools"><button v-for="(_,name) in panels" :key="name" :aria-pressed="name===panel" @click="panel=panel===name?undefined:name">{{name}}</button></nav>
        <div v-if="panel" class="panel-slot"><component :is="panels[panel]"/></div>
      </section>
    </main>
    <footer class="statusbar"><span><Radio/> {{saved?'Saved locally':'Save unavailable'}}</span><span>{{campaign.world.machines.length}} machines <i>/</i> {{campaign.world.belts.length}} belts</span></footer>
    <div v-if="toast" class="toast" role="status"><Mail/>{{toast}}<button aria-label="Dismiss notification" @click="toast=''"><X/></button></div>
    <div v-if="confirmNew" class="scrim"><section class="confirm" role="dialog" aria-label="New game"><h2>Start a new factory?</h2><p>This replaces your saved floor, code and progress.</p><button @click="confirmNew=false">Keep playing</button><button class="gold" @click="reset">New game</button></section></div>
  </div>
</template>
