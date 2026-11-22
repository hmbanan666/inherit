<script setup lang="ts">
import { computed } from 'vue'
import type { Call } from '../../framework/pack'
import { propText, type Village } from './world'
import SceneStage from './scenes/SceneStage.vue'
import VillagePanorama from './scenes/VillagePanorama.vue'

const props = defineProps<{ world: Village; calls: Call[] }>()
const panorama = computed(() => ['village', 'garden', 'orchard', 'picnic', 'path'].includes(props.world.scene)
  || props.world.lessonId === 'fair-opening' && props.world.banner)
const value = computed(() => propText(props.world, props.world.prop))
const readings = computed(() => Object.entries(props.world.readings))
const panoramaWorld = computed(() => {
  const world = props.world
  if (world.lessonId !== 'fair-opening' || !world.banner) return world
  return {
    ...world,
    sign: world.album['house-sign'] ?? '',
    gateFlowers: world.album.flowers ? 3 : 0,
    houseFlowers: world.album['flower-row'] ? 4 : 0,
    flag: world.album.flag ?? '',
    shutters: !!world.album.morning,
    lamps: world.album['path-lamps'] ? [1, 2, 3, 4, 5] : [],
    neighbours: world.ledger.map(card => card.name),
  }
})
</script>

<template>
  <section class="course-world" :aria-label="world.cue">
    <header class="scene-note">
      <strong>{{ world.cue }}</strong>
      <p>{{ world.reason }}</p>
    </header>
    <div class="stage">
      <VillagePanorama v-if="panorama" :world="panoramaWorld" :calls="calls"/>
      <SceneStage v-else :world="world"/>
      <div v-if="readings.length || world.ledger.length" class="input-card">
        <template v-for="[name, reading] in readings" :key="name">
          <code>{{ name }}</code><span>{{ JSON.stringify(reading) }}</span>
        </template>
        <template v-if="world.ledger.length">
          <b>Bookings</b><span>{{ world.ledger.map(card => card.name + ' · ' + card.seats).join(' / ') }}</span>
        </template>
      </div>
    </div>
    <div class="prop" :class="world.prop" :data-testid="world.prop" :aria-label="value">
      <i v-if="world.prop === 'signal'" :class="{ on: world.signal, off: world.signal === false }"/>
      <span>{{ value || '—' }}</span>
    </div>
  </section>
</template>

<style scoped>
.course-world {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: 100%;
  min-height: 0;
  flex: 1;
  color: #f8eed4;
  background: #74826b;
}
.scene-note { padding: 13px 20px 12px; background: #35483f; }
.scene-note strong { font: 600 clamp(14px, 1.3vw, 19px) Georgia, serif; }
.scene-note p { max-width: 64ch; margin: 4px 0 0; color: #e5e5d6; font-size: 13px; line-height: 1.4; }
.stage { position: relative; display: flex; min-height: 0; background: linear-gradient(#9696a6 0 40%, #a4ad89 55%, #8b9b7a 80%); }
.input-card {
  position: absolute;
  top: 12px;
  left: 12px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  max-width: calc(100% - 24px);
  padding: 8px 12px;
  color: #403c31;
  background: #f6e8c9;
  box-shadow: 1px 3px 0 #493c3026;
  border-radius: 3px;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.prop {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 44px;
  padding: 6px 12px;
  background: #405447;
  font: 600 clamp(15px, 1.4vw, 23px) Georgia, serif;
  text-align: center;
  overflow-wrap: anywhere;
}
.prop.signs, .prop.cards { background: #765c46; }
.prop.slip { background: #efe1c0; color: #493f35; font-family: ui-monospace, monospace; }
.prop i { width: 14px; height: 14px; border-radius: 50%; background: #708272; }
.prop i.on { background: #b8df8d; box-shadow: 0 0 11px #afda88; }
.prop i.off { background: #d59877; }
</style>
