import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Page } from '@playwright/test'

/** Capture the same clock instant for the image and its reading transcript. Monaco
 * recycles line elements, so read the painted positions, including its line numbers. */
export async function chapterCapture(page: Page) {
  const dir = process.env.INHERIT_SHOTS
  if (!dir) return async (_name: string) => {}
  await mkdir(dir, { recursive: true })
  await page.clock.install()
  const browser = await page.context().newCDPSession(page)
  const sections: string[] = []
  return async (name: string) => {
    await page.mouse.move(0, 0)
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 30)))
    try {
      const text = await page.evaluate(() => {
        function read(root: Element) {
          const words: { x: number; y: number; right: number; text: string }[] = []
          const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
          const range = document.createRange()
          const drawer = document.querySelector('.drawer')?.getBoundingClientRect()
          while (walk.nextNode()) {
            const node = walk.currentNode
            const el = node.parentElement!
            if (!node.textContent || (!node.textContent.trim() && !el.closest('.view-line')) || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
            if (root.matches('.world-shell') && el.closest('.drawer')) continue
            let left = 0, top = 0, right = innerWidth, bottom = innerHeight
            for (let a: Element | null = el; a; a = a.parentElement) {
              const style = getComputedStyle(a)
              const r = a.getBoundingClientRect()
              if (style.overflowX !== 'visible') { left = Math.max(left, r.left); right = Math.min(right, r.right) }
              if (style.overflowY !== 'visible') { top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom) }
            }
            let word: typeof words[number] | undefined
            const upper = getComputedStyle(el).textTransform === 'uppercase'
            for (let i = 0; i < node.textContent.length; i++) {
              range.setStart(node, i)
              range.setEnd(node, i + 1)
              const r = range.getBoundingClientRect()
              const x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2
              if (!r.width || x < left || x > right || y < top || y > bottom) continue
              if (drawer && !el.closest('.drawer') && x >= drawer.left && x <= drawer.right && y >= drawer.top && y <= drawer.bottom) continue
              if (!word || Math.abs(word.y - y) > 4) {
                word = { x: r.left, y, right: r.right, text: '' }
                words.push(word)
              }
              word.right = r.right
              word.text += upper ? node.textContent[i].toUpperCase() : node.textContent[i]
            }
          }
          words.sort((a, b) => a.y - b.y)
          const rows: typeof words[] = []
          for (const word of words) {
            const row = rows.at(-1)
            if (row && word.y - row[0].y < 6) row.push(word)
            else rows.push([word])
          }
          return rows.map(row => row.sort((a,b) => a.x - b.x).map((word, i) => {
            const gap = i ? word.x - row[i - 1].right : 0
            return (gap > 3 ? ' ' : '') + word.text
          }).join('').replaceAll('\u00a0', ' ')).join('\n')
        }
        const sections = ['.hud', '.world-shell', '.editor-dock', '.statusbar'].map(selector => read(document.querySelector(selector)!))
        const drawer = document.querySelector('.drawer')
        if (drawer) sections[1] += '\n\n' + read(drawer)
        return sections
      })
      const town = await page.locator('.town-view').isVisible()
      const signs = town ? 'FORGE · BAKERY · BANK · TOWN HALL · MILL · RIVERSIDE' : 'FORGE · INHERIT / MACHINE WORKS'
      const { data } = await browser.send('Page.captureScreenshot', { format: 'png' })
      await writeFile(join(dir, name + '.png'), Buffer.from(data, 'base64'))
      text[1] += '\nMap signs: ' + signs
      sections.push('## ' + name + '.png\n\n````text\n' + text.join('\n\n') + '\n````\n')
      await writeFile(join(dir, 'visible-text.md'), sections.join('\n'))
    } finally {
      await page.clock.resume()
    }
  }
}
