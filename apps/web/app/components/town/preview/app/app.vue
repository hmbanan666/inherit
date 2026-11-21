<script setup lang="ts">
import { ref } from 'vue'
import { ArrowLeft, ArrowRight } from '@lucide/vue'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '../../../../assets/game.css'
import TownView from '../../TownView.vue'
import { townFrames } from '../../../../lib/townFixture'

const frame = ref(0)
</script>
<template>
  <main class="preview">
    <header>
      <b>inherit<span>.</span></b
      ><span>Town preview</span>
    </header>
    <TownView :snapshot="townFrames[frame].snapshot" />
    <nav aria-label="Preview states">
      <button aria-label="Previous state" :disabled="frame === 0" @click="frame--"><ArrowLeft /></button>
      <select v-model="frame" aria-label="Town state">
        <option v-for="(f, i) in townFrames" :key="f.name" :value="i">{{ f.name }}</option>
      </select>
      <button aria-label="Next state" :disabled="frame === townFrames.length - 1" @click="frame++">
        <ArrowRight />
      </button>
    </nav>
  </main>
</template>
<style scoped>
.preview {
  width: min(1000px, calc(100% - 32px));
  margin: clamp(16px, 6vh, 68px) auto;
}
.preview > header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 19px;
}
.preview > header b {
  font:
    700 30px/1 'Space Grotesk',
    sans-serif;
  letter-spacing: -1.7px;
}
.preview > header b span {
  color: var(--gold);
}
.preview > header > span {
  padding-left: 16px;
  border-left: 1px solid var(--line);
  color: var(--sub);
  font: 12px var(--mono);
}
.preview nav {
  margin-top: 14px;
  display: flex;
  justify-content: center;
  gap: 6px;
}
.preview select {
  font: 12px var(--mono);
  border-radius: 4px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
  padding: 5px 10px;
}
</style>
