/**
 * Screenshots of the running dev site (inside the frontend container network).
 *   node tools/site-shot.cjs <outDir> <width> <path> [<path>...]
 * Full page, motion on, after scrolling through so lazy images and reveals settle.
 */
const path = require('path')
const { chromium } = require('@playwright/test')
;(async () => {
  const [out, width, ...paths] = process.argv.slice(2)
  const browser = await chromium.launch()
  for (const p of paths) {
    const page = await browser.newPage({
      viewport: { width: +width, height: +width < 500 ? 812 : 900 },
      reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference',
    })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto('http://localhost:5173' + p, { waitUntil: 'networkidle' })
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 80)) }
      scrollTo({ top: 0, behavior: 'instant' })
    })
    await page.waitForTimeout(1500)
    const name = p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root'
    await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    console.log(`${p} @${width}: overflow=${overflow} errors=${errors.length ? errors.join(' | ').slice(0, 300) : 0}`)
    await page.close()
  }
  await browser.close()
})()
