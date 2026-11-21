import { defineConfig } from '@playwright/test'

const port = Number(process.env.INHERIT_TEST_PORT || 4173)
const baseURL = 'http://127.0.0.1:' + port

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  timeout: 90_000,
  use: { baseURL, viewport: { width: 1440, height: 900 } },
  webServer: {
    command: 'pnpm --filter web preview --port ' + port,
    url: baseURL,
    reuseExistingServer: false,
  },
})
