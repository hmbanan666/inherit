<script setup lang="ts">
import type { ApiSection } from '@inherit/sim/v8'
import { X } from '@lucide/vue'

const props = defineProps<{ sections: ApiSection[] }>()
const emit = defineEmits<{ close: [] }>()
const openId = ref(props.sections[0]?.id ?? 'furnace')
const section = computed(() => props.sections.find(item => item.id === openId.value) ?? props.sections[0])

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="shade" @click.self="emit('close')">
    <section class="book" role="dialog" aria-modal="true" aria-label="API book">
      <header>
        <h2>API</h2>
        <button type="button" aria-label="Close API" @click="emit('close')"><X :size="16" /></button>
      </header>
      <div class="body">
        <nav aria-label="API sections">
          <button v-for="item in sections" :key="item.id" type="button" :aria-current="item.id === section?.id ? 'true' : undefined" @click="openId = item.id">
            {{ item.title }}
          </button>
        </nav>
        <div class="pages">
          <article v-for="entry in section?.entries ?? []" :key="entry.id" :class="{ locked: !!entry.locked }">
            <h3>
              <code>{{ entry.signature }}</code>
              <small v-if="entry.fresh" class="new">new</small>
              <small v-if="entry.locked" class="lock">Unlocks with {{ entry.locked }}</small>
            </h3>
            <p>{{ entry.doc }}</p>
            <pre>{{ entry.example }}</pre>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.shade {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(8, 8, 9, 0.62);
}
.book {
  width: min(880px, 100%);
  height: min(720px, 100%);
  display: flex;
  flex-direction: column;
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 16px 48px var(--shadow-light);
  overflow: hidden;
}
header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 8px 0 16px;
  border-bottom: 1px solid var(--line);
}
h2 { margin: 0; font-size: 15px; letter-spacing: -0.3px }
header button {
  margin-left: auto;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--sub);
}
.body { flex: 1; min-height: 0; display: grid; grid-template-columns: 160px minmax(0, 1fr) }
nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  border-right: 1px solid var(--line);
  background: var(--surface-low);
}
nav button {
  text-align: left;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--soft);
  font: 13px var(--mono);
  padding: 7px 8px;
}
nav button[aria-current='true'] { background: var(--panel); color: var(--text) }
.pages { overflow: auto; padding: 8px 18px 20px }
article { padding: 14px 0; border-bottom: 1px solid var(--line) }
article.locked { opacity: 0.72 }
h3 { margin: 0; font-size: 14px; font-weight: 600 }
h3 code { font: 13px var(--mono); color: var(--accent-soft) }
.new, .lock {
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 8px;
  background: var(--surface-low);
  color: var(--sub);
  font: 11px var(--mono);
  vertical-align: 1px;
}
.new { color: var(--gold) }
p { margin: 8px 0; font-size: 13px; line-height: 1.45 }
pre {
  margin: 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--surface-low);
  color: var(--text);
  font: 12px/1.5 var(--mono);
  white-space: pre-wrap;
}
@media (max-width: 720px) {
  .body { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr) }
  nav { flex-direction: row; overflow: auto; border-right: 0; border-bottom: 1px solid var(--line) }
}
</style>
