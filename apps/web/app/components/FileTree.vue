<script setup lang="ts">
import { useGame } from '../lib/useGame'
const { files, openFile } = useGame()
</script>
<template><nav aria-label="Project files"><button v-for="(_,path) in files" :key="path" @click="openFile(String(path))">{{path}}</button></nav></template>
