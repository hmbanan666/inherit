<script setup lang="ts">
import type { TownSnapshot } from '@inherit/sim'
defineProps<{ town: TownSnapshot }>()
</script>
<template>
  <section class="register" aria-label="Kettlewick buildings">
    <div v-for="building in town.buildings" :key="building.id" class="ticket">
      <small>{{ building.state }}</small>
      <h3>{{ building.name }}</h3>
      <p v-if="building.label">{{ building.label }}</p>
      <p v-for="p in town.people.filter((p) => p.buildingId === building.id)" :key="p.id">
        {{ p.name }} · {{ p.mood }}
      </p>
    </div>
  </section>
</template>
<style scoped>
.register {
  height: 100%;
  overflow: auto;
  padding: 18px;
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
  align-content: start;
}
.ticket small {
  text-transform: uppercase;
  color: var(--gold);
}
.ticket h3 {
  margin: 5px 0;
}
</style>
