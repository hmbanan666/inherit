const title = 'Kettlewick Works · Inherit'
const description =
  'Program the drones at Kettlewick Works and watch them haul ore.'

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
      title,
      meta: [
        { name: 'theme-color', content: '#17191b' },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
      ],
      link: [{ rel: 'icon', href: '/mark.svg' }],
    },
  },
  vite: {
    worker: {
      format: 'es',
      rolldownOptions: { output: { codeSplitting: false } },
    },
  },
})
