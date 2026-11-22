import { expect, test } from '@playwright/test'

import { openShed, photo, edit, openTool, savedShed } from './workshop'

test('Bram meets the player beside a labelled working shed', async ({ page }) => {
  await openShed(page)
  await expect(page.getByTestId('floor')).toBeVisible()
  for (const place of ['mine', 'furnace', 'cart']) {
    await expect(page.getByTestId('place-' + place)).toHaveText('"' + place + '"')
  }
  await expect(page.getByTestId('speech')).toContainText('Bram')
  await expect(page.locator('.view-lines')).toContainText('from "inherit"')
  await expect(page.getByTestId('primary-button')).toContainText('Run')
  await expect(page.getByRole('navigation', { name: 'Workshop sections' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'History', exact: true })).toBeHidden()
  await photo(page, '01-first-screen')
  const action = await page.getByTestId('primary-button').boundingBox()
  const header = await page.locator('.hud').boundingBox()
  expect(action!.y + action!.height).toBeLessThanOrEqual(header!.y + header!.height)
  expect(header!.x + header!.width - action!.x - action!.width).toBeLessThan(32)
  expect(action!.height).toBeGreaterThanOrEqual(44)
  expect(action!.width).toBeGreaterThanOrEqual(104)
  await expect(page.getByTestId('primary-button')).toHaveCSS('font-size', '16px')
})

test('Run shows the rock and its source line before Continue becomes available', async ({ page }) => {
  await openShed(page)
  await page.getByRole('textbox', {name:'Factory controller TypeScript'}).focus()
  await page.keyboard.insertText('take("mine")')
  await expect(page.locator('.view-line').nth(3)).toHaveText('take("mine")')
  await page.getByTestId('primary-button').click()
  await expect(page.locator('.machine-line')).toBeVisible()
  await expect(page.getByTestId('hand')).toHaveText('iron ore')
  const mine = (await page.getByTestId('place-mine').boundingBox())!
  await expect.poll(async () => {
    const arm = await page.getByTestId('hand').boundingBox()
    return arm && Math.abs(arm.x + arm.width / 2 - mine.x - mine.width / 2)
  }, { intervals: [16] }).toBeLessThan(2)
  await photo(page, '02-watched-run')
  const solved = page.getByTestId('solved-card')
  await expect(solved).toContainText('Done')
  await expect(page.locator('.machine-line')).toHaveCount(0)
  await photo(page, '03-solved')
  await expect(page.getByTestId('checks')).toContainText('1 done')
  // Move past the old automatic transition, then return to the saved workshop.
  await page.clock.install()
  await page.clock.fastForward(2000)
  await expect(solved).toBeVisible()
  await page.reload()
  await expect(solved).toBeVisible()
  await expect(page.getByTestId('hand')).toHaveText('iron ore')
  await page.getByTestId('continue').click()
  await expect(page.locator('.view-lines')).toContainText('TODO: Put the rock in the furnace')
  await expect(page.locator('.view-lines')).toContainText('take("mine")')
  await edit(page, '\nput("furnace")', true)
  await page.keyboard.press('Control+Enter')
  const returning = page.getByText('Putting iron ore back at "mine"', { exact: true })
  await expect(returning).toBeVisible()
  await expect(page.locator('.machine-line')).toHaveCount(0)
  await expect(page.getByTestId('hand')).toHaveText('empty hand')
  await expect(page.getByTestId('hand')).toHaveText('iron ore')
  await expect(solved).toContainText('You lit the hearth')
  await expect(page.getByTestId('hand')).toHaveText('empty hand')
})

test('place completion and a typo point back to the floor', async ({ page }) => {
  await openShed(page)
  await edit(page, 'take("mine")', true)
  await page.locator('.view-line').getByText('"mine"', { exact: true }).hover()
  await expect(page.getByRole('button', { name: 'Inspect mine' }).locator('..')).toHaveClass(/chosen/)
  await edit(page, 'import { take } from "inherit"\ntake("')
  await page.keyboard.press('Control+Space')
  const suggestions = page.locator('.suggest-widget.visible')
  for (const place of ['mine', 'furnace', 'cart']) await expect(suggestions).toContainText(place)
  await page.keyboard.press('Escape')
  await edit(page, 'mines")', true)
  await page.getByTestId('primary-button').click()
  const message = 'There is no place called "mines". Places: mine, furnace, cart.'
  await expect(page.getByTestId('checks')).toContainText(message)
  await openTool(page, 'console')
  await expect(page.getByRole('tabpanel', { name: 'Console' })).toContainText(message)
  await expect(page.getByTestId('continue')).toHaveCount(0)
})

