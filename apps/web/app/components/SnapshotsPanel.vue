<script setup lang="ts">
import { useGame } from '../lib/useGame'
const game = useGame()
const name = ref('')
const snapshots = computed(() => [...game.campaign.value.project.snapshots].reverse())
const history = computed(() => [...game.campaign.value.project.history].reverse())
function save() {
  if (!name.value.trim()) return
  game.snapshot(name.value.trim())
  name.value = ''
}
</script>
<template>
  <section class="bench" aria-label="Project revisions">
    <form class="tools" @submit.prevent="save">
      <input v-model="name" aria-label="Snapshot name" placeholder="Snapshot name" /><button
        :disabled="!name.trim()"
      >
        Save draft
      </button>
    </form>
    <p v-if="!snapshots.length" class="quiet">Save a copy before trying a new idea.</p>
    <ul class="rows">
      <li v-for="rev in snapshots" :key="rev.id" class="bar row">
        <span
          >{{ rev.name }} <small class="tick">t{{ rev.tick }}</small></span
        ><button @click="game.restoreSnapshot(rev.id)">Restore draft</button>
      </li>
    </ul>
    <h3>Deploy history</h3>
    <p v-if="!history.length" class="quiet">Your first deploy will appear here.</p>
    <ol class="rows">
      <li v-for="rev in history" :key="rev.id" class="bar row">
        <span
          >{{ rev.name }} #{{ rev.id }} <small class="tick">t{{ rev.tick }}</small></span
        ><button @click="game.rollback(rev.id)">Roll back</button>
      </li>
    </ol>
  </section>
</template>
<style scoped src="../lib/devtools/panels.css"></style>
