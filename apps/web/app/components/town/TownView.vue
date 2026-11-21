<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { Application } from 'pixi.js'
import { Coins, MapPin, Smile, MessageCircle, Footprints } from '@lucide/vue'
import { TownScene } from '../../lib/townScene'
import type { TownSnapshot, Townsperson } from '@inherit/sim'
import TownPortrait from './TownPortrait.vue'

const props = withDefaults(defineProps<{ snapshot: TownSnapshot; replay?: TownSnapshot['changes']; showDebt?: boolean }>(), { showDebt: true })
const town = computed(() => {
  if (props.showDebt) return props.snapshot
  return {
    ...props.snapshot,
    buildings: props.snapshot.buildings.map(b => b.id === 'bank' ? { ...b, label: undefined } : b),
    people: props.snapshot.people.map(p => p.id === 'harrow' ? { ...p, ask: undefined } : p),
  }
})
const host = ref<HTMLElement>()
const selection = defineModel<Townsperson['id']>('selection')
const unavailable = ref(false)
const person = computed(
  () =>
    town.value.people.find((p) => p.id === selection.value) ??
    town.value.people.find((p) => p.ask) ??
    town.value.people[0],
)
const readyBuilding = computed(() => town.value.buildings.find((b) => b.id === person.value?.buildingId))
const moodIcon = { happy: Smile, waiting: MessageCircle, gone: Footprints }
const amounts = computed(() =>
  Object.entries(person.value?.ask?.items ?? {}).map(([kind, amount]) => ({
    kind: kind.replaceAll('-', ' '),
    required: amount ?? 0,
    filled: person.value?.ask?.filled[kind] ?? 0,
  })),
)
let scene: TownScene | undefined
let disposed = false
onMounted(async () => {
  const app = new Application()
  try {
    await app.init({
      preference: 'canvas',
      width: 1000,
      height: 420,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      backgroundAlpha: 0,
    })
    if (disposed) {
      app.destroy(true)
      return
    }
    scene = new TownScene(
      app,
      host.value!,
      town.value,
      props.replay,
    )
  } catch {
    if (app.renderer) app.destroy(true, { children: true })
    unavailable.value = true
  }
})
watch(
  town,
  (snapshot) => scene?.update(snapshot),
)
onBeforeUnmount(() => {
  disposed = true
  scene?.destroy()
})
</script>

<template>
  <section class="town-view" aria-label="Kettlewick" :data-phase="town.phase">
    <header class="town-heading">
      <h2>Kettlewick</h2>
    </header>
    <div class="town-picture">
      <div
        ref="host"
        class="town-print"
        role="img"
        :aria-label="
          town.buildings.map((b) => b.name + ' ' + b.state + (b.label ? ', ' + b.label : '')).join('. ')
        "
      />
      <p v-if="unavailable" class="town-unavailable">
        Could not open the town illustration. Reload to retry.
      </p>

    </div>
    <div v-if="person" class="town-directory">
      <article class="town-voice">
        <div class="speaker">
          <TownPortrait :person="person" />
          <div>
            <strong>{{ person.name }}</strong
            ><span>{{ person.role }}</span>
          </div>
          <small :data-mood="person.mood"><component :is="moodIcon[person.mood]" />{{ person.mood }}</small>
        </div>
        <div class="town-bubble">
          <template v-if="person.ask">
            <strong>{{ person.ask.title }}</strong>
            <p>{{ person.ask.text }}</p>
            <div class="town-terms">
              <span v-for="a in amounts" :key="a.kind"
                ><b>{{ a.filled }}/{{ a.required }}</b> {{ a.kind }}</span
              >
            </div>
          </template>
          <template v-else-if="person.id === 'harrow' && readyBuilding?.label">
            <strong
              ><Coins /> {{ town.debt.owed ? town.debt.owed + ' coins owed' : 'Debt paid' }}</strong
            >
            <p>
              {{ town.debt.paid }} coins paid<span v-if="town.debt.next">
                · Next installment {{ town.debt.next.amount }} coins</span
              >
            </p>
          </template>
          <template v-else>
            <strong><MapPin /> {{ readyBuilding?.name }}</strong>
            <p>{{ readyBuilding?.label || readyBuilding?.state }}</p>
          </template>
        </div>
      </article>
      <nav class="town-roster" aria-label="Townspeople">
        <button
          v-for="p in town.people"
          :key="p.id"
          type="button"
          :aria-label="p.name + ', ' + p.role + ', ' + p.mood + (p.ask ? ', ' + p.ask.title : '')"
          :title="p.name + ' · ' + p.mood"
          :aria-pressed="person.id === p.id"
          @click="selection = p.id"
        >
          <TownPortrait :person="p" /><i v-if="p.ask" aria-hidden="true">!</i>
        </button>
      </nav>
    </div>
  </section>