test('the furnace can be empty and a named shipping trip plays above the arm', async ({ page }) => {
  await page.clock.install()
  await openShed(page)
  await edit(page, 'take("furnace")', true)
  await page.getByTestId('primary-button').click()
  await expect(page.getByTestId('arm')).toContainText('Nothing ready yet at furnace.')
  await expect(page.getByTestId('primary-button')).toBeEnabled()
  await page.clock.runFor(750)
  await expect(page.getByTestId('checks')).toContainText('Nothing ready yet at furnace.')
  await openShed(page, '?step=bram-cart')
  await edit(page, '\ntake("furnace")\nput("cart")', true)
  await page.getByTestId('primary-button').click()
  const retry = page.getByTestId('primary-button').and(page.locator(':enabled'))
  await expect(retry.or(page.getByTestId('solved-card')).first()).toBeVisible()
  if (await retry.isVisible()) await retry.click()
  await expect(page.getByTestId('solved-card')).toContainText('first ingot')
  await page.getByTestId('continue').click()
  await edit(page, 'import { take, put } from "inherit"\nfunction smelt() { take("mine"); put("furnace") }\nsmelt()\ntake("furnace")\nput("cart")')
  await page.getByTestId('primary-button').click()
  await expect(page.getByTestId('arm')).toContainText('smelt()')
  await page.getByTestId('continue').click()
  await openTool(page, 'hints')
  await page.getByRole('button', {name: 'Show hint 1 of 2'}).click()
  await page.getByRole('button', {name: 'Show hint 2 of 2'}).click()
  await expect(page.getByTestId('drawer').locator('pre')).toHaveCount(2)
  await edit(page, 'import { take, put } from "inherit"\nfunction smelt() { take("mine"); put("furnace") }\nfunction ship() { take("furnace"); put("cart") }\nsmelt()\nship()')
  await expect(page.locator('.my-library')).toHaveCount(0)
  await page.getByTestId('primary-button').click()
  await expect(page.getByTestId('arm')).toContainText('ship()')
  await page.getByTestId('continue').click()
  await expect(page.getByTestId('primary-button')).toContainText('Deploy')
})

for (const input of ['paste', 'type']) {
  test(`Bram’s smelt brief works when you ${input} over the two gold lines`, async ({ page, context }) => {
    await openShed(page, '?step=bram-smelt')
    const card = page.getByTestId('task-card')
    await expect(card).toContainText('Give the two furnace moves the name smelt')
    await expect(page.locator('.view-lines')).toContainText('TODO: Give the two furnace moves')
    const block = 'function smelt() {\n  take("mine")\n  put("furnace")\n}\nsmelt()'
    const primary = page.getByTestId('primary-button')
    await primary.click()
    await expect(primary).toBeEnabled()
    await expect(card).toBeVisible()
    // The starter consumes a rock. Wait for the next one before testing the edit.
    await page.getByRole('button', { name: 'Inspect mine' }).click()
    await expect(page.getByRole('region', { name: 'Machine inspector' })).toContainText('ready')
    await page.getByRole('button', { name: 'Close inspector' }).click()
    const marked = page.locator('.view-line').filter({ has: page.locator('.call-to-move') })
    await expect(marked).toHaveText(['take("mine")', 'put("furnace")'])
    await marked.first().click()
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+ArrowDown')
    await page.keyboard.press('Shift+End')
    if (input === 'paste') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await page.evaluate(text => navigator.clipboard.writeText(text), block)
      await page.keyboard.press('Control+v')
    } else {
      const lines = block.split('\n')
      await page.keyboard.type(lines[0])
      for (const line of lines.slice(1)) {
        await page.keyboard.press('Enter')
        await page.keyboard.type(line.trimStart())
      }
    }
    await expect(page.locator('.view-lines')).toContainText('function smelt()')
    // Monaco recycles line elements while typing. Their painted order is the source order.
    await expect.poll(() => page.locator('.view-line').evaluateAll(lines => lines
      .sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)
      .map(line=>line.textContent).join('\n'))).toMatch(/take\("furnace"\)\s*put\("cart"\)/)
    await primary.click()
    await expect(page.getByTestId('solved-card')).toContainText('You named the two moves')
  })
}

