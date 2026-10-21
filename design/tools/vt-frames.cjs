/**
 * Frames of the page change (view transition), slowed down 10× through CDP:
 *   node tools/vt-frames.cjs <outDir> <w>x<h> <fromPath> <linkSelector>
 */
const path = require('path')
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:5173'
;(async () => {
  const [out, size, from, selector] = process.argv.slice(2)
  const [w, h] = size.split('x').map(Number)
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto(BASE + from, { waitUntil: 'networkidle' })
  await page.evaluate(() => scrollTo({ top: innerHeight * 1.4, behavior: 'instant' }))
  await page.mouse.wheel(0, -120)
  await page.waitForTimeout(800)
  const link = page.locator(selector).first()
  await link.hover()
  await page.waitForTimeout(1200) // warmed up: data and chunks
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Animation.enable')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 })
  await link.click()
  for (const ms of [0, 600, 1500, 2600, 3600, 5000]) {
    await page.waitForTimeout(ms === 0 ? 30 : 0)
    const t0 = Date.now()
    await page.screenshot({ path: path.join(out, `vt-${w}-${String(ms).padStart(4, '0')}.png`) })
    const left = (ms === 5000 ? 0 : [600, 1500, 2600, 3600, 5000][[0, 600, 1500, 2600, 3600].indexOf(ms)] - ms) - (Date.now() - t0)
    if (left > 0) await page.waitForTimeout(left)
  }
  console.log('done', await page.evaluate(() => location.pathname))
  await browser.close()
})()
