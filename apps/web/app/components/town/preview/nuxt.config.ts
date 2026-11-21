import { defineNuxtConfig } from 'nuxt/config'

// Run from the workspace with pnpm --filter web exec nuxt dev app/components/town/preview.
export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: false },
  compatibilityDate: '2026-06-01',
  app: { baseURL: '/town-demo/', head: { title: 'Kettlewick · Town preview' } },
})
