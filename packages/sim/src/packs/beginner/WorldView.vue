<script setup lang="ts">
import type { Village } from './world'
defineProps<{world: Village}>()
</script>
<template><div class="village"><h2>Mila’s cottage</h2><p data-testid="speech">{{ world.bubble || 'Mila is waiting by the gate.' }}</p></div></template>
