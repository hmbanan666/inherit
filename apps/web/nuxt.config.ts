const title = 'inherit — a factory you program'
const description =
  'Your uncle left a factory and a debt. Build machines and belts with TypeScript to fill Kettlewick’s requests and rebuild its bridge.'

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
  hooks: {
    'build:manifest'(manifest) {
      for (const resource of Object.values(manifest)) {
        if (resource.file.startsWith('runner.worker-')) {
          resource.preload = false
          resource.prefetch = false
        }
      }
    },
  },
  vite: {
    worker: {
      format: 'es',
      rolldownOptions: { output: { codeSplitting: false } },
      plugins: () => [
        {
          name: 'check-controller-worker',
          generateBundle(_, bundle) {
            const chunks = Object.values(bundle).filter((file) => file.type === 'chunk')
            const runner = chunks.find((chunk) => chunk.facadeModuleId?.endsWith('/runner.worker.ts'))
            if (runner && (chunks.length !== 1 || runner.imports.length || runner.exports.length)) {
              this.error('The controller worker must be a single JavaScript chunk with no imports or exports.')
            }
          },
        },
      ],
    },
  },
})
