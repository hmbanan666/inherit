import { expect, test, type Page } from '@playwright/test'
import { edits } from '../../packages/sim/src/packs/workshop/starter'
import { openShed } from './workshop'

function browserErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  return errors
}

test('late jumps open the expected machines, files and town changes', async ({ page }) => {
  const errors = browserErrors(page)
  await openShed(page, '?step=bridge-fit&speed=8')
  await expect(page.getByTestId('task-card')).toContainText(edits['bridge-fit'].goal)
  await expect(page.getByTestId('place-assembler')).toBeVisible()
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Project files' }).click()
  await expect(page.getByRole('region', {name:'Project files'}).getByRole('button', { name: 'tools.ts', exact: true })).toBeVisible()
  await openShed(page, '?step=harrow-deed&speed=8')
  await expect(page.getByTestId('task-card')).toContainText(edits['harrow-deed'].goal)
  await page.getByTestId('nav-town').click()
  await expect(page.locator('.town-print')).toHaveAccessibleName(/Riverside bridge working/)
  await expect(page.getByRole('button', { name: 'Pay debt' })).toContainText('600')
  expect(errors).toEqual([])
})

test('the bank panels answer the letter and settle the balance only once',async({page})=>{
  await openShed(page,'?step=harrow-tab')
  await page.getByTestId('nav-inbox').click()
  await page.getByRole('button',{name:'Pay later'}).click()
  await page.getByRole('button',{name:'Close drawer'}).click()
  await expect(page.getByTestId('solved-card')).toBeVisible()
  await openShed(page,'?step=harrow-deed')
  await page.getByRole('button',{name:'Pay debt'}).click()
  await page.getByRole('button',{name:/Pay balance/}).click()
  await expect(page.getByTestId('solved-card')).toBeVisible()
  await expect(page.getByRole('button',{name:'Pay debt'})).toHaveText('Debt 0')
  await page.reload()
  await expect(page.getByRole('button',{name:'Pay debt'})).toHaveText('Debt 0')
  await expect(page.getByTestId('continue')).toBeVisible()
})