</template>

<style scoped>
.town-view {
  width: 100%;
  container-type: inline-size;
  color: var(--text);
  border: 1px solid var(--line);
  background: var(--base);
  max-height: 100%;
  overflow: auto;
  border-radius: 8px;
}
.map-frame .town-view {
  display: grid;
  grid-template-rows: minmax(150px, 1fr) auto;
  height: 100%;
  border: 0;
  border-radius: 0;
}
.map-frame .town-heading {
  display: none;
}
.map-frame .town-picture {
  aspect-ratio: auto;
}
.town-heading {
  padding: 9px 20px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
}
.town-heading h2 {
  font:
    700 clamp(21px, 3cqw, 30px) / 1.2 Georgia,
    serif;
  letter-spacing: -1.2px;
}
.town-picture {
  position: relative;
  aspect-ratio: 1000/420;
  background: var(--panel);
  overflow: hidden;
}
.town-print {
  position: absolute;
  inset: 0;
}
.town-print :deep(canvas) {
  display: block;
}
.town-unavailable {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
}
.town-unavailable {
  margin: 0;
  padding: 7px 13px;
  border: 1px solid var(--accent-line);
  border-radius: 5px;
  background: var(--base);
  color: var(--gold);
  font-size: 13px;
  text-align: center;
}
.town-directory {
  display: flex;
  gap: 18px;
  align-items: center;
  padding: 14px 18px;
  border-top: 1px solid var(--line);
  background: var(--panel);
}
.town-voice {
  display: flex;
  flex: 1;
  min-width: 0;
  gap: 15px;
  align-items: center;
}
.speaker {
  display: grid;
  grid-template-columns: 42px auto;
  column-gap: 8px;
  align-items: center;
  min-width: max-content;
}
.speaker canvas {
  width: 42px;
  border-radius: 4px;
  grid-row: span 2;
}
.speaker strong,
.speaker span {
  display: block;
}
.speaker strong {
  font-size: 15px;
}
.speaker span {
  font-size: 11px;
  color: var(--sub);
}
.speaker small {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  font: 10px var(--mono);
  color: var(--sub);
  text-transform: capitalize;
}
.speaker small svg {
  width: 12px;
  height: 12px;
}
.speaker [data-mood='happy'] {
  color: var(--mint);
}
.town-bubble {
  flex: 1;
  position: relative;
  padding: 9px 13px;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: var(--surface-raised);
}
.town-bubble:before {
  position: absolute;
  content: '';
  width: 8px;
  height: 8px;
  left: -5px;
  top: calc(50% - 4px);
  transform: rotate(45deg);
  background: var(--surface-raised);
  border-left: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.town-bubble strong {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 15px;
}
.town-bubble p {
  font-size: 12px;
  margin: 3px 0;
  line-height: 1.4;
  color: var(--soft);
}
.town-terms {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 6px;
  color: var(--sub);
  font: 10px var(--mono);
}
.town-terms span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.town-terms b {
  color: var(--gold);
}
.town-roster {
  display: grid;
  grid-template-columns: repeat(4, 31px);
  gap: 5px;
  flex: none;
}
.town-roster button {
  position: relative;
  padding: 0;
  border-radius: 4px;
  border: 1px solid var(--line);
  background: transparent;
}
.town-roster canvas {
  width: 100%;
  border-radius: 3px;
}
.town-roster button[aria-pressed='true'] {
  outline: 2px solid var(--gold);
  outline-offset: 1px;
}
.town-roster i {
  position: absolute;
  right: -2px;
  top: -4px;
  font: 700 9px var(--mono);
  padding: 0 3px;
  border-radius: 50%;
  color: var(--ink);
  background: var(--gold);
}
@container (max-width:720px) {
  .town-directory {
    flex-wrap: wrap;
    gap: 10px;
  }
  .town-voice {
    flex-basis: 100%;
  }
  .town-roster {
    display: flex;
  }
  .town-roster button {
    width: 29px;
  }
}
@container (max-width:460px) {
  .town-directory {
    padding: 9px;
  }
  .speaker {
    display: flex;
    flex-direction: column;
    text-align: center;
    min-width: 64px;
  }
  .town-terms {
    gap: 5px;
  }
}
</style>
