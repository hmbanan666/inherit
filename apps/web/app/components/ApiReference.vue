<script setup lang="ts">
import { useGame } from '../lib/useGame'

const { reference } = useGame()

</script>

<template>
  <section class="reference" aria-label="API reference" tabindex="0">
    <section>
      <h2>What inherit exports</h2>
      <article v-for="entry in reference" :key="entry.name">
        <h3>
          <code><b>{{ entry.name }}</b>{{ entry.signature.slice(entry.name.length) }}</code>
        </h3>
        <p>{{ entry.description }}</p>
        <code class="example">{{ entry.example }}</code>
      </article>
    </section>
  </section>
</template>

<style scoped>
.reference {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  overflow-wrap: anywhere;
  scrollbar-color: var(--line-strong) var(--surface-low);
}
.reference section + section {
  margin-top: 20px;
}
h2 {
  margin: 0 0 8px;
  color: var(--text);
  font-size: 16px;
}
article {
  padding: 10px 13px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 5px;
}
article + article {
  margin-top: 6px;
}
h3 {
  color: var(--syntax-type);
  font-size: 13px;
  font-weight: 400;
}
code {
  font-family: var(--mono);
  line-height: 1.55;
  white-space: pre-wrap;
}
b {
  color: var(--accent-soft);
  font-weight: 500;
}
p {
  margin: 3px 0 6px;
  color: var(--soft);
  font-size: 14px;
  line-height: 1.4;
}
.example {
  display: block;
  border-left: 2px solid var(--accent-line);
  padding-left: 8px;
  color: var(--text);
  font-size: 12px;
}
</style>
