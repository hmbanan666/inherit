import { parseArgs } from 'node:util'
import { mkdir, realpath } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { chapterCapture } from '../tests/e2e/chapter-capture.ts'

const { values } = parseArgs({ options: {
  url: { type: 'string' }, pack: { type: 'string' }, lesson: { type: 'string' },
} })
const id = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
if (!values.url || !id.test(values.pack ?? '') || !id.test(values.lesson ?? ''))
  throw new Error('Use pnpm shots --url <site> --pack <id> --lesson <id>.')
const url = new URL(values.url)
if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP or HTTPS site.')
url.searchParams.set('pack', values.pack)
url.searchParams.set('lesson', values.lesson)
if (!process.env.INHERIT_SHOTS) throw new Error('Set INHERIT_SHOTS to a directory outside the checkout.')
const root = fileURLToPath(new URL('../', import.meta.url))
const dir = resolve(process.env.INHERIT_SHOTS)
await mkdir(dir, { recursive: true })
const path = relative(await realpath(root), await realpath(dir))
if (path !== '..' && !path.startsWith('../')) throw new Error('Choose a screenshot directory outside the checkout.')

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: {width: 1440, height: 900} })
  await page.goto(url.href)
  await page.locator('.view-lines, [role=alert], .showcase h1').first().waitFor()
  const failure = page.locator('[role=alert], .showcase h1').first()
  if (await failure.isVisible()) throw new Error(await failure.innerText())
  await page.getByTestId('primary-button').waitFor()
  await page.locator('[data-testid=world] svg, [data-testid=world] canvas').first().waitFor({ state: 'visible' })
  await page.evaluate(() => document.fonts.ready)
  const capture = await chapterCapture(page)
  await capture(values.pack + '/' + values.lesson + '/start')
} finally {
  await browser.close()
}