test('a busy furnace on the live clock reports at the furnace and in Console', async ({ page }) => {
  await openShed(page, '?step=elsie-press')
  // Leave the ingots in the furnace until its input fills. Each later deposit will fail.
  await edit(page, 'import { take, put } from "inherit"\nexport function onTick() {\n  if (take("mine")) {\n    put("furnace")\n    put("furnace")\n  }\n}')
  await page.getByTestId('primary-button').click()
  const message = 'The furnace cannot accept iron ore right now.'
  await openTool(page, 'console')
  await expect(page.getByRole('tabpanel', { name: 'Console' })).toContainText(message, { timeout: 30000 })
  // Observe a second refused deposit, including transient highlights during playback.
  const consoleRows = page.getByRole('region', { name: 'Program console' }).getByRole('listitem')
  const refusals = consoleRows.filter({ hasText: message })
  const tick = refusals.first().locator('.tick')
  const previous = await tick.innerText()
  const prominent = await page.evaluateHandle(() => {
    const seen = new Set<string>()
    const put = Array.from(document.querySelectorAll('.view-line')).find(line => line.textContent?.includes('put("furnace")'))!
    const observer = new MutationObserver(() => {
      const light = document.querySelector('.machine-line')
      if (light && Math.abs(light.getBoundingClientRect().top - put.getBoundingClientRect().top) < 2)
        seen.add('editor highlight')
      if (document.querySelector('.call-message')) seen.add('arm warning')
      if (document.querySelector('[data-testid="checks"] p')?.textContent?.includes('cannot accept')) seen.add('Checks warning')
    })
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true })
    return { seen, observer }
  })
  await expect(tick).not.toHaveText(previous)
  const furnace = page.getByRole('button', { name: 'Inspect furnace' }).locator('..')
  await expect(furnace).toContainText(/Busy\s*Hand empty/)
  expect(await prominent.evaluate(({ seen, observer }) => {
    observer.disconnect()
    return [...seen]
  })).toEqual([])
})

test('the loop marks only the calls left outside the clock after Deploy', async ({ page }) => {
  await openShed(page, '?step=bram-loop')
  const primary = page.getByTestId('primary-button')
  const calls = page.locator('.view-line').filter({ has: page.locator('.call-to-move') })
  await expect(calls).toHaveText(['smelt()', 'ship()'])
  await edit(page, 'import {take,put} from "inherit"\nfunction smelt(){take("mine");put("furnace")}\nfunction ship(){take("furnace");put("cart")}\nsmelt()\nship()\nexport function onTick(){ship()}')
  await primary.click()
  await expect(page.getByRole('group', {name: 'Clock controls'})).toBeVisible()
  await expect(calls).toHaveText(['smelt()', 'ship()'])
})

