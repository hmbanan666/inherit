import { expect, test } from '@playwright/test'

const chapter = '/?chapter=tally-desk'
const revision = 'be229c5655074642ee664f532f2e7411dd7dccc7'

test('rebuild the day desk, carry it into the night shift, then reopen the notebook', async ({ page }) => {
  await page.goto(chapter)
  const editor = page.getByLabel('desk.ts')
  const starter = await editor.inputValue()
  const check = page.getByRole('button', { name: 'Check challenge' })
  const status = page.getByRole('status')
  const source = page.getByRole('link', { name: 'Read the reconciler source' })
  await check.click()
  await expect(status).toContainText('step 1 · Stamp parcel. React shows 1, your desk shows 0.')

  // A participant can supply a different implementation from the notebook.
  const day = 'const cell = [0]\nexport function tallyFor() { return [cell[0], n => cell[0] = n] }'
  await editor.fill(day)
  await check.click()
  await expect(status).toHaveText('Challenge complete.')
  await page.getByText('How React does it').click()
  await expect(source).toHaveAttribute('href', new RegExp(revision + '.*#L1140-L1177$'))
  await page.getByRole('button', { name: 'Investigate the night shift' }).click()
  await expect(editor).toHaveValue(day)
  await check.click()
  await expect(status).toContainText('step 3 · Change shift. React shows 0, your desk shows 1.')

  await page.getByRole('button', { name: 'Suggest an experiment' }).click()
  await page.getByRole('button', { name: 'Explain the behavior' }).click()
  await page.getByRole('button', { name: 'Show worked solution' }).click()
  await page.getByRole('button', { name: 'Use this solution' }).click()
  await check.click()
  await expect(status).toHaveText('Challenge complete.')
  await expect(page.locator('tbody tr').last()).toHaveText('8Stamp parcel11')
  await page.getByText('How React does it').click()
  await expect(source).toHaveAttribute('href', new RegExp(revision + '.*#L1180-L1203$'))

  await page.getByRole('link', { name: 'Start a fresh chapter' }).click()
  await expect(editor).toHaveValue(starter)
  await page.getByRole('button', { name: 'Suggest an experiment' }).click()
  await expect(page.getByText('Watch the tally', { exact: false })).toBeVisible()
  await page.getByText('How React does it').click()
  await expect(source).toBeVisible()
})

test('a keyed solution carries forward and can explore a different sequence', async ({ page }) => {
  await page.goto(chapter)
  const editor = page.getByLabel('desk.ts')
  const solution = `let current
let cell
export function tallyFor(key) {
  if (key !== current) { current = key; cell = { value: 0 } }
  return [cell.value, value => cell.value = value]
}`
  await editor.fill(solution)
  const check = page.getByRole('button', { name: 'Check challenge' })
  await check.click()
  await page.getByRole('button', { name: 'Investigate the night shift' }).click()
  await expect(editor).toHaveValue(solution)
  for (const name of ['Change shift', 'Stamp parcel', 'Repaint sign', 'Stamp parcel', 'Change shift']) {
    await page.getByRole('button', { name, exact: true }).click()
  }
  await expect(page.locator('tbody tr').last()).toHaveText('5Change shift00')
  await check.click()
  await expect(page.getByRole('status')).toHaveText('Challenge complete.')
})
