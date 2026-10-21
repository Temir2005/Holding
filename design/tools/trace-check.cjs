/**
 * Is each section's red line drawn by its own scroll (the pen at 78% of the viewport)?
 * Scrolls to the middle of the page and compares, per section, the drawn share of the line
 * with the expected one from the section's position: clamp((0.78·vh − top) / height, 0, 1).
 */
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:5173'
;(async () => {
  const [size, p, at = '0.5'] = process.argv.slice(2)
  const [w, h] = size.split('x').map(Number)
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto(BASE + p, { waitUntil: 'networkidle' })
  const H = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < H * +at; y += 300) { await page.mouse.wheel(0, 300); await page.waitForTimeout(40) }
  await page.waitForTimeout(800)
  const rows = await page.evaluate(() => [...document.querySelectorAll('main section')].map((s, i) => {
    const r = s.getBoundingClientRect()
    const expect = Math.min(1, Math.max(0, (0.78 * innerHeight - r.top) / r.height))
    // the main path of the segment: the first path inside the segment's svg
    const path = s.querySelector(':scope > svg path, :scope svg[aria-hidden] path')
    let drawn = null
    if (path) {
      const da = path.getAttribute('stroke-dasharray') || getComputedStyle(path).strokeDasharray
      const m = String(da).match(/([\d.]+)/)
      drawn = m ? +m[1] : null
    }
    return { i, top: Math.round(r.top), h: Math.round(r.height), expect: +expect.toFixed(2), drawn: drawn === null ? null : +drawn.toFixed(2) }
  }))
  for (const r of rows) console.log(JSON.stringify(r))
  await browser.close()
})()
