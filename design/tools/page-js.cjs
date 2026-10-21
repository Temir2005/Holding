/**
 * Which JS chunks a page of the production preview loads (cold, after scrolling through).
 *   node tools/page-js.cjs <w>x<h> '<path>' ...   → one line per page: chunk names
 */
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:4173'
;(async () => {
  const [size, ...paths] = process.argv.slice(2)
  const [w, h] = size.split('x').map(Number)
  const browser = await chromium.launch()
  for (const p of paths) {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    const js = new Set()
    page.on('request', (r) => { const m = r.url().match(/\/assets\/([^/]+\.js)$/); if (m) js.add(m[1]) })
    await page.goto(BASE + p, { waitUntil: 'networkidle' })
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)) } })
    await page.waitForTimeout(500)
    console.log(p + ' ' + [...js].join(' '))
    await page.close()
  }
  await browser.close()
})()
