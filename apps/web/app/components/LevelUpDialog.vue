<script setup lang="ts">
import type { QuestDef } from '../../../../packages/sim/src/v8/quests'
import { levelUnlocks, levelUpLabels } from '../lib/levelUp'
import { shellLabels } from '../lib/shellBar'

const props = defineProps<{ level: number; quests: readonly QuestDef[] }>()
const emit = defineEmits<{ close: [] }>()
const dialog = useTemplateRef('dialog')
const unlocks = computed(() => levelUnlocks(props.level, props.quests))
</script>

<template>
  <GameDialog ref="dialog" :title="shellLabels.level(level)" @keydown.enter.prevent.stop="dialog?.requestClose()" @close="emit('close')">
    <div class="level-up">
      <p>{{ levelUpLabels.reached(level) }}</p>
      <ul v-if="unlocks.lines.length">
        <li v-for="line in unlocks.lines" :key="line">{{ line }}</li>
      </ul>
      <p v-else>{{ levelUpLabels.keepGoing(unlocks.next) }}</p>
      <button type="button" class="gold" @click="dialog?.requestClose()">{{ levelUpLabels.confirm }}</button>
    </div>
  </GameDialog>
</template>

<style scoped>
.level-up { display: grid; gap: 12px }
.level-up p, .level-up ul { margin: 0 }
.level-up ul { padding-left: 20px }
.level-up button { justify-self: end }
</style>
