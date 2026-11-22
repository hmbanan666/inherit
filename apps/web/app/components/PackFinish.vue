<script setup lang="ts">
import { ArrowRight, Check } from '@lucide/vue'
import type { PackManifest } from '@inherit/sim/pack'
import { manifests } from '@inherit/sim/registry'

const props = defineProps<{ manifest: PackManifest; ideas: readonly string[] }>()
const emit = defineEmits<{ replay: [] }>()
const next = computed(() => manifests.find(pack => pack.id === props.manifest.next))
const confirmation = ref<HTMLDialogElement>()
function replay() {
  confirmation.value?.close()
  emit('replay')
}
</script>

<template>
  <section class="finish" aria-labelledby="finish-title">
    <header>
      <span class="eyebrow"><Check /> Pack complete</span>
      <h2 id="finish-title">{{ manifest.title }}</h2>
      <p><slot>Well done! You finished all {{ ideas.length }} {{ ideas.length === 1 ? 'lesson' : 'lessons' }}.</slot></p>
    </header>
    <h3 id="finish-ideas">What you learned</h3>
    <ol aria-labelledby="finish-ideas" tabindex="0">
      <li v-for="(idea, index) in ideas" :key="index">{{ idea }}</li>
    </ol>
    <footer>
      <a v-if="next" class="next-pack" :href="'?pack=' + next.id">
        <span>Next pack</span> {{ next.title }} <ArrowRight />
      </a>
      <div class="finish-links">
        <a href="/">Back to game packs</a>
        <button @click="confirmation?.showModal()">Replay this pack</button>
      </div>
    </footer>
    <dialog ref="confirmation" aria-labelledby="replay-title">
      <h3 id="replay-title">Replay {{ manifest.title }}?</h3>
      <p>This will reset your code, world and lesson progress for this pack.</p>
      <form method="dialog">
        <button autofocus>Keep my progress</button>
        <button type="button" class="gold" @click="replay">Replay this pack</button>
      </form>
    </dialog>
  </section>
</template>

<style scoped>
.finish {
  margin: clamp(12px, 2vw, 28px);
  padding: clamp(16px, 2vw, 28px);
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--line);
  border-top: 3px solid var(--mint);
  border-radius: 10px;
  background: var(--panel);
}
.finish .eyebrow { color: var(--mint); display: flex; align-items: center; gap: 6px }
.finish h2 { font-size: clamp(25px, 2.4vw, 38px); margin: 8px 0 }
.finish h3 { font-size: 17px; margin: 18px 0 8px }
.finish ol { margin: 0; padding: 0 8px 0 30px; overflow: auto; font-size: 14px; line-height: 1.45 }
.finish li { padding: 5px 0 5px 3px }
.finish li::marker { color: var(--sub); font-family: var(--mono); font-size: 12px }
.finish footer { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line) }
.next-pack { display: flex; align-items: center; gap: 10px; border-radius: 6px; background: var(--gold); color: var(--ink); text-decoration: none; padding: 12px 16px; font-weight: 700 }
.next-pack span { font-weight: 500 }
.next-pack svg { margin-left: auto; width: 18px }
.finish-links, .finish form { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px }
.finish-links a, .finish-links button { color: var(--text); font: inherit; padding: 8px 0; border: 0; background: transparent; text-decoration: underline; text-underline-offset: 4px }
.finish dialog { margin: auto; padding: 24px; max-width: min(420px, 90vw); background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 10px }
.finish dialog::backdrop { background: var(--shadow) }
.finish dialog h3 { margin: 0 0 10px }
.finish form { margin-top: 18px }
</style>
