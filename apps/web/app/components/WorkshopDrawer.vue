<script setup lang="ts">
import {
  Coins,
  Check,
  X,
  LockKeyhole,
  GripVertical,
  Mail,
  BookOpen,
  FlaskConical,
  ShoppingBasket,
  ClipboardList,
} from '@lucide/vue'
import { RESEARCH, MACHINES, PRICES, MATERIALS, type MachineKind } from '@inherit/sim'
import { useGame } from '../lib/useGame'
import type { BuildGuide } from '../lib/buildGuide'
const drawerRoot = ref<HTMLElement>()
const props = defineProps<{ name: 'Orders' | 'Research' | 'Shop' | 'Inbox'; guide?: BuildGuide }>()
const emit = defineEmits<{ close: []; build: [MachineKind] }>()
const g = useGame(),
  { campaign, surface } = g
const economy = computed(() => campaign.value.economy)
const filter = ref('open'),
  message = ref('')
const orders = computed(() => economy.value.orders.filter((o) => o.status === filter.value))
const nodes = computed(() => [...RESEARCH].sort((a, b) => Number(locked(a)) - Number(locked(b))))
function locked(n: (typeof RESEARCH)[number]) {
  return !n.requires.every((id) => economy.value.research.includes(id))
}
function read(id: string) {
  message.value = message.value === id ? '' : id
  g.act({ kind: 'read', id })
}
const icons = { Orders: ClipboardList, Research: FlaskConical, Shop: ShoppingBasket, Inbox: Mail }
let press: { x: number; y: number; kind: MachineKind } | undefined
function startDrag(e: PointerEvent, kind: MachineKind) {
  if (e.button !== 0) return
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  press = { x: e.clientX, y: e.clientY, kind }
}
function drag(e: PointerEvent) {
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) {
    const kind = press.kind
    press = undefined
    emit('build', kind)
  }
}
watch(
  () => props.name,
  () => {
    filter.value = 'open'
    message.value = ''
  },
)
watch(
  () => [props.name, JSON.stringify(props.guide)],
  async () => {
    await nextTick()
    drawerRoot.value?.querySelector('.guide-pulse')?.scrollIntoView({ block: 'nearest' })
  },
  { immediate: true },
)
function accept(id: string) {
  g.act({ kind: 'accept', id })
  filter.value = 'accepted'
}
</script>
<template>
  <aside ref="drawerRoot" class="drawer" role="dialog" :aria-label="name === 'Orders' ? 'Order board' : name">
    <header>
      <div>
        <component :is="icons[name]" />
        <h2>{{ name === 'Orders' ? 'Order board' : name }}</h2>
      </div>
      <button aria-label="Close drawer" @click="emit('close')"><X /></button>
    </header>
    <div class="drawer-body">
      <template v-if="name === 'Orders'">
        <div class="filters">
          <button
            v-for="f in ['open', 'accepted', 'done', 'failed']"
            :key="f"
            :aria-pressed="filter === f"
            @click="filter = f"
          >
            {{ f }}
          </button>
        </div>
        <p v-if="!orders.length">No {{ filter }} orders.</p>
        <article v-for="o in orders" :key="o.id" class="ticket">
          <div class="ticket-top">
            <span class="avatar">{{
              o.customer
                .split(' ')
                .slice(0, 2)
                .map((s) => s[0])
                .join('')
            }}</span
            ><b>{{ o.customer }}</b
            ><span class="payout">+{{ o.pay }} <Coins /></span>
          </div>
          <p>{{ o.line }}</p>
          <div class="ticket-meta">
            <b v-for="(qty, k) in o.items" :key="k"
              >{{ o.filled[k] ?? 0 }}/{{ qty }} {{ MATERIALS[k].name }}{{ o.quality ? ' · good' : '' }}</b
            ><small
              >{{
                o.deadline !== undefined ? Math.max(0, o.deadline - campaign.world.tick) : o.duration
              }}
              ticks</small
            >
          </div>
          <button v-if="o.status === 'open'" class="action" @click="accept(o.id)">Accept order</button>
        </article>
      </template>
      <template v-else-if="name === 'Research'">
        <p class="payout">{{ economy.researchPoints }} research points</p>
        <article v-for="n in nodes" :key="n.id" class="research-row" :class="{ locked: locked(n) }">
          <div>
            <b>{{ n.title }}</b>
            <p>{{ n.description }}</p>
            <small v-if="locked(n)"
              >Needs {{ n.requires.map((id) => RESEARCH.find((r) => r.id === id)?.title).join(' + ') }}</small
            >
          </div>
          <button
            :class="{ 'guide-pulse': guide?.[0] === 'research' && guide[1] === n.id }"
            :aria-label="'Research ' + n.title"
            :disabled="locked(n) || economy.research.includes(n.id) || n.cost > economy.researchPoints"
            @click="g.act({ kind: 'research', id: n.id })"
          >
            <Check v-if="economy.research.includes(n.id)" /><LockKeyhole v-else-if="locked(n)" /><template
              v-else
              >{{ n.cost }} RP</template
            >
          </button>
        </article>
      </template>
      <template v-else-if="name === 'Shop'">
        <p>Drag equipment onto your floor.</p>
        <button
          v-for="kind in surface.machines"
          :key="kind"
          class="shop-item"
          :class="{ 'guide-pulse': (guide?.[0] === 'machine' || guide?.[0] === 'shop') && guide[1] === kind }"
          :aria-label="'Build ' + MACHINES[kind].name"
          :disabled="economy.money < PRICES.machines[kind]"
          @pointerdown="startDrag($event, kind)"
          @pointermove="drag"
          @pointercancel="press = undefined"
          @pointerup="press = undefined"
          @click="emit('build', kind)"
        >
          <MachineThumb :kind="kind" /><span
            ><b>{{ MACHINES[kind].name }}</b
            ><small>{{ PRICES.machines[kind] }} coins</small></span
          ><GripVertical />
        </button>
        <p>Connect an output to an input · {{ PRICES.beltPerTile }} coins per tile.</p>
        <button
          v-if="economy.research.includes('road') && !economy.road"
          class="action"
          :class="{ 'guide-pulse': guide?.[0] === 'road' }"
          @click="g.act({ kind: 'road' })"
        >
          Buy yard road · {{ PRICES.road }} coins
        </button>
      </template>
      <template v-else>
        <p v-if="!campaign.progress.messages.length">Uncle’s notebook is quiet.</p>
        <article v-for="m in [...campaign.progress.messages].reverse()" :key="m.id" class="letter">
          <button @click="read(m.id)">
            <component :is="m.kind === 'email' ? Mail : BookOpen" /><span
              ><small>{{ m.from }}</small
              ><b>{{ m.title }}</b></span
            ><i v-if="m.unread" class="dot"></i>
          </button>
          <p v-if="message === m.id">{{ m.body }}</p>
        </article>
      </template>
    </div>
  </aside>
</template>
