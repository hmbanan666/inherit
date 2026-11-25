<script setup lang="ts">
import { Coins, Sparkles, Unlock } from '@lucide/vue'
import type { QuestDef } from '../../../../packages/sim/src/v8/quests'

defineProps<{ quest: QuestDef }>()

const triggerLabel: Record<string, string> = {
  run: 'Run',
  events: 'on(event, fn)',
  tick: 'Loop',
}

function grantCall(signature: string) {
  return signature.split(':')[0] ?? signature
}
</script>

<template>
  <ul class="rewards">
    <li title="Credits paid when you hand this over."><Coins />{{ quest.pay }}</li>
    <li v-if="quest.xp" title="XP paid when you hand this over."><Sparkles />{{ quest.xp }}</li>
    <li v-if="quest.unlock" :title="quest.unlock.signature"><Unlock />{{ grantCall(quest.unlock.signature) }}<span class="when">On Take</span></li>
    <li v-if="quest.trigger" :title="triggerLabel[quest.trigger]"><Unlock />{{ triggerLabel[quest.trigger] }}<span class="when">On hand-over</span></li>
    <li v-if="quest.gift" title="Granted when you hand this over."><Unlock />{{ quest.gift }}<span class="when">On hand-over</span></li>
    <li v-if="quest.install" title="Installed when you hand this over."><Unlock />{{ quest.install }}<span class="when">On hand-over</span></li>
  </ul>
</template>

<style scoped>
.rewards { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px }
.rewards li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-low);
  font: 12px var(--mono);
  color: var(--text);
}
.rewards svg { width: 13px; height: 13px; color: var(--gold) }
.rewards .when { color: var(--soft); font-size: 10px }
</style>
