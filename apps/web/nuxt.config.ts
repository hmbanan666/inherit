export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: false },
  compatibilityDate: '2026-06-01',
  css: [
    '@fontsource/space-grotesk/latin-500.css',
    '@fontsource/space-grotesk/latin-700.css',
    '@fontsource/ibm-plex-mono/latin-400.css',
    '@fontsource/ibm-plex-mono/latin-500.css',
    '~/assets/game.css',
  ],
  app: {
    head: {
      title: "inherit — Uncle's shed",
      meta: [{ name: 'theme-color', content: '#17191b' }],
      link: [{ rel: 'icon', href: '/mark.svg' }],
    },
  },
  vite: { worker: { format: 'es' } },
})