test('the clock lesson keeps Deploy on error and opens the next lesson with all reveals on one Continue', async ({ page }) => {
  await openShed(page, '?step=bram-loop&speed=24')
  const primary = page.getByTestId('primary-button')
  await expect(primary).toContainText('Deploy')
  await photo(page, '04-bram-loop')
  const hud = page.getByRole('banner')
  await expect(hud).not.toContainText(/clock|onTick|history/i)
  await expect(page.locator('.view-lines')).toContainText('onTick')
  await expect(page.getByRole('button', { name: /history/i })).toHaveCount(0)
  await edit(page, 'import { take, put } from "inherit"\nlet rocks = 0\nexport function onTick() { if (take("mine") && put("cart")) console.log("Rock " + ++rocks) }')
  await primary.click()
  await openTool(page, 'console')
  await expect(page.getByRole('tabpanel', { name: 'Console' })).toContainText('Rock 3')
  await page.getByRole('button', { name: 'Close drawer' }).click()
  await expect(page.getByTestId('checks')).toContainText('0 / 3')
  await expect(page.getByTestId('continue')).toHaveCount(0)
  await edit(page, 'export const stopped = true')
  await primary.click()
  await expect(page.getByTestId('checks')).toContainText('onTick')
  await expect(primary).toContainText('Deploy')
  await edit(page, 'import { take, put } from "inherit"\nfunction smelt() { take("mine"); put("furnace") }\nfunction ship() { take("furnace"); put("cart") }\nexport function onTick() { smelt(); ship() }')
  await primary.click()
  await expect(page.getByTestId('solved-card')).toContainText('+64 coins', { timeout: 20000 })
  const next = page.getByTestId('continue')
  await expect(page.locator('.cart-load')).toHaveText('3 / 3 delivered · order complete')
  await expect(page.locator('.cart-load')).toBeInViewport({ ratio: 0.999 })
  await expect(page.locator('.station-status')).toHaveCount(0)
  const wallet = page.getByTitle('Workshop money')
  await expect(wallet).toBeHidden()
  await next.click()
  await expect(page.getByTestId('task-card')).toContainText('Reply to Mrs Harrow')
  await expect(page.getByTestId('drawer')).toContainText('64 coins')
  await expect(hud).not.toContainText(/coins|debt|history/i)
  await expect(page.getByRole('button', { name: 'Pay later' })).toBeVisible()
})

test('opening the same step link again starts at the requested brief', async ({ page }) => {
  const link = '?step=bram-take&speed=8'
  await openShed(page, link)
  await edit(page, 'take("mine")', true)
  await page.getByTestId('primary-button').click()
  await page.getByTestId('continue').click()
  await expect(page.getByTestId('task-card')).toContainText('Put the rock in the furnace')
  await openShed(page, link)
  await expect(page.getByTestId('task-card')).toContainText('Lift a rock from the mine')
})

test('reopening a workshop draft focuses the edit under its lesson comment', async ({page}) => {
  await openShed(page)
  const editor = page.getByRole('textbox', {name: 'Factory controller TypeScript'})
  await expect(editor).toBeFocused()
  await page.keyboard.type('take("mine")')
  await page.reload()
  await expect(editor).toBeFocused()
  await page.keyboard.type('// ')
  await expect(page.locator('.view-line').nth(3)).toHaveText('// take("mine")')
})

for (const speed of [1, 2, 4]) {
  test(`the live arm reaches each station before transferring its load at ${speed}x`, async ({ page }) => {
    await openShed(page, '?step=bram-loop&speed=' + speed)
    await edit(page, [
      'import { take, put } from "inherit"',
      'export function onTick() {',
      '  take("mine")',
      '  put("furnace")',
      '  take("furnace")',
      '  put("cart")',
      '}',
    ].join('\n'))
    const transfers = await page.getByTestId('arm').evaluateHandle(arm => {
      const hand = arm.querySelector('[data-testid="hand"]')!
      let held = hand.textContent
      const arrivals: { load: string | null; distance: number; atCart: boolean }[] = []
      const observer = new MutationObserver(() => {
        if (hand.textContent === held) return
        held = hand.textContent
        const station = document.querySelector<HTMLElement>('.station.acting')
        if (station) arrivals.push({
          load: held,
          atCart: !!station.querySelector('[data-testid="place-cart"]'),
          distance: Math.abs(parseFloat(getComputedStyle(arm).left) - parseFloat(station.style.left)),
        })
      })
      observer.observe(arm, { subtree: true, characterData: true, childList: true })
      return { arrivals, observer }
    })
    await page.getByTestId('primary-button').click()
    await expect.poll(() => transfers.evaluate(({ arrivals }) =>
      arrivals.some(arrival => arrival.atCart && arrival.load === 'empty hand'),
    )).toBe(true)
    const arrivals = await transfers.evaluate(({ arrivals, observer }) => {
      observer.disconnect()
      return arrivals
    })
    expect(arrivals.map(a => a.load)).toContain('iron ore')
    expect(arrivals.map(a => a.load)).toContain('iron ingot')
    for (const arrival of arrivals) expect(arrival.distance).toBeLessThan(1)
  })
}

