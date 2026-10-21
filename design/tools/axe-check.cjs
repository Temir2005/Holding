/**
 * axe (WCAG 2.0/2.1/2.2 A+AA) on pages of the running site, after scrolling through so lazy
 * sections and reveals are in. One line per violation node.
 *   BASE=... node tools/axe-check.cjs <w>x<h> '<path>' ...
 */
const { chromium } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
const BASE = process.env.BASE || 'http://localhost:5173'
;(async () => {
  const [size, ...paths] = process.argv.slice(2)
  const [w, h] = size.split('x').map(Number)
  const browser = await chromium.launch()
  let total = 0
  for (const p of paths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await ctx.newPage()
    await page.goto(BASE + p, { waitUntil: 'networkidle' })
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 60)) }
      scrollTo({ top: 0, behavior: 'instant' })
    })
    await page.waitForTimeout(1200)
    const { violations, incomplete } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    const nodes = violations.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')} — ${(n.failureSummary || '').split('\n')[1] || ''}`.slice(0, 220)))
    total += nodes.length
    const contrastUnsure = incomplete.filter((v) => v.id === 'color-contrast').reduce((s, v) => s + v.nodes.length, 0)
    console.log(`${p} @${size}: violations=${nodes.length} (contrast needs review: ${contrastUnsure})`)
    for (const n of nodes.slice(0, 12)) console.log('   ' + n)
    await ctx.close()
  }
  console.log(`TOTAL violations: ${total}`)
  await browser.close()
})()
