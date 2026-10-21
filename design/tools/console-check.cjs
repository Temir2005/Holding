/** Console warnings and errors of the running site per page (dev). */
const { chromium } = require('@playwright/test')
const BASE = process.env.BASE || 'http://localhost:5173'
;(async () => {
  const [size, ...paths] = process.argv.slice(2)
  const [w, h] = size.split('x').map(Number)
  const browser = await chromium.launch()
  for (const p of paths) {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    const msgs = new Map()
    page.on('console', (m) => { if (['warning', 'error'].includes(m.type())) { const k = m.type() + ': ' + m.text().slice(0, 140); msgs.set(k, (msgs.get(k) || 0) + 1) } })
    page.on('pageerror', (e) => msgs.set('pageerror: ' + e.message, 1))
    await page.goto(BASE + p, { waitUntil: 'networkidle' })
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)) } })
    await page.waitForTimeout(400)
    console.log(`${p}: ${msgs.size ? '' : 'clean'}`)
    for (const [k, n] of msgs) console.log(`   ${n}× ${k}`)
    await page.close()
  }
  await browser.close()
})()