test('the playback bar counts handler calls, pauses, plays and stops the loop', async ({ page }) => {
  await savedShed(page, 'bram-loop')
  const controls = page.getByRole('group', { name: 'Clock controls' })
  await expect(controls).toHaveCount(0)
  await edit(page, 'let count = 0\nexport function onTick() { console.log("calls " + ++count) }')
  await page.getByTestId('primary-button').click()
  await expect(page.getByTestId('world').getByRole('group', { name: 'Clock controls' })).toBeVisible()
  await expect(page.getByRole('banner').getByRole('group', { name: 'Clock controls' })).toHaveCount(0)
  const consolePanel = page.getByRole('tabpanel', { name: 'Console' })
  await openTool(page, 'console')
  await expect(consolePanel.locator('.tick').first()).toBeVisible()
  await controls.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.clock.install()
  await page.clock.runFor(500)
  const lastMessage = await consolePanel.getByRole('listitem').first().innerText()
  const count = lastMessage.match(/calls (\d+)/)![1]
  const counter = controls.locator('output')
  await expect(counter).toHaveText('onTick #' + count)
  const pausedTick = await consolePanel.locator('.tick').first().innerText()
  for (const speed of [2, 4]) {
    const button = controls.getByRole('button', { name: speed + 'x', exact: true })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
  }
  await page.clock.runFor(1000)
  await expect(consolePanel.locator('.tick').first()).toHaveText(pausedTick)
  await expect(counter).toHaveText('onTick #' + count)
  await controls.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(consolePanel.locator('.tick').first()).not.toHaveText(pausedTick)
  await controls.getByRole('button', { name: 'Pause' }).click()
  await controls.getByRole('button', { name: 'Stop loop' }).click()
  await expect(controls).toHaveCount(0)
  const stopped = await consolePanel.innerText()
  await page.clock.runFor(1000)
  await expect(consolePanel).toHaveText(stopped, { useInnerText: true })
  await page.reload()
  const deploy = page.getByTestId('primary-button')
  await expect(deploy).toBeEnabled()
  await expect(controls).toHaveCount(0)
  await deploy.click()
  await expect(controls.locator('output')).toHaveText(/onTick #[1-9]\d*/)
})

test('the gutter shows the last tick and keeps unchanged lines steady', async ({ page }) => {
  await openShed(page, '?step=heat-inspect&speed=4')
  await edit(page, [
    'import { look } from "inherit"',
    'let turns = 0',
    'export function onTick() {',
    '  if (++turns <= 32) look("furnace")',
    '  look("mine")',
    '  look("cart")',
    '}',
  ].join('\n'))
  await page.getByTestId('primary-button').click()
  const marks = page.locator('.margin-view-overlays .live-tick-line')
  await expect(marks).toHaveCount(3)
  await expect(marks).toHaveCount(2)
  await expect(page.locator('.machine-line')).toHaveCount(0)
  const controls = page.getByRole('group', { name: 'Clock controls' })
  await expect(controls.getByRole('button', { name: '4x' })).toHaveAttribute('aria-pressed', 'true')
  const first = await marks.first().elementHandle()
  const lastCalls = await controls.locator('output').evaluate(counter => new Promise<string[]>(resolve => {
    const places: string[] = []
    const observer = new MutationObserver(() => {
      places.push(document.querySelector('.station.acting .machine-label')?.textContent?.trim() ?? '')
      if (places.length === 3) {
        observer.disconnect()
        resolve(places)
      }
    })
    observer.observe(counter, { subtree: true, characterData: true, childList: true })
  }))
  expect(lastCalls).toEqual(['"cart"', '"cart"', '"cart"'])
  expect(await first!.evaluate(node => node === document.querySelector('.live-tick-line'))).toBe(true)
  await controls.getByRole('button', { name: 'Stop loop' }).click()
  await expect(marks).toHaveCount(0)
})
